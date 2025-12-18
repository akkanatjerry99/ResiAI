import { GoogleGenAI, Chat } from "@google/genai";
import { Patient, ClinicalAdmissionNote, ProblemEntry, Labs, CultureResult, Sensitivity, LabValue, ChronicDisease, ImagingStudy, MicroscopyResult, EKG, Task, TaskPriority, DailyRound, Medication, RawLabResult, Handoff, Acuity } from "../types";

const getApiKey = () => {
    // Use process.env.API_KEY for backend Node.js usage
    return process.env.API_KEY;
}
const cleanJsonText = (text: string): string => {
    if (!text) return "";
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        return cleaned.substring(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1 && lastBracket !== -1) {
        return cleaned.substring(firstBracket, lastBracket + 1);
    }
    
    return cleaned;
};

// --- Pre-Round Summary Generator ---
export const generatePreRoundSummary = async (patient: Patient): Promise<{ subjective: string, assessment: string, planList: string[] } | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    const creatinine = patient.labs?.creatinine ? patient.labs.creatinine.slice(-2) : [];
    const abx = patient.antibiotics ? patient.antibiotics.map(a => a.name).join(',') : 'None';

    const prompt = `
        Act as a medical resident in Thailand. Summarize patient data into draft SOAP components.
        Patient: ${patient.name}, ${patient.age}${patient.gender}. Dx: ${patient.diagnosis}.
        Recent Labs (Cr): ${JSON.stringify(creatinine)}.
        Current Antibiotics: ${abx}.
        
        **Language Style:** Medical Thailish (Thai mixed with English medical terms) is preferred for Subjective. English for Assessment/Plan is standard but Thai context is okay.
        
        Output JSON: { "subjective": "string (Thai/Eng)", "assessment": "string", "planList": ["string"] }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const text = response.text || "{}";
        return JSON.parse(cleanJsonText(text));
    } catch (e) { 
        console.error("Pre-round AI Error:", e);
        return null; 
    }
};

export const generateOneLiner = async (patient: Patient): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "";
    const ai = new GoogleGenAI({ apiKey });

    const context = `
        Patient: ${patient.name}, ${patient.age}${patient.gender}.
        Diagnosis: ${patient.diagnosis}.
        PMH: ${patient.underlyingConditions}.
        Current Status: ${patient.acuity}.
        Reason for Admission: ${patient.admissionNote?.chiefComplaint || 'N/A'}.
        Hospital Course Highlights: ${patient.timeline.slice(-3).map(e => e.title).join(', ')}.
    `;

    const prompt = `
        Act as a chief resident. Generate a concise, professional medical "one-liner" summary.
        Format: "[Age][Sex] w/ [Key PMH], admitted for [Diagnosis/Chief Complaint], currently [Status/Plan]."
        Keep it under 25 words. No fluff. Use standard medical abbreviations.
        
        Context: ${context}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] }
        });
        return response.text?.trim() || "";
    } catch (e) {
        console.error("One-Liner AI Error:", e);
        return "";
    }
};

