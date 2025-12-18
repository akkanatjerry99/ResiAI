import { Response } from 'express';
import Patient from '../models/Patient';
import { AuthRequest } from '../middleware/auth';
import { Types } from 'mongoose';

export const getAllPatients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { acuity, isolation, search } = req.query;
    
    let query: any = {};
    
    if (acuity) query.acuity = acuity;
    if (isolation) query.isolation = isolation;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } },
        { room: { $regex: search, $options: 'i' } },
      ];
    }

    const patients = await Patient.find(query).sort({ admissionDate: -1 });
    res.json({ patients });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatientById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    res.json({ patient });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createPatient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patientData = {
      ...req.body,
      createdBy: req.userId,
      lastModifiedBy: req.userId,
    };

    const patient = await Patient.create(patientData);
    res.status(201).json({ message: 'Patient created successfully', patient });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePatient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    Object.assign(patient, req.body);
    patient.lastModifiedBy = req.userId ? req.userId.toString() as any : '' as any;
    
    await patient.save();
    res.json({ message: 'Patient updated successfully', patient });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePatient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    res.json({ message: 'Patient deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    const newTask = {
      id: `t${Date.now()}`,
      ...req.body,
      isCompleted: false,
    };

    patient.tasks.push(newTask);
    patient.lastModifiedBy = (req.userId || new Types.ObjectId()) as any;
    await patient.save();

    res.status(201).json({ message: 'Task added successfully', task: newTask });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    const taskIndex = patient.tasks.findIndex((t: any) => t.id === req.params.taskId);
    if (taskIndex === -1) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    Object.assign(patient.tasks[taskIndex], req.body);
    patient.lastModifiedBy = (req.userId || new Types.ObjectId()) as any;
    await patient.save();

    res.json({ message: 'Task updated successfully', task: patient.tasks[taskIndex] });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    patient.tasks = patient.tasks.filter((t: any) => t.id !== req.params.taskId);
    patient.lastModifiedBy = (req.userId || new Types.ObjectId()) as any;
    await patient.save();

    res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addMedication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    const newMedication = {
      id: `m${Date.now()}`,
      ...req.body,
      isActive: true,
    };

    patient.medications.push(newMedication);
    patient.lastModifiedBy = (req.userId || new Types.ObjectId()) as any;
    await patient.save();

    res.status(201).json({ message: 'Medication added successfully', medication: newMedication });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMedication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    const medIndex = patient.medications.findIndex((m: any) => m.id === req.params.medicationId);
    if (medIndex === -1) {
      res.status(404).json({ message: 'Medication not found' });
      return;
    }

    Object.assign(patient.medications[medIndex], req.body);
    patient.lastModifiedBy = (req.userId || new Types.ObjectId()) as any;
    await patient.save();

    res.json({ message: 'Medication updated successfully', medication: patient.medications[medIndex] });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addLabResult = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      res.status(404).json({ message: 'Patient not found' });
      return;
    }

    const { labType, value, date } = req.body;

    if (!patient.labs) {
      patient.labs = {
        creatinine: [],
        wbc: [],
        hgb: [],
        k: [],
        inr: [],
        sodium: [],
        others: [],
        pbs: [],
      };
    }

    const labValue = { date, value };

    if (['creatinine', 'wbc', 'hgb', 'k', 'inr', 'sodium'].includes(labType)) {
      patient.labs[labType].push(labValue);
    } else {
      // Custom lab
      const customLabIndex = patient.labs.others.findIndex((l: any) => l.name === labType);
      if (customLabIndex >= 0) {
        patient.labs.others[customLabIndex].values.push(labValue);
      } else {
        patient.labs.others.push({
          name: labType,
          unit: req.body.unit || '',
          values: [labValue],
        });
      }
    }

    patient.lastModifiedBy = (req.userId || new Types.ObjectId()) as any;
    await patient.save();

    res.status(201).json({ message: 'Lab result added successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalPatients = await Patient.countDocuments();
    const stableCount = await Patient.countDocuments({ acuity: 'Stable' });
    const watchCount = await Patient.countDocuments({ acuity: 'Watch' });
    const unstableCount = await Patient.countDocuments({ acuity: 'Unstable' });

    // Count pending tasks
    const patientsWithTasks = await Patient.find({ 'tasks.0': { $exists: true } });
    let pendingTasks = 0;
    patientsWithTasks.forEach((p) => {
      pendingTasks += p.tasks.filter((t: any) => !t.isCompleted).length;
    });

    res.json({
      statistics: {
        totalPatients,
        stableCount,
        watchCount,
        unstableCount,
        pendingTasks,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
