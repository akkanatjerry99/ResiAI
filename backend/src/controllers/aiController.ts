// All AI interpret and scan features removed
import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const getApiKey = () => {
    // On the backend, we use process.env
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
    // Accepts: { patient, labTimeline }
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
    const imageParts = base64Images.map((img: string) => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));

    const prompt = `
**TASK: EXTRACT EVERY DATE/TIME COLUMN AND EVERY VALUE FROM LAB TABLES (NO SKIPPING, NO MERGING, NO OMISSION!)**

**Primary Goal**: For every test row and every date/time column, extract a result—even if the value is missing, unclear, or the cell is empty (use null or empty string for missing cells). Do NOT skip, merge, or omit any test or date/time column, even if the value is missing, unclear, or repeated. Output a FULL GRID: every possible test x every possible date/time cell.

**Instructions:**
1. Identify and extract ALL date/time columns in the table header (e.g., 25/11/68 16:52, 25/11/68 15:25, etc). If a date/time is present anywhere in the table, it must be included in the output, even if there is no value for some tests.
2. For each test row (e.g., WBC, Hb, Platelet), extract a separate result for EVERY date column. If a value is missing, set value to null and flag to null. If a test or date appears more than once, include all instances.
3. Return a flat array: one object per cell, with testName, value, unit, dateTime, flag, and category. Do NOT merge or skip any cell.
4. Include all column headers (dates/times) and all row labels (test names), even if some values are missing or unclear.
5. Buddhist Era (BE) Conversion is MANDATORY. Recognize dates like '2567', '2568' and convert to Gregorian by subtracting 543. All dateTime values MUST be in "YYYY-MM-DD HH:mm" format. If time is missing, use "00:00".
6. For PBS, extract the entire text content into the 'pbsText' field.
7. Output only clean JSON as below. Do NOT include any extra text, explanation, or markdown—just the JSON.

{
    "results": [
        {
            "testName": "string",
            "value": "string or number or null",
            "unit": "string",
            "flag": "H" | "L" | null,
            "dateTime": "YYYY-MM-DD HH:mm",
            "category": "string" // e.g., 'CBC', 'Chemistry', 'Urinalysis'
        }
    ],
    "pbsText": "string" // Verbatim text from the PBS report section.
}
`;

    const modelsToTry = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest"];
    let lastRawText = "";
    let bestResult = null;
    for (const modelName of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts: [...imageParts, { text: prompt }] },
                config: { responseMimeType: "application/json" }
            });
            lastRawText = response.text || "";
            let parsedResult;
            try {
                parsedResult = JSON.parse(cleanJsonText(lastRawText || "null"));
            } catch (parseErr) {
                parsedResult = null;
            }
            // Robust post-processing: ensure every test/date cell is present and convert BE dates
            if (parsedResult && Array.isArray(parsedResult.results)) {
                // Helper: Convert BE (Buddhist Era) to Gregorian
                function convertBEDate(dateTime: string): string {
                    if (!dateTime) return dateTime;
                    // Match DD/MM/YY[YY] [HH:mm] or similar
                    const match = dateTime.match(/(\d{2})\/(\d{2})\/(\d{2,4})(?:[\sT]+(\d{1,2}:\d{2}))?/);
                    if (!match) return dateTime;
                    let [_, day, month, year, time] = match;
                    let y = parseInt(year, 10);
                    if (y > 2400) y -= 543; // BE to Gregorian
                    else if (y > 100) y += 1900; // 2-digit year fallback
                    else if (y < 100) y += 2000; // 2-digit year fallback
                    const pad = (n: any) => n.toString().padStart(2, '0');
                    return `${y}-${pad(month)}-${pad(day)} ${time || '00:00'}`;
                }
                // Collect all testNames and dateTimes (after conversion)
                const testNames = new Set(parsedResult.results.map((r: any) => r.testName));
                const dateTimesRaw = parsedResult.results.map((r: any) => r.dateTime);
                const dateTimes = new Set(dateTimesRaw.map(convertBEDate));
                const filledResults = [];
                for (const testName of testNames) {
                    for (const dateTimeRaw of dateTimesRaw) {
                        const dateTime = convertBEDate(dateTimeRaw);
                        const found = parsedResult.results.find((r: any) => r.testName === testName && convertBEDate(r.dateTime) === dateTime);
                        if (found) {
                            filledResults.push({ ...found, dateTime });
                        } else {
                            filledResults.push({ testName, value: null, unit: '', flag: null, dateTime, category: '' });
                        }
                    }
                }
                parsedResult.results = filledResults;
                bestResult = parsedResult;
                break;
            }
        } catch (error) {
            // Try next model
        }
    }
    // Always return raw output for debugging
    if (bestResult) {
        return res.json({ ...bestResult, debugRaw: lastRawText });
    } else {
        res.json({ results: [], debugRaw: lastRawText });
    }
};