export const getWarfarinDoseSuggestion = async (history: LabValue[], targetLow: number, targetHigh: number, currentWeeklyDose: number, medications: string[], indication: string, hasMajorBleeding: boolean = false): Promise<any> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    
    const context = `
        Patient Warfarin History (Latest First): ${JSON.stringify(history.slice(-5).reverse())}
        Target INR: ${targetLow} - ${targetHigh}
        Current Total Weekly Dose: ${currentWeeklyDose} mg
        Indication: ${indication}
        Interacting Meds: ${medications.join(', ')}
        Major Bleeding Present: ${hasMajorBleeding ? 'YES' : 'NO'}
    `;

    const prompt = `
        Act as a clinical pharmacist. Suggest Warfarin dosage adjustment based on the INR history.
        Guideline: Chest 2012 / AHA.
        
        Context:
        ${context}

        Output JSON Only: { "suggestion": "string", "tabletSuggestion": "string (e.g. 3mg on Mon/Wed, 2mg others)", "reasoning": "string", "nextLab": "string", "recommendedFollowUpDays": number, "interactions": ["string"] }
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [{ text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "{}")); 
    } catch (e) { 
        console.error("Warfarin AI Error", e);
        return null; 
    }
};

export const parseWarfarinSchedule = async (doseText: string): Promise<{ dose: number, days: string[] }[] | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
        Act as a clinical pharmacist. Parse this Warfarin dosing instruction into a structured weekly schedule.
        
        **Input Text**: "${doseText}"
        
        **Rules**:
        - Identify the dose amount (mg) and which days of the week it is taken.
        - Days should be abbreviated as: "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun".
        - If "Daily" or "OD", return one entry with all 7 days.
        - If "Alternating", infer the pattern starting from today (assume full coverage).
        - If multiple dosages (e.g. "3mg Mon/Wed/Fri, 2mg others"), return multiple entries.
        
        **Output JSON**:
        {
            "schedule": [
                { "dose": number, "days": ["Mon", "Wed", "Fri"] },
                { "dose": number, "days": ["Tue", "Thu", "Sat", "Sun"] }
            ]
        }
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(cleanJsonText(response.text || "{}"));
        return Array.isArray(res.schedule) ? res.schedule : null;
    } catch (e) { 
        console.error("Dose Parse Error", e);
        return null; 
    }
};

// Legacy support wrapper
export const calculateWarfarinWeeklyDose = async (doseText: string): Promise<number | null> => {
    const schedule = await parseWarfarinSchedule(doseText);
    if (!schedule) return null;
    return schedule.reduce((acc, item) => acc + (item.dose * item.days.length), 0);
};

export const analyzeDischargeMedications = async (
    activeMeds: Medication[], 
    homeMeds: Medication[], 
    allergies: string[]
): Promise<{ 
    changes: { medName: string; status: 'New' | 'Continued' | 'Stopped' | 'Modified'; note: string }[];
    allergyAlerts: { medName: string; alert: string }[];
} | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    const activeList = activeMeds.map(m => `${m.name} ${m.dose} ${m.frequency}`).join('; ');
    const homeList = homeMeds && homeMeds.length > 0 ? homeMeds.map(m => `${m.name} ${m.dose} ${m.frequency}`).join('; ') : "None known";
    const allergyList = allergies && allergies.length > 0 ? allergies.join(', ') : "No Known Drug Allergies";

    const prompt = `
        Act as a clinical pharmacist. Med Rec.
        Active: ${JSON.stringify(activeMeds)}
        Home: ${JSON.stringify(homeMeds)}
        Allergies: ${allergies.join(',')}
        Output JSON: { "changes": [], "allergyAlerts": [] }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonText(response.text || "{}"));
    } catch (e) {
        console.error("Med Analysis Error", e);
        return null;
    }
};

export const checkDrugInteractions = async (medications: string[]): Promise<{ pair: string, severity: 'High' | 'Moderate' | 'Low', description: string }[]> => {
    const apiKey = getApiKey();
    if (!apiKey || medications.length < 2) return [];
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        Act as a clinical pharmacist. Analyze the following list of medications for potential drug-drug interactions.
        Identify clinically significant interactions (High/Moderate) and notable Low risk ones.
        
        **Medications**: ${medications.join(', ')}

        **Output JSON**:
        {
            "interactions": [
                { 
                    "pair": "string (e.g. Warfarin + Aspirin)", 
                    "severity": "High" | "Moderate" | "Low", 
                    "description": "string (brief clinical consequence)" 
                }
            ]
        }
        
        If no significant interactions, return empty array.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(cleanJsonText(response.text || "{}"));
        return Array.isArray(res.interactions) ? res.interactions : [];
    } catch (e) {
        console.error("Interaction Check Error", e);
        return [];
    }
};

export const anonymizePatientContext = (context: string): string => {
    return context
        .replace(/HN:\s*[\d-]+/gi, "HN: [REDACTED]")
        .replace(/Name:\s*[A-Z][a-z]+ [A-Z][a-z]+/g, "Name: [PATIENT]");
};

