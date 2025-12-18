import { body, param, ValidationChain } from 'express-validator';

export const validatePatient: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('age').isInt({ min: 0, max: 150 }).withMessage('Valid age is required'),
  body('gender').trim().notEmpty().withMessage('Gender is required'),
  body('diagnosis').trim().notEmpty().withMessage('Diagnosis is required'),
  body('room').trim().notEmpty().withMessage('Room is required'),
  body('admissionDate').isISO8601().withMessage('Valid admission date is required'),
  body('acuity').isIn(['Stable', 'Watch', 'Unstable']).optional(),
  body('isolation').isIn(['None', 'Contact', 'Droplet', 'Airborne']).optional(),
];

export const validateUser: ValidationChain[] = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').isIn(['Admin', 'Attending', 'Resident', 'Nurse', 'Night Shift'])
    .withMessage('Valid role is required'),
];

export const validateLogin: ValidationChain[] = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const validatePinAuth: ValidationChain[] = [
  body('pin').isLength({ min: 4, max: 6 }).withMessage('Valid PIN is required'),
];

export const validateTask: ValidationChain[] = [
  body('description').trim().notEmpty().withMessage('Task description is required'),
  body('priority').isIn(['Normal', 'Urgent', 'Before Noon', 'Before Discharge']).optional(),
];

export const validateMedication: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('Medication name is required'),
  body('dose').trim().notEmpty().withMessage('Dose is required'),
  body('route').trim().notEmpty().withMessage('Route is required'),
  body('frequency').trim().notEmpty().withMessage('Frequency is required'),
];

export const validateLab: ValidationChain[] = [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('value').notEmpty().withMessage('Value is required'),
];

export const validateId: ValidationChain[] = [
  param('id').isMongoId().withMessage('Valid ID is required'),
];

export const validatePatientId: ValidationChain[] = [
  param('patientId').isMongoId().withMessage('Valid patient ID is required'),
];
