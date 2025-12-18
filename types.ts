
export interface Medication {
  id: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  isActive: boolean;
  specificSchedule?: {
      days: string[];
      times: string[];
  };
  isHomeMed?: boolean;
  startDate?: string;
  endDate?: string;
}

export enum Acuity {
  STABLE = 'Stable',
  WATCH = 'Watch',
  UNSTABLE = 'Unstable'
}

export enum Isolation {
  NONE = 'None',
  CONTACT = 'Contact',
  DROPLET = 'Droplet',
  AIRBORNE = 'Airborne'
}

export enum TaskPriority {
  NORMAL = 'Normal',
  URGENT = 'Urgent',
  BEFORE_NOON = 'Before Noon',
  BEFORE_DISCHARGE = 'Before Discharge'
}

export interface ACPLimitations {
  noCPR: boolean;
  noETT: boolean;
  noInotropes: boolean;
  noCVC: boolean;
  noHD: boolean;
}

export interface AdvancedCarePlan {
  category: 'Full Code' | 'Advanced Care Plan' | 'Not Decided';
  limitations: ACPLimitations;
  otherDetails: string;
}

export type ConsultStatus = 'Pending' | 'Active' | 'Completed';

export interface Consultation {
  id: string;
  specialty: string;
  reason: string;
  status: ConsultStatus;
  recommendations?: string;
  requestDate: string;
  followUpDate?: string;
  followUpNotes?: string;
}

export interface SubLabResult {
  name: string;
  value: string | number;
  unit?: string;
}

export interface LabValue {
  date: string;
  value: number | string;
  subResults?: SubLabResult[];
}

export interface CustomLab {
  name: string;
  unit?: string;
  values: LabValue[];
}

export interface MicroscopyResult {
  id: string;
  date: string;
  rbcMorphology?: string;
  wbcMorphology?: string;
  plateletMorphology?: string;
  parasites?: string;
  others?: string;
  imageUrls?: string[];
}

export interface Labs {
  creatinine: LabValue[];
  wbc: LabValue[];
  hgb: LabValue[];
  k: LabValue[];
  inr: LabValue[];
  sodium: LabValue[];
  others: CustomLab[];
  pbs?: MicroscopyResult[];
}

export interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  description: string;
  isCompleted: boolean;
  priority: TaskPriority;
  dueDate?: string;
  subtasks?: Subtask[];
}

export type EventType = 'Meeting' | 'Lab' | 'Imaging' | 'Procedure' | 'Other';
export type EventStatus = 'Scheduled' | 'Pending Result' | 'Completed' | 'Cancelled';

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  type: EventType;
  notes?: string;
  status: EventStatus;
}

export interface Handoff {
  illnessSeverity: Acuity;
  patientSummary: string;
  actionList: string;
  situationAwareness: string;
  synthesis: string;
  contingencies: string;
}

export interface Antibiotic {
  id: string;
  name: string;
  dose: string;
  startDate: string;
  plannedDuration: number;
  indication: string;
  endDate?: string;
}

export interface Sensitivity {
  antibiotic: string;
  interpretation: 'R' | 'S' | 'I';
  mic?: string;
}

export interface CultureResult {
  id: string;
  specimen: string;
  collectionDate: string;
  status: 'Pending' | 'Prelim' | 'Final';
  organism?: string;
  notes?: string;
  tttp?: string;
  collectionSource?: string;
  sensitivity?: Sensitivity[];
  imageUrls?: string[];
  gramStain?: string;
}

export interface DailyRound {
  id: string;
  date: string;
  subjective: string;
  physicalExam: string;
  intake: number;
  output: number;
  netBalance: number;
  assessment: string;
  plan: string;
  vitalTrends?: string;
  vitalGraphImage?: string;
  summary?: string;
  planList?: { id: string, text: string, isTask: boolean }[];
  systemsReview?: Record<string, string>;
}

export interface ScannedDemographics {
  name?: string;
  hn?: string;
  age?: number;
  gender?: 'M' | 'F';
}

export interface ProblemEntry {
  problem: string;
  status?: 'Active' | 'Stable' | 'Resolved' | 'Improved' | 'Worsening';
  plan?: string;
}

export interface ChronicDisease {
  type: string;
  diagnosisDate?: string;
  lastValues?: any;
  lastExam?: any;
  complications?: string;
}

export interface RawLabResult {
  testName: string;
  value: number | string;
  unit?: string;
  flag?: string;
  dateTime?: string;
  category?: string;
  subResults?: SubLabResult[];
}

export interface ClinicalAdmissionNote {
  noteType: string;
  patientDemographics?: ScannedDemographics;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  physicalExam: string;
  investigations: string;
  impression: string;
  managementPlan: string;
  problemList?: ProblemEntry[];
  extractedLabs?: RawLabResult[];
  scannedAt: string;
  chronicDiseases?: ChronicDisease[];
}

export interface ImagingStudy {
  id: string;
  modality: string;
  bodyPart: string;
  date: string;
  impression: string;
  findings: string;
  imageUrls?: string[];
}

export interface EKG {
  id: string;
  date: string;
  hn?: string;
  rate?: string;
  rhythm?: string;
  axis?: string;
  intervals?: { pr?: string, qrs?: string, qtc?: string };
  findings?: string;
  impression?: string;
  comparison?: string;
  imageUrls?: string[];
}

export interface AnticoagulationProfile {
  targetINRLow: number;
  targetINRHigh: number;
  currentWeeklyDoseMg: number;
  indication: string;
}

export interface Patient {
  id: string;
  roomNumber: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  weight?: number;
  status: 'Admitted' | 'Discharged';
  oneLiner: string;
  advancedCarePlan: AdvancedCarePlan;
  acuity: Acuity;
  isolation: Isolation;
  admissionDate: string;
  diagnosis: string;
  underlyingConditions: string;
  insuranceScheme: string;
  allergies: string[];
  medications: Medication[];
  consults: Consultation[];
  labs: Labs;
  tasks: Task[];
  timeline: TimelineEvent[];
  handoff: Handoff;
  antibiotics: Antibiotic[];
  microbiology?: CultureResult[];
  rounds?: DailyRound[];
  admissionNote?: ClinicalAdmissionNote;
  imaging?: ImagingStudy[];
  ekgs?: EKG[];
  anticoagulation?: AnticoagulationProfile;
  preAdmissionMedications?: Medication[];
  dischargeDate?: string;
  hn?: string;
}

export type UserRole = 'Admin' | 'Attending' | 'Resident' | 'Nurse' | 'Intern' | 'Medical Student' | 'Pharmacist' | 'Pharmacy Student' | 'Staff' | 'Night Shift';
export type UserStatus = 'Active' | 'On Leave' | 'Inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  lastActive?: string;
  password?: string;
}

export type ViewMode = 'DASHBOARD' | 'PATIENT_DETAIL';