export const generateDischargeCriteria = async (patient: Patient): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });

    const context = `
        Patient: ${patient.name}, ${patient.age}y/o ${patient.gender}.
        Diagnosis: ${patient.diagnosis}.
        One Liner: ${patient.oneLiner}.
        Meds: ${patient.medications.map(m => m.name).join(', ')}.
        Hospital Course Summary: ${patient.handoff.patientSummary}.
    `;

    const prompt = `
        Act as a senior physician. Generate a specific checklist of 3-5 clinical discharge criteria for this patient.
        Focus on vital stability, specific symptom resolution suitable for their diagnosis, and care capability.
        Return JSON Array of strings. Example: ["Systolic BP < 140", "Ambulating independently", "Tolerating soft diet"].
        
        Context: ${context}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(cleanJsonText(response.text || "[]"));
        return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
};

export const scanForMedicalAppointments = async (patient: Patient): Promise<{title: string, date: string, source: string}[]> => {
     const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });

    const notesText = `
        Handoff: ${patient.handoff.patientSummary}
        Tasks: ${patient.tasks.map(t => t.description).join(', ')}
        Consults: ${patient.consults.map(c => c.reason + ' ' + c.recommendations).join(', ')}
    `;

    const prompt = `
        Scan this medical text for mentions of specific future outpatient appointments, clinic visits, or procedures that might overlap with the current hospitalization (assume today is ${new Date().toISOString().split('T')[0]}).
        Look for phrases like "Eye clinic next Tuesday", "Follow up Nephro on 12/10".
        Return JSON Array: [{ "title": "string", "date": "YYYY-MM-DD" (approximate if needed, use future dates), "source": "string (context)" }]
        
        Text: ${notesText}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(cleanJsonText(response.text || "[]"));
        return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
};

export const checkAllergyCrossReactivity = async (medName: string, allergies: string[]): Promise<{conflict: boolean, riskLevel: 'High'|'Moderate'|'Low'|'None', reason: string}> => {
    const apiKey = getApiKey();
    if (!apiKey || allergies.length === 0 || !medName) return { conflict: false, riskLevel: 'None', reason: '' };
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        A patient has the following ALLERGIES: ${allergies.join(', ')}.
        The doctor is prescribing: ${medName}.
        
        Analyze for allergic cross-reactivity or direct conflict.
        Return JSON:
        {
            "conflict": boolean, // true if there is a risk
            "riskLevel": "High" | "Moderate" | "Low" | "None",
            "reason": "Short explanation (max 1 sentence) e.g. 'Cross-reactivity between Penicillins and Cephalosporins is approx 3-5%.'"
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonText(response.text || "{}"));
    } catch (e) { return { conflict: false, riskLevel: 'None', reason: '' }; }
};

export const extractMedicationsFromImage = async (base64Images: string[]): Promise<Medication[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const prompt = `
        Scan this medical document for a list of medications (Thai context: "รายการสั่ง", "Current Medications", "รายการนัดหมาย").
        Extract Drug Name, Dose, and Frequency.
        Translate Thai frequencies if found:
        - "เช้า" -> "Morning"
        - "เย็น" -> "Evening"
        - "ก่อนนอน" -> "HS"
        - "หลังอาหาร" -> "PC"
        - "วันละ" -> "Daily"
        
        Return JSON Array:
        [
            { "name": "string", "dose": "string", "frequency": "string", "route": "string (PO/IV/etc)" }
        ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [...imageParts, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(cleanJsonText(response.text || "[]"));
        return Array.isArray(res) ? res.map((m: any) => ({
            id: Date.now().toString() + Math.random(),
            name: m.name,
            dose: m.dose || '',
            frequency: m.frequency || '',
            route: m.route || 'PO',
            isActive: true,
            isHomeMed: true
        })) : [];
    } catch (e) { return []; }
};

export const extractTasksFromText = async (planText: string): Promise<{ description: string, priority: TaskPriority }[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        Analyze this medical plan text and extract actionable tasks.
        Support Thai/English medical jargon.
        
        **Plan Text**: "${planText}"

        **Language Rules**:
        - **Keep Thai text EXACTLY as is**: Do not translate actionable items. (e.g., "เจาะเลือด", "ตาม Lab").
        - **Mixed Language**: Preserve mixed Thai/English sentences exactly.

        **Output JSON**:
        [
            { "description": "string", "priority": "Normal" | "Urgent" | "Before Noon" | "Before Discharge" }
        ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonText(response.text || "[]"));
    } catch (e) { return []; }
};

export const generateRoundSummary = async (soap: { s: string, o: string, a: string, p: string }): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "";
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
        Act as a senior resident. Summarize this daily medical round into a concise 1-2 sentence clinical update.
        
        **Input**:
        S: ${soap.s}
        O: ${soap.o}
        A: ${soap.a}
        P: ${soap.p}
        
        **Rule**: Keep it professional. Use standard medical abbreviations. Allow Thai/English mix.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] }
        });
        return response.text?.trim() || "";
    } catch (e) { return ""; }
};

export const extractVitalsFromImage = async (base64Images: string[]): Promise<{ text: string, success: boolean } | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    const imageParts = base64Images.map(img => ({
        inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") }
    }));

    const prompt = `
        Analyze this Vitals Flowsheet image.
        Extract ranges for: Tmax, BP, HR, RR, O2.
        Return "UNREADABLE" if blurry.
        Otherwise return concise string.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [...imageParts, { text: prompt }] }
        });
        const text = response.text?.trim() || "";
        if (text.includes("UNREADABLE")) return { text: "", success: false };
        return { text, success: true };
    } catch (e) { return null; }
};

