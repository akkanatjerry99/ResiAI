// Azure Document Intelligence integration for lab table extraction
// 1. Install dependencies: npm install @azure/ai-form-recognizer
// 2. Set AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY in your .env

import { AzureKeyCredential, DocumentAnalysisClient } from "@azure/ai-form-recognizer";

const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || "";
const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY || "";

if (!endpoint || !apiKey) {
  throw new Error("Azure Form Recognizer endpoint/key not set in environment variables");
}

const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

export async function extractLabsWithAzure(base64Images: string[]): Promise<any[]> {
  const results: any[] = [];
  for (const base64 of base64Images) {
    const buffer = Buffer.from(base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""), "base64");
    const poller = await client.beginAnalyzeDocument("prebuilt-document", buffer);
    const { tables } = await poller.pollUntilDone();
    if (tables) {
      results.push(...tables);
    }
  }
  return results;
}
