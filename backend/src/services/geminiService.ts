import { GoogleGenAI } from '@google/genai';
import config from '../config';
import { anonymizePatientData } from '../utils/encryption';

/**
 * Service for interacting with Google Gemini AI
 */
export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (config.gemini.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    }
  }

  /**
   * Clean JSON response from Gemini
   */
  private cleanJsonText(text: string): string {
    if (!text) return '{}';
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
  }

  /**
   * Generate pre-round summary for a patient
   */
  async generatePreRoundSummary(patientData: any): Promise<{ subjective: string; assessment: string; planList: string[] } | null> {
    if (!this.ai) return null;

    const anonymized = anonymizePatientData(patientData);
    const creatinine = anonymized.labs?.creatinine ? anonymized.labs.creatinine.slice(-2) : [];
    const abx = anonymized.antibiotics ? anonymized.antibiotics.map((a: any) => a.name).join(',') : 'None';

    const prompt = `
      Act as a medical resident in Thailand. Summarize patient data into draft SOAP components.
      Patient: ${anonymized.age}${anonymized.gender}. Dx: ${anonymized.diagnosis}.
      Recent Labs (Cr): ${JSON.stringify(creatinine)}.
      Current Antibiotics: ${abx}.
      
      **Language Style:** Medical Thailish (Thai mixed with English medical terms) is preferred for Subjective. English for Assessment/Plan is standard but Thai context is okay.
      
      Output JSON: { "subjective": "string (Thai/Eng)", "assessment": "string", "planList": ["string"] }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text || '{}';
      return JSON.parse(this.cleanJsonText(text));
    } catch (error) {
      console.error('Gemini AI Error:', error);
      return null;
    }
  }

  /**
   * Generate one-liner summary for a patient
   */
  async generateOneLiner(patientData: any): Promise<string> {
    if (!this.ai) return '';

    const anonymized = anonymizePatientData(patientData);
    const context = `
      Patient: ${anonymized.age}${anonymized.gender}.
      Diagnosis: ${anonymized.diagnosis}.
      PMH: ${anonymized.underlyingConditions || 'None'}.
      Current Status: ${anonymized.acuity}.
      Admission Note: ${anonymized.admissionNote?.chiefComplaint || 'N/A'}.
    `;

    const prompt = `
      Act as a chief resident. Generate a concise, professional medical "one-liner" summary.
      Format: "[Age][Sex] w/ [Key PMH], admitted for [Diagnosis/Chief Complaint], currently [Status/Plan]."
      Keep it under 25 words. No fluff. Use standard medical abbreviations.
      
      Context: ${context}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
      });
      return response.text?.trim() || '';
    } catch (error) {
      console.error('Gemini AI Error:', error);
      return '';
    }
  }

  /**
   * Generate drug interaction analysis
   */
  async analyzeDrugInteractions(medications: any[]): Promise<any> {
    if (!this.ai) return null;

    const medList = medications.map((m) => `${m.name} ${m.dose} ${m.route} ${m.frequency}`).join(', ');

    const prompt = `
      Act as a clinical pharmacist. Analyze potential drug-drug interactions for the following medications:
      ${medList}
      
      Output JSON with format:
      {
        "interactions": [
          {
            "severity": "Major|Moderate|Minor",
            "drugs": ["drug1", "drug2"],
            "description": "string",
            "recommendation": "string"
          }
        ],
        "summary": "string"
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text || '{}';
      return JSON.parse(this.cleanJsonText(text));
    } catch (error) {
      console.error('Gemini AI Error:', error);
      return null;
    }
  }

  /**
   * Interpret lab results
   */
  async interpretLabResults(labData: any): Promise<string> {
    if (!this.ai) return '';

    const prompt = `
      Act as a clinical pathologist. Interpret the following lab results and provide clinical significance:
      ${JSON.stringify(labData, null, 2)}
      
      Provide a concise interpretation focusing on abnormal values and clinical implications.
      Format as plain text, maximum 200 words.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
      });
      return response.text?.trim() || '';
    } catch (error) {
      console.error('Gemini AI Error:', error);
      return '';
    }
  }

  /**
   * Generate discharge summary
   */
  async generateDischargeSummary(patientData: any): Promise<any> {
    if (!this.ai) return null;

    const anonymized = anonymizePatientData(patientData);

    const prompt = `
      Act as a hospital physician. Generate a discharge summary for this patient:
      ${JSON.stringify(anonymized, null, 2)}
      
      Output JSON with format:
      {
        "admissionDiagnosis": "string",
        "dischargeDiagnosis": "string",
        "hospitalCourse": "string",
        "dischargeCondition": "string",
        "dischargeMedications": ["string"],
        "followUpInstructions": "string"
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: 'application/json' },
      });
      const text = response.text || '{}';
      return JSON.parse(this.cleanJsonText(text));
    } catch (error) {
      console.error('Gemini AI Error:', error);
      return null;
    }
  }
}

export default new GeminiService();