export const extractLabsStructured = async (base64Images: string[]): Promise<RawLabResult[] | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });

    const imageParts = base64Images.map(img => ({
        inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") }
    }));

    const prompt = `
        Act as a highly accurate medical lab data extractor for a Thai hospital.
        1.  Extract all lab results from the provided image.
        2.  **Date/Time is CRITICAL**: 
            - The current year is ${new Date().getFullYear()}.
            - Recognize dates in Thai Buddhist Era (BE) format (e.g., 2567, 2568) and convert them to Gregorian format by subtracting 543.
            - Output all dateTimes in "YYYY-MM-DD HH:mm" format. If time is absent, use "00:00".
        3.  Pay close attention to handwritten values or corrections.
        4.  Categorize results (e.g., 'CBC', 'Chemistry', 'Urinalysis', 'Coagulation', 'Microbiology'). If unsure, use 'Other'.

        Output a clean JSON Array: 
        [{ "testName": "Creatinine", "value": 1.2, "unit": "mg/dL", "flag": "H", "dateTime": "2024-07-28 14:30", "category": "Chemistry" }]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash-latest", // Using the faster Flash model
            contents: { parts: [...imageParts, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonText(response.text || "[]"));
    } catch (e) { 
        console.error("Error extracting structured labs:", e);
        return null; 
    }
};

export const generateHandoffSynthesis = async (patient: Patient): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key missing.";
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Generate handoff synthesis for ${patient.name}. JSON: { "synthesis": "string", "contingencies": "string" }`;
  try { 
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json" } }); 
      return response.text || "{}"; 
  } catch (error) { return JSON.stringify({ synthesis: "Error", contingencies: "Monitor." }); }
};

export const generateLabInterpretation = async (patient: Patient): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "API Key missing.";
  const ai = new GoogleGenAI({ apiKey });

  const getMostRecent = (values: LabValue[] | undefined) => {
    if (!values || values.length === 0) return 'N/A';
    const sorted = [...values].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0].value;
  };

  const recentLabs = {
    Cr: getMostRecent(patient.labs.creatinine),
    WBC: getMostRecent(patient.labs.wbc),
    Hgb: getMostRecent(patient.labs.hgb),
    K: getMostRecent(patient.labs.k),
    Na: getMostRecent(patient.labs.sodium),
    INR: getMostRecent(patient.labs.inr),
  };

  const prompt = `
        Act as a senior medical resident. Provide a concise interpretation of the following lab results for patient ${patient.name} (${patient.age} y/o ${patient.gender}) with a diagnosis of ${patient.diagnosis}.
        
        **Recent Labs:**
        - Creatinine: ${recentLabs.Cr}
        - WBC: ${recentLabs.WBC}
        - Hemoglobin: ${recentLabs.Hgb}
        - Potassium: ${recentLabs.K}
        - Sodium: ${recentLabs.Na}
        - INR: ${recentLabs.INR}

        **Patient Context:**
        - One-liner: ${patient.oneLiner}
        - Active Problems: ${patient.admissionNote?.problemList?.filter(p => p.status === 'Active').map(p => p.problem).join(', ') || 'None'}

        **Task:**
        1.  **Headline**: Start with a one-sentence summary of the most critical finding (e.g., "Acute kidney injury with hyperkalemia.").
        2.  **Bulleted List**: Provide a bulleted list detailing each significant abnormality and its likely clinical significance in the context of this patient.
        3.  **Differential/Plan**: Briefly suggest a differential diagnosis or next steps if appropriate (e.g., "Consider repeating K in 4 hours," "Suggests need for diuretic adjustment.").
        
        Keep the entire interpretation concise and clinically focused.
    `;

  try { 
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }] } }); 
    return response.text || "Error generating interpretation."; 
  } catch (error) { 
    console.error("Lab Interpretation Error:", error);
    return "An error occurred while analyzing the labs. Please check the console for details."; 
  }
};

