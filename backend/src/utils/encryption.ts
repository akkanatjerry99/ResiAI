import crypto from 'crypto';
import config from '../config';

/**
 * Encrypts sensitive patient data using AES-256-CBC
 */
export const encryptData = (data: string): { ciphertext: string; iv: string } => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
  };
};

/**
 * Decrypts sensitive patient data
 */
export const decryptData = (ciphertext: string, ivHex: string): string => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32));
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Hash sensitive data (one-way)
 */
export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate secure random token
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Anonymize patient data for AI processing
 */
export const anonymizePatientData = (patientData: any): any => {
  const anonymized = { ...patientData };
  
  // Remove or hash personally identifiable information
  if (anonymized.name) {
    anonymized.name = `Patient-${hashData(anonymized.name).slice(0, 8)}`;
  }
  
  // Keep only necessary medical data
  delete anonymized._id;
  delete anonymized.createdBy;
  delete anonymized.lastModifiedBy;
  delete anonymized.createdAt;
  delete anonymized.updatedAt;
  
  return anonymized;
};
