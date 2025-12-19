import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const getApiKey = () => {
    return process.env.API_KEY || '';
};

const cleanJsonText = (text: string): string => {
    if (!text) return "";
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        return cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned;
};

export const interpretLabs = async (req: Request, res: Response) => {
    const { patient, labTimeline } = req.body;

    if (!patient || !Array.isArray(labTimeline) || labTimeline.length === 0) {
        return res.status(400).json({ message: 'Patient and labTimeline are required.' });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        return res.status(500).json({ message: 'API Key is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Act as a senior medical resident. Analyze the following timeline of lab results for patient ${patient.name} (${patient.age} y/o ${patient.gender}) with a diagnosis of ${patient.diagnosis}.

**Lab Timeline (JSON):**
${JSON.stringify(labTimeline, null, 2)}

**Patient Context:**
- One-liner: ${patient.oneLiner}
- Active Problems: ${patient.admissionNote?.problemList?.filter((p: any) => p.status === 'Active').map((p: any) => p.problem).join(', ') || 'None'}

**Task:**
1. **Trend Analysis:** For each lab parameter (e.g., WBC, Hb, Platelet), describe the trend over time (rising, falling, stable, fluctuating) and highlight any abnormal values or rapid changes.
2. **Date-wise Summary:** For each date, summarize the most clinically significant findings.
3. **Overall Impression:** Provide a concise clinical impression of the lab trends and their likely significance in the context of this patient.
4. **Plan/Next Steps:** Suggest any further investigations or management based on the trends (e.g., "Repeat CBC in 2 days", "Monitor for infection", etc).

Use clear, structured markdown. Use tables or bullet points if helpful. Be concise but thorough.
`;

    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] } });
        const interpretation = response.text || "Error generating interpretation.";
        res.json({ interpretation });
    } catch (error) {
        console.error("Lab Interpretation Error on backend:", error);
        res.status(500).json({ message: "An error occurred while analyzing the labs." });
    }
};

export const scanLabs = async (req: Request, res: Response) => {
    const { base64Images, patientNameContext } = req.body;

    if (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
        return res.status(400).json({ message: 'An array of base64 encoded images is required.' });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        return res.status(500).json({ message: 'API Key is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    function convertBEDate(dateTime: string): string {
        if (!dateTime) return dateTime;
        const match = dateTime.match(/(\d{2})\/(\d{2})\/(\d{2,4})(?:[\sT]+(\d{1,2}:\d{2}))?/);
        if (!match) return dateTime;
        let [_, day, month, year, time] = match;
        let y = parseInt(year, 10);
        if (y > 2400) y -= 543;
        else if (y > 100) y += 1900;
        else if (y < 100) y += 2000;
        const pad = (n: any) => n.toString().padStart(2, '0');
        return `${y}-${pad(month)}-${pad(day)} ${time || '00:00'}`;
    }

    try {
        const imageParts = base64Images.map((img: string) => ({
            inlineData: {
                mimeType: "image/jpeg",
                data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
            }
        }));

        let extractedText = "";
        const ocrPrompt = `Extract ALL text from this lab sheet image verbatim. Include all table headers, test names, values, units, flags, dates, times, and PBS findings. Return only the extracted text - do not interpret or reformat.`;

        try {
            const ocrResponse = await ai.models.generateContent({
                model: "gemini-1.5-flash-latest",
                contents: { parts: [...imageParts, { text: ocrPrompt }] }
            });
            extractedText = ocrResponse.text || "";
        } catch (ocrError) {
            console.error("OCR extraction error:", ocrError);
        }

        const parsePrompt = `You are a medical lab data parser. Parse this lab sheet text into structured results.

Extracted Text:
${extractedText}

Rules:
1. Extract test name, value, unit, flag (H/L/Normal)
2. Identify all dates and times
3. Convert Buddhist Era dates (2567+) by subtracting 543
4. All dates in "YYYY-MM-DD HH:mm" format
5. Extract PBS findings if present
6. For each test-date combination, create one result

Return only valid JSON:
{
    "results": [
        {
            "testName": "string",
            "value": "string or number or null",
            "unit": "string",
            "flag": "H" | "L" | null,
            "dateTime": "YYYY-MM-DD HH:mm",
            "category": "string"
        }
    ],
    "pbsText": "string or null"
}`;

        let parsedResult = null;
        let lastRawText = "";

        const modelsToTry = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest"];
        for (const modelName of modelsToTry) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: { parts: [{ text: parsePrompt }] },
                    config: { responseMimeType: "application/json" }
                });
                lastRawText = response.text || "";
                parsedResult = JSON.parse(cleanJsonText(lastRawText || "null"));

                if (parsedResult && Array.isArray(parsedResult.results) && parsedResult.results.length > 0) {
                    break;
                }
            } catch (error) {
                console.error(`Error with model ${modelName}:`, error);
            }
        }

        if (parsedResult && Array.isArray(parsedResult.results)) {
            const results = parsedResult.results.map((r: any) => ({
                ...r,
                dateTime: convertBEDate(r.dateTime || "")
            }));

            const testNames = new Set(results.map((r: any) => r.testName));
            const dateTimesRaw = results.map((r: any) => r.dateTime);
            const filledResults = [];

            for (const testName of testNames) {
                for (const dateTimeRaw of dateTimesRaw) {
                    const found = results.find((r: any) =>
                        r.testName === testName && r.dateTime === dateTimeRaw
                    );
                    if (found) {
                        filledResults.push(found);
                    } else {
                        filledResults.push({
                            testName,
                            value: null,
                            unit: '',
                            flag: null,
                            dateTime: dateTimeRaw,
                            category: ''
                        });
                    }
                }
            }

            return res.json({
                results: filledResults,
                pbsText: parsedResult.pbsText || null
            });
        }

        res.json({ results: [] });
    } catch (error) {
        console.error("Lab scan error:", error);
        res.status(500).json({ message: "Error scanning labs. Please try again." });
    }
};
