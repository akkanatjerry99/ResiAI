import express from 'express';
import * as patientController from '../controllers/patientController';
import { authenticate, authorize } from '../middleware/auth';
import { 
  validatePatient, 
  validateTask, 
  validateMedication, 
  validateLab,
  validateId,
  validatePatientId 
} from '../middleware/validation';
import { validationResult } from 'express-validator';
import { auditLog } from '../middleware/audit';

const router = express.Router();

// Validation result handler
const handleValidation = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Patient CRUD
router.get('/', authenticate, patientController.getAllPatients);
router.get('/statistics', authenticate, patientController.getStatistics);
router.get('/:id', authenticate, validateId, handleValidation, auditLog('READ', 'Patient'), patientController.getPatientById);
router.post('/', authenticate, validatePatient, handleValidation, auditLog('CREATE', 'Patient'), patientController.createPatient);
router.put('/:id', authenticate, validateId, handleValidation, auditLog('UPDATE', 'Patient'), patientController.updatePatient);
router.delete('/:id', authenticate, authorize('Admin', 'Attending'), validateId, handleValidation, auditLog('DELETE', 'Patient'), patientController.deletePatient);

// Tasks
router.post('/:patientId/tasks', authenticate, validatePatientId, validateTask, handleValidation, auditLog('CREATE', 'Task'), patientController.addTask);
router.put('/:patientId/tasks/:taskId', authenticate, validatePatientId, handleValidation, auditLog('UPDATE', 'Task'), patientController.updateTask);
router.delete('/:patientId/tasks/:taskId', authenticate, validatePatientId, handleValidation, auditLog('DELETE', 'Task'), patientController.deleteTask);

// Medications
router.post('/:patientId/medications', authenticate, validatePatientId, validateMedication, handleValidation, auditLog('CREATE', 'Medication'), patientController.addMedication);
router.put('/:patientId/medications/:medicationId', authenticate, validatePatientId, handleValidation, auditLog('UPDATE', 'Medication'), patientController.updateMedication);

// Labs
router.post('/:patientId/labs', authenticate, validatePatientId, validateLab, handleValidation, auditLog('CREATE', 'Lab'), patientController.addLabResult);

export default router;