export const generateABGInterpretation = async (abgData: Record<string, string>): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "API Key missing.";
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze ABG: ${JSON.stringify(abgData)}. Concise diagnosis.`;
    try { const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt }); return response.text || "Error."; } catch (error) { return "Error."; }
};

export const extractImagingReport = async (base64Images: string[]): Promise<any | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const prompt = `
        Extract Radiology Report.
        JSON: { modality, bodyPart, date (YYYY-MM-DD), time (HH:MM), impression, findings }
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [...imageParts, { text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (error) { return null; }
};

export const interpretRadiologyImage = async (mediaData: string[], comparisonContext?: string): Promise<any | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    
    const parts = mediaData.map(dataUrl => {
        const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
        return { inlineData: { mimeType: "image/jpeg", data: dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } };
    });
    
    const promptText = `
        Act as a radiologist. Analyze image.
        Return JSON: { "modality": "string", "bodyPart": "string", "date": "YYYY-MM-DD", "time": "HH:MM", "impression": "string", "findings": "string" }
        ${comparisonContext ? `Comparison: ${comparisonContext}` : ''}
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [...parts, { text: promptText }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (error) { return null; }
};

export const detectMedicalAbnormalities = async (base64Image: string): Promise<{ label: string, box_2d: number[], confidence: number }[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });
    
    const parts = [{
        inlineData: { mimeType: "image/jpeg", data: base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") }
    }];

    const prompt = `
        Detect medical abnormalities.
        JSON Array: [{ "label": "string", "box_2d": [ymin, xmin, ymax, xmax], "confidence": number }]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [...parts, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const result = JSON.parse(cleanJsonText(response.text || "[]"));
        return Array.isArray(result) ? result : [];
    } catch (e) { return []; }
};

