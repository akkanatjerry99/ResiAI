import mongoose, { Schema, Document } from 'mongoose';

// Sub-schemas
const LabValueSchema = new Schema({
  date: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  subResults: [{
    name: String,
    value: Schema.Types.Mixed,
    unit: String,
  }],
}, { _id: false });

const CustomLabSchema = new Schema({
  name: { type: String, required: true },
  unit: String,
  values: [LabValueSchema],
}, { _id: false });

const MicroscopyResultSchema = new Schema({
  id: String,
  date: String,
  rbcMorphology: String,
  wbcMorphology: String,
  plateletMorphology: String,
  parasites: String,
  others: String,
  imageUrls: [String],
}, { _id: false });

const LabsSchema = new Schema({
  creatinine: [LabValueSchema],
  wbc: [LabValueSchema],
  hgb: [LabValueSchema],
  k: [LabValueSchema],
  inr: [LabValueSchema],
  sodium: [LabValueSchema],
  others: [CustomLabSchema],
  pbs: [MicroscopyResultSchema],
}, { _id: false });

const MedicationSchema = new Schema({
  id: String,
  name: { type: String, required: true },
  dose: String,
  route: String,
  frequency: String,
  isActive: { type: Boolean, default: true },
  specificSchedule: {
    days: [String],
    times: [String],
  },
  isHomeMed: Boolean,
  startDate: String,
  endDate: String,
}, { _id: false });

const AntibioticSchema = new Schema({
  id: String,
  name: String,
  dose: String,
  startDate: String,
  plannedDuration: Number,
  indication: String,
  endDate: String,
}, { _id: false });

const SubtaskSchema = new Schema({
  id: String,
  text: String,
  isCompleted: Boolean,
}, { _id: false });

const TaskSchema = new Schema({
  id: String,
  description: String,
  isCompleted: Boolean,
  priority: {
    type: String,
    enum: ['Normal', 'Urgent', 'Before Noon', 'Before Discharge'],
  },
  dueDate: String,
  subtasks: [SubtaskSchema],
}, { _id: false });

const TimelineEventSchema = new Schema({
  id: String,
  title: String,
  date: String,
  type: {
    type: String,
    enum: ['Meeting', 'Lab', 'Imaging', 'Procedure', 'Other'],
  },
  notes: String,
  status: {
    type: String,
    enum: ['Scheduled', 'Pending Result', 'Completed', 'Cancelled'],
  },
}, { _id: false });

const ConsultationSchema = new Schema({
  id: String,
  specialty: String,
  reason: String,
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Completed'],
  },
  recommendations: String,
  requestDate: String,
  followUpDate: String,
  followUpNotes: String,
}, { _id: false });

const ImagingStudySchema = new Schema({
  id: String,
  date: String,
  type: String,
  findings: String,
  imageUrls: [String],
}, { _id: false });

const EKGSchema = new Schema({
  id: String,
  date: String,
  findings: String,
  imageUrls: [String],
}, { _id: false });

const CultureResultSchema = new Schema({
  id: String,
  date: String,
  source: String,
  organism: String,
  sensitivities: [{
    antibiotic: String,
    result: String,
  }],
}, { _id: false });

const AdvancedCarePlanSchema = new Schema({
  category: {
    type: String,
    enum: ['Full Code', 'Advanced Care Plan', 'Not Decided'],
  },
  limitations: {
    noCPR: Boolean,
    noETT: Boolean,
    noInotropes: Boolean,
    noCVC: Boolean,
    noHD: Boolean,
  },
  otherDetails: String,
}, { _id: false });

const HandoffSchema = new Schema({
  illnessSeverity: {
    type: String,
    enum: ['Stable', 'Watch', 'Unstable'],
  },
  patientSummary: String,
  actionList: String,
  situationAwareness: String,
  synthesis: String,
  contingencies: String,
}, { _id: false });

const AdmissionNoteSchema = new Schema({
  chiefComplaint: String,
  hpi: String,
  pmh: String,
  medications: String,
  allergies: String,
  socialHistory: String,
  familyHistory: String,
  reviewOfSystems: String,
  physicalExam: String,
  assessment: String,
  plan: String,
}, { _id: false });

const DailyRoundSchema = new Schema({
  id: String,
  date: String,
  subjective: String,
  objective: String,
  assessment: String,
  plan: String,
}, { _id: false });

const ProblemEntrySchema = new Schema({
  id: String,
  problem: String,
  isActive: Boolean,
  diagnosis: String,
  plan: String,
  notes: String,
}, { _id: false });

import { Types } from 'mongoose';

export interface IPatient extends Document {
  _id: Types.ObjectId;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  room: string;
  admissionDate: string;
  acuity: 'Stable' | 'Watch' | 'Unstable';
  isolation: 'None' | 'Contact' | 'Droplet' | 'Airborne';
  underlyingConditions: string;
  allergies: string;
  medications: any[];
  antibiotics: any[];
  tasks: any[];
  timeline: any[];
  labs?: any;
  consultations: any[];
  imaging: any[];
  ekgs: any[];
  cultures: any[];
  advancedCarePlan?: any;
  handoff?: any;
  admissionNote?: any;
  dailyRounds: any[];
  problemList: any[];
  isEncrypted: boolean;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    diagnosis: { type: String, required: true },
    room: { type: String, required: true },
    admissionDate: { type: String, required: true },
    acuity: {
      type: String,
      enum: ['Stable', 'Watch', 'Unstable'],
      default: 'Stable',
    },
    isolation: {
      type: String,
      enum: ['None', 'Contact', 'Droplet', 'Airborne'],
      default: 'None',
    },
    underlyingConditions: String,
    allergies: String,
    medications: [MedicationSchema],
    antibiotics: [AntibioticSchema],
    tasks: [TaskSchema],
    timeline: [TimelineEventSchema],
    labs: LabsSchema,
    consultations: [ConsultationSchema],
    imaging: [ImagingStudySchema],
    ekgs: [EKGSchema],
    cultures: [CultureResultSchema],
    advancedCarePlan: AdvancedCarePlanSchema,
    handoff: HandoffSchema,
    admissionNote: AdmissionNoteSchema,
    dailyRounds: [DailyRoundSchema],
  problemList: [ProblemEntrySchema],
  isEncrypted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
PatientSchema.index({ room: 1 });
PatientSchema.index({ admissionDate: -1 });
PatientSchema.index({ acuity: 1 });
PatientSchema.index({ createdBy: 1 });

export default mongoose.model<IPatient>('Patient', PatientSchema);
