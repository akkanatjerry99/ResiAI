// OCR.Space API integration for lab image OCR
// 1. Get a free API key from https://ocr.space/ocrapi
// 2. Add OCR_SPACE_API_KEY=your_key to backend/.env
// 3. This function sends a base64 image to OCR.Space and returns the parsed text

import axios from 'axios';

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || '';

export async function ocrSpaceExtract(base64Image: string) {
  const formData = new URLSearchParams();
  formData.append('base64Image', base64Image.startsWith('data:') ? base64Image : 'data:image/jpeg;base64,' + base64Image);
  formData.append('language', 'eng');
  formData.append('isTable', 'true');
  formData.append('OCREngine', '2');

  const response = await axios.post('https://api.ocr.space/parse/image', formData, {
    headers: {
      'apikey': OCR_SPACE_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
}