export const parseLabResultsFromImage = async (base64Images: string[], patientNameContext: string): Promise<{ results: RawLabResult[], missingInfo: string, pbsText?: string } | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const modelName = "gemini-1.5-flash-latest";

    const prompt = `
      **TASK: HIGH-PRECISION OCR FOR THAI MEDICAL LAB RESULTS**

      **Primary Goal**: Accurately extract all lab values from the image, paying special attention to columnar data with multiple dates.

      **CRITICAL INSTRUCTIONS:**
      1.  **Patient Context**: The results are for a patient named "${patientNameContext}". Use this for context if the name is ambiguous on the lab sheet.
      2.  **Date/Time Priority**:
          - The current year is ${new Date().getFullYear()}.
          - **Buddhist Era (BE) Conversion is MANDATORY**. Recognize dates like '2567', '2568' and convert to Gregorian by subtracting 543.
          - All extracted 'dateTime' values MUST be in "YYYY-MM-DD HH:mm" format. If time is missing, use the time from a nearby column or default to "00:00".
      3.  **Columnar Data Handling**:
          - The lab report may have multiple columns, each with a different date/time in the header.
          - For each row (e.g., 'Hct', 'WBC'), you MUST extract a separate result for EACH date column.
          - Example: If there are columns for '14/6/67' and '15/6/67', a single 'Hct' row will produce TWO entries in the JSON array, one for each date.
      4.  **Peripheral Blood Smear (PBS)**:
          - Look for a section labeled "PBS", "Peripheral Blood Smear", or similar.
          - Extract the entire text content of this section into the 'pbsText' field.
      5.  **Flags**: Identify flags like 'H', 'L', '!', '*' next to values and place them in the 'flag' field.

      **Output clean JSON only**:
      { 
          "results": [
              { 
                  "testName": "string", 
                  "value": "string or number", 
                  "unit": "string", 
                  "flag": "H" | "L" | "null", 
                  "dateTime": "YYYY-MM-DD HH:mm", 
                  "category": "string" // e.g., 'CBC', 'Chemistry', 'Urinalysis'
              }
          ],
          "pbsText": "string" // Verbatim text from the PBS report section.
      }
    `;

    try { 
        const response = await ai.models.generateContent({ model: modelName, contents: { parts: [...imageParts, { text: prompt }] }, config: { responseMimeType: "application/json" } }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (error) { 
        console.error("Lab Scan Error:", error);
        return null; 
    }
};

export const extractAdmissionNoteFromImage = async (base64Images: string[]): Promise<ClinicalAdmissionNote | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const modelName = "gemini-1.5-flash-latest"; 

    const prompt = `
        **TASK: HIGH-PRECISION MEDICAL OCR AND DATA EXTRACTION FOR THAI HOSPITAL**
        
        **Primary Goal**: Extract information from an admission note image with extreme accuracy.

        **CRITICAL INSTRUCTIONS:**
        1.  **Date/Time Priority**:
            - The current year is ${new Date().getFullYear()}.
            - **Buddhist Era (BE) Conversion is MANDATORY**. Recognize dates like '2567', '2568' and convert to Gregorian by subtracting 543.
            - All extracted dates (e.g., 'scannedAt', lab 'dateTime') MUST be in "YYYY-MM-DD HH:mm" format. Use "00:00" if time is missing.
        2.  **Verbatim Extraction**: Do NOT translate, summarize, or interpret. Copy text exactly as it appears, including mixed Thai-English terms, abbreviations, and symbols.

        **JSON MAPPING RULES:**
        
        1.  **patientDemographics**: Find Name (e.g., "นาย..."), HN ("HN: ..."), Age, and Gender.
        2.  **chiefComplaint (CC)**: Usually the first line of the medical history (e.g., "Presented with...", "CC:").
        3.  **presentIllness (PI)**: The main narrative block, often starting with a timeframe (e.g., "1 สัปดาห์ก่อน", "2 days ago"). Copy this entire section verbatim.
        4.  **pastHistory (PH)**: Look for "Underlying", "UD:", "denied previous underlying".
        5.  **physicalExam (PE)**: Extract sections like V/S, GA, HEENT, CVS, RS, Abd, Ext, Neuro.
        6.  **investigations**: Extract Lab results, CXR, EKG text.
        7.  **impression** / **managementPlan**: Look for "Imp:", "Dx:", "Mx:", "Plan:".
        8.  **extractedLabs**: If labs are present in the note, extract them into the specified array format.

        **Output clean JSON only**:
        {
            "noteType": "Admission Note",
            "patientDemographics": { "name": "string", "hn": "string", "age": number, "gender": "M"|"F" },
            "chiefComplaint": "string",
            "presentIllness": "string",
            "pastHistory": "string",
            "physicalExam": "string",
            "investigations": "string",
            "impression": "string",
            "managementPlan": "string",
            "problemList": [{ "problem": "string", "status": "Active" | "Stable" | "Resolved", "plan": "string" }],
            "extractedLabs": [{ "testName": "string", "value": "string or number", "unit": "string", "dateTime": "YYYY-MM-DD HH:mm" }],
            "scannedAt": "${new Date().toISOString()}"
        }
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: modelName, 
            contents: { parts: [...imageParts, { text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (error) { 
        console.error("Admission Note Scan Error", error);
        return null; 
    }
};

export const extractPatientDataFromImage = async (base64Images: string[]): Promise<Partial<Patient> | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const prompt = `
        Extract patient demographics exactly as they appear on the sticker/card.
        **VERBATIM ONLY**. No translation.
        - Name: Include titles (นาย, นาง, etc.) if present.
        - Diagnosis: Copy exactly.
        
        JSON: { "name": string, "hn": string, "age": number, "gender": "M"|"F", "diagnosis": string, "underlyingConditions": string, "oneLiner": string }
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [...imageParts, { text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (error) { return null; }
};

export const extractProblemListFromImage = async (base64Images: string[]): Promise<ProblemEntry[] | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const prompt = `
        Extract Problem List.
        **VERBATIM ONLY**. Keep Thai text exactly as written.
        JSON Array: [{ "problem": string, "status": "Active"|"Stable"|"Resolved", "plan": string }]
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [...imageParts, { text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "[]")); 
    } catch (e) { return null; }
};

export const getRenalDoseSuggestion = async (drugName: string, crCl: number, currentDose: string): Promise<any> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Renal dose. JSON: { adjustment, reasoning }`;
    try { 
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json" } }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (e) { return null; }
};

export const startChatSession = (systemPrompt: string): Chat => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    return ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction: systemPrompt } });
};

export const extractChronicDiseaseInfo = async (historyText: string): Promise<ChronicDisease[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
        Extract chronic diseases. Support Thai.
        JSON Array: [{ "type": "string", "diagnosisDate": "string", "lastValues": {}, "complications": "string" }]
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [{ text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "[]")); 
    } catch (e) { return []; }
};

export const extractEchoReport = async (base64Images: string[]): Promise<{ lvef?: string, valves?: string, wallMotion?: string, date?: string } | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    try { 
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: { parts: [...imageParts, { text: "Extract Echo. JSON: { lvef, valves, wallMotion, date }" }] }, config: { responseMimeType: "application/json" } }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (e) { return null; }
};

export const extractPBSReport = async (base64Images: string[]): Promise<MicroscopyResult | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    try { 
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: { parts: [...imageParts, { text: "Extract PBS. JSON: { rbcMorphology, wbcMorphology, plateletMorphology, parasites, others }" }] }, config: { responseMimeType: "application/json" } }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (e) { return null; }
};

export const extractMicrobiologyFromImage = async (base64Images: string[]): Promise<CultureResult[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const prompt = `
        Analyze microbiology report.
        JSON Array: [{ "specimen": "string", "collectionDate": "YYYY-MM-DD", "status": "Pending|Final", "organism": "string", "sensitivity": [] }]
    `;
    
    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [...imageParts, { text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        const parsed = JSON.parse(cleanJsonText(response.text || "[]"));
        return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    } catch (e) { return []; }
};

export const interpretEKG = async (base64Images: string[], previousContext?: string): Promise<EKG | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const prompt = `
        Analyze EKG.
        JSON: { "hn", "date", "time", "rate", "rhythm", "axis", "intervals": {pr,qrs,qtc}, "findings", "impression", "comparison" }
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [...imageParts, { text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (e) { return null; }
};

export const extractAppointmentFromImage = async (base64Images: string[]): Promise<{ appointments: { title: string, date: string, time: string, location: string, type: string, notes?: string }[] } | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") } }));
    
    const prompt = `
        Analyze this hospital appointment screen (Thai EMR Context).
        
        **VISUAL LAYOUT**: 
        - **Left Panel ("รายการนัดหมาย")**: A table/list of appointments. 
          - **ACTION**: Scan this list specifically for DATES (usually 1st or 2nd column).
          - **IGNORE**: Detailed text in this list if it's messy. Just get the date.
          - **FILTER**: strictly filter out past dates. Convert BE (e.g., 2568) to AD (2025). Formula: AD = BE - 543.
          - **EXCLUDE**: Any row marked "Old" (เก่า) or dates before today (${new Date().toISOString().split('T')[0]}).
        
        - **Right Panel / Dialog ("ท่านัดผู้ป่วย")**: 
          - This shows the *active selection* with full details.
          - Extract: Date, Time, Clinic, Doctor from here if visible.

        **OUTPUT**:
        Return a single JSON object with an array "appointments".
        - For the active right panel item: Include full details (title = Clinic + Doctor).
        - For left panel items: Create entries with just the Date and a generic title "Follow-up" if details are missing.
        
        **Output JSON**:
        {
          "appointments": [
            { 
              "title": "string", 
              "date": "YYYY-MM-DD", 
              "time": "HH:mm", 
              "location": "string", 
              "type": "Meeting", 
              "notes": "string" 
            }
          ]
        }
    `;

    try { 
        const response = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: { parts: [...imageParts, { text: prompt }] }, 
            config: { responseMimeType: "application/json" } 
        }); 
        return JSON.parse(cleanJsonText(response.text || "null")); 
    } catch (error) { return null; }
};

export const generateDischargeSummary = async (patient: Patient, activeMeds: Medication[]): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "";
    const ai = new GoogleGenAI({ apiKey });

    const medsList = activeMeds.map(m => `${m.name} ${m.dose} ${m.frequency}`).join(', ');
    
    const context = `
        Patient: ${patient.name}, ${patient.age}y/o ${patient.gender}.
        Diagnosis: ${patient.diagnosis}.
        One Liner: ${patient.oneLiner}.
        Hospital Course Summary from Handoff: ${patient.handoff.patientSummary}.
        Discharge Medications: ${medsList}.
        Admission Date: ${patient.admissionDate}.
        Current Date: ${new Date().toISOString().split('T')[0]}.
    `;

    const prompt = `
        Act as a senior internal medicine resident. Write a comprehensive Hospital Discharge Summary for this patient.
        
        **Structure**:
        1. **Principal Diagnosis**: ${patient.diagnosis}
        2. **Hospital Course**: Synthesize a narrative summary of their stay based on the one-liner and handoff summary.
        3. **Procedures**: List likely procedures based on context (e.g. if labs show cardiac enzymes, mention rule out ACS protocol; if surgical history mentioned in current stay, include it).
        4. **Discharge Condition**: Stable.
        5. **Discharge Medications**: List them clearly.
        6. **Follow-up Plan**: General advice based on diagnosis (e.g. "Follow up with PCP in 1 week").

        **Style**: Professional, medical terminology, concise.
        
        Context: ${context}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] }
        });
        return response.text?.trim() || "";
    } catch (e) {
        console.error("Discharge Summary AI Error:", e);
        return "";
    }
};

export const parseBulkHandoffText = async (text: string): Promise<{
    roomNumber: string;
    name: string;
    update: Partial<Handoff>;
    acuity?: Acuity;
}[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        Act as a chief resident. Parse this unstructured handover text (mixed Thai/English) into structured I-PASS updates for each patient.
        
        **Input Text**:
        ${text}

        **Instructions**:
        1. Identify each patient block. Usually starts with a Room Number (e.g., "501") or Name.
        2. Extract key components for the Handoff/I-PASS structure:
           - **Illness Severity**: Acuity (Stable/Watch/Unstable). Infer from clinical context (e.g., "Tx as stroke", "ADHF", "Septic" = Watch/Unstable. "No active issues" = Stable).
           - **Patient Summary**: The main one-liner, diagnosis, and active problems.
           - **Action List**: Specific to-dos (e.g., "Keep I/O negative", "Follow UC").
           - **Situation Awareness**: Things to watch out for (e.g., "If dyspnea, call").
           - **Contingencies**: "If X happens, do Y".
        3. Handle Thai abbreviations:
           - "ครบ 3 วัน" = Complete 3 days
           - "ไม่ฝาก" = No active handoff / Nothing to watch (Stable)
           - "บ่าย" = Afternoon
           - "เช้านี้" = This morning
        
        **Output JSON**:
        [
            {
                "roomNumber": "string (digits only)",
                "name": "string",
                "update": {
                    "illnessSeverity": "Stable" | "Watch" | "Unstable",
                    "patientSummary": "string",
                    "actionList": "string",
                    "situationAwareness": "string",
                    "contingencies": "string"
                },
                "acuity": "Stable" | "Watch" | "Unstable"
            }
        ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        const res = JSON.parse(cleanJsonText(response.text || "[]"));
        return Array.isArray(res) ? res : [];
    } catch (e) { 
        console.error("Bulk Handoff Parse Error", e);
        return []; 
    }
};

export const compressImage = (file: File, maxWidth = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } else {
                    resolve(event.target?.result as string);
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
