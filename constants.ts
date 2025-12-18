
import { Patient, Acuity, Isolation, TaskPriority } from './types';

const generateDates = (daysBack: number) => {
  const dates = [];
  for (let i = daysBack; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(8, 0, 0, 0); // Default to 8 AM
    // ISO-like format: YYYY-MM-DD HH:mm
    const dateStr = d.toISOString().replace('T', ' ').substring(0, 16);
    dates.push(dateStr);
  }
  return dates;
};

const dates = generateDates(5);

export const STANDARD_ANTIBIOTIC_DOSES: Record<string, string[]> = {
    'Ceftriaxone': ['2g IV OD', '1g IV OD', '2g IV BID (Meningitis)'],
    'Meropenem': ['1g IV q8h', '500mg IV q8h', '2g IV q8h (Meningitis)'],
    'Piperacillin/Tazobactam': ['4.5g IV q6h', '2.25g IV q6h', '4.5g IV q8h (Renal)'],
    'Vancomycin': ['1g IV q12h', '15mg/kg IV q12h', '1.5g IV q12h', 'Loading 25mg/kg'],
    'Azithromycin': ['500mg IV/PO Daily', '250mg PO Daily'],
    'Levofloxacin': ['750mg IV/PO Daily', '500mg IV/PO Daily', '750mg IV q48h (Renal)'],
    'Clindamycin': ['600mg IV q8h', '900mg IV q8h', '300mg PO q6h'],
    'Metronidazole': ['500mg IV/PO q8h'],
    'Cefazolin': ['2g IV q8h', '1g IV q8h'],
    'Ceftazidime': ['2g IV q8h', '1g IV q8h'],
    'Amoxicillin/Clavulanate': ['1.2g IV q8h', '1g/200mg IV q8h', '875/125mg PO BID'],
    'Ciprofloxacin': ['400mg IV q12h', '500mg PO BID'],
    'Gentamicin': ['5mg/kg IV OD', '7mg/kg IV OD'],
    'Amikacin': ['15mg/kg IV OD'],
    'Doxycycline': ['100mg PO/IV BID'],
    'Colistin': ['Loading 300mg (9MU), then 150mg (4.5MU) q12h'],
    'Fosfomycin': ['3g PO q48h', '4g IV q6h'],
    'Trimethoprim/Sulfamethoxazole': ['2 amp IV q6h', '2 DS tabs PO BID']
};

export const MEDICATION_DATABASE = [
  // --- ANALGESICS & ANTIPYRETICS ---
  "Paracetamol (Acetaminophen)", "Tylenol", "Tramadol", "Morphine", "Fentanyl", "Oxycodone", "Hydromorphone", "Methadone", "Pethidine",
  "Ibuprofen", "Naproxen", "Diclofenac", "Celecoxib", "Etoricoxib", "Ketorolac", "Indomethacin", "Meloxicam", "Piroxicam",

  // --- GI ---
  "Omeprazole", "Pantoprazole (Controloc)", "Esomeprazole (Nexium)", "Lansoprazole", "Dexlansoprazole", "Rabeprazole",
  "Famotidine", "Cimetidine", "Sucralfate",
  "Senna", "Lactulose", "MOM (Milk of Magnesia)", "Bisacodyl", "Polyethylene Glycol (Miralax)", "Sodium Phosphate",
  "Metoclopramide (Plasil)", "Domperidone", "Ondansetron (Zofran)", "Granisetron", "Hyoscine (Buscopan)", "Mebeverine", "Simethicone",

  // --- CARDIOVASCULAR ---
  // Statins & Lipids
  "Simvastatin", "Atorvastatin", "Rosuvastatin", "Pravastatin", "Fluvastatin", "Fenofibrate", "Gemfibrozil", "Ezetimibe", "Omega-3", "Niacin",
  // Antihypertensives & HF
  "Amlodipine", "Nifedipine", "Felodipine", "Nicardipine", "Lerchanidipine", "Manidipine", "Diltiazem", "Verapamil",
  "Lisinopril", "Enalapril", "Ramipril", "Perindopril", "Captopril",
  "Losartan", "Valsartan", "Candesartan", "Telmisartan", "Olmesartan", "Irbesartan",
  "Furosemide (Lasix)", "Torsemide", "Bumetanide", "Spironolactone", "Eplerenone", "Hydrochlorothiazide (HCTZ)", "Indapamide", "Metolazone", "Acetazolamide",
  "Carvedilol", "Bisoprolol", "Metoprolol", "Atenolol", "Propranolol", "Nebivolol", "Labetalol",
  "Hydralazine", "Minoxidil", "Clonidine", "Methyldopa", "Doxazosin", "Prazosin", "Terazosin",
  "Sacubitril/Valsartan (Entresto)", "Digoxin", "Ivabradine", "Isosorbide Dinitrate", "Isosorbide Mononitrate",

  // --- ANTIPLATELETS & ANTICOAGULANTS ---
  "Aspirin", "Clopidogrel (Plavix)", "Ticagrelor (Brilinta)", "Prasugrel", "Cilostazol", "Dipyridamole",
  "Enoxaparin (Clexane)", "Heparin", "Fondaparinux",
  "Warfarin (Coumadin)", "Apixaban (Eliquis)", "Rivaroxaban (Xarelto)", "Dabigatran (Pradaxa)", "Edoxaban",

  // --- ENDOCRINE ---
  "Metformin", "Glipizide", "Gliclazide", "Glimepiride", "Pioglitazone",
  "Sitagliptin", "Vildagliptin", "Linagliptin", "Saxagliptin",
  "Empagliflozin (Jardiance)", "Dapagliflozin (Forxiga)", "Canagliflozin",
  "Liraglutide (Victoza)", "Dulaglutide", "Semaglutide (Ozempic)",
  "Insulin Glargine (Lantus)", "Insulin Detemir (Levemir)", "Insulin Degludec", "Insulin NPH",
  "Insulin Aspart (NovoRapid)", "Insulin Lispro (Humalog)", "Insulin Regular (Actrapid)", "Insulin Glulisine",
  "Levothyroxine (Eltroxin)", "Methimazole", "Propylthiouracil (PTU)",
  "Prednisolone", "Dexamethasone", "Hydrocortisone", "Methylprednisolone", "Fludrocortisone", "Triamcinolone",

  // --- NEURO / PSYCH ---
  "Gabapentin", "Pregabalin (Lyrica)", "Amitriptyline", "Nortriptyline", "Imipramine",
  "Sertraline", "Fluoxetine", "Escitalopram", "Citalopram", "Paroxetine", "Venlafaxine", "Duloxetine", "Desvenlafaxine", "Mirtazapine", "Bupropion", "Trazodone",
  "Lorazepam (Ativan)", "Diazepam (Valium)", "Alprazolam (Xanax)", "Clonazepam", "Midazolam (Dormicum)",
  "Levetiracetam (Keppra)", "Phenytoin (Dilantin)", "Valproic Acid (Depakine)", "Carbamazepine", "Lamotrigine", "Topiramate", "Oxcarbazepine", "Lacosamide",
  "Donepezil", "Memantine", "Galantamine", "Rivastigmine", 
  "Quetiapine", "Risperidone", "Olanzapine", "Haloperidol", "Aripiprazole", "Clozapine",

  // --- RESPIRATORY ---
  "Albuterol (Salbutamol)", "Ipratropium", "Budesonide", "Fluticasone", "Salmeterol", "Formoterol", "Vilanterol",
  "Tiotropium", "Umeclidinium", "Montelukast", "Theophylline", "Acetylcysteine (NAC)", "Bromhexine", "Carbocysteine", "Dextromethorphan",

  // --- CRITICAL CARE / VASOACTIVE (IV Drips) ---
  "Norepinephrine (Levophed)", "Epinephrine (Adrenalin)", "Dopamine", "Dobutamine", "Milrinone", "Vasopressin",
  "Nicardipine IV", "Nitroglycerin", "Nitroprusside", "Labetalol IV", "Esmolol", "Hydralazine IV",
  "Amiodarone", "Adenosine", "Lidocaine", "Atropine", "Isoproterenol", "Magnesium Sulfate",
  "Precedex (Dexmedetomidine)", "Propofol", "Ketamine", "Etomidate", "Succinylcholine", "Rocuronium", "Vecuronium", "Cisatracurium", "Atracurium",
  "Fentanyl IV", "Morphine IV", "Midazolam IV",

  // --- ANTIBIOTICS (Comprehensive) ---
  // Penicillins
  "Penicillin G", "Penicillin V", "Ampicillin", "Amoxicillin", "Amoxicillin/Clavulanate (Augmentin)", 
  "Piperacillin/Tazobactam (Zosyn/Tazocin)", "Ampicillin/Sulbactam (Unasyn)",
  "Cloxacillin", "Dicloxacillin", "Oxacillin", "Nafcillin", "Methicillin",

  // Cephalosporins
  "Cefazolin (Kefzol)", "Cephalexin (Keflex)", "Cefadroxil",
  "Cefuroxime (Zinacef/Zinnat)", "Cefaclor", "Cefoxitin", "Cefotetan",
  "Ceftriaxone (Rocephin)", "Cefotaxime (Claforan)", "Ceftazidime (Fortum)", "Cefdinir", "Cefixime", "Cefoperazone/Sulbactam",
  "Cefepime (Maxipime)", "Cefpirome",
  "Ceftaroline (Teflaro)", "Ceftobiprole",

  // Carbapenems & Monobactams
  "Meropenem (Meronem)", "Imipenem/Cilastatin (Tienam)", "Ertapenem (Invanz)", "Doripenem", "Biapenem",
  "Aztreonam",

  // Fluoroquinolones
  "Ciprofloxacin (Cipro)", "Levofloxacin (Levaquin/Cravit)", "Moxifloxacin (Avelox)", "Ofloxacin", "Norfloxacin", "Gemifloxacin",

  // Macrolides
  "Azithromycin (Zithromax)", "Clarithromycin (Klacid)", "Erythromycin", "Roxithromycin", "Telithromycin",

  // Tetracyclines
  "Doxycycline", "Minocycline", "Tetracycline", "Tigecycline (Tygacil)", "Eravacycline", "Omadacycline",

  // Aminoglycosides
  "Gentamicin", "Amikacin", "Tobramycin", "Streptomycin", "Neomycin", "Plazomicin",

  // Glycopeptides & Lipopeptides
  "Vancomycin (Vancocin)", "Teicoplanin (Targocid)", "Dalbavancin", "Oritavancin", "Telavancin",
  "Daptomycin (Cubicin)",

  // Others
  "Clindamycin (Dalacin)", "Lincomycin",
  "Metronidazole (Flagyl)", "Tinidazole",
  "Trimethoprim/Sulfamethoxazole (Bactrim/Septra/Co-trimoxazole)", "Trimethoprim",
  "Nitrofurantoin (Macrodantin)", "Fosfomycin (Monurol)",
  "Linezolid (Zyvox)", "Tedizolid",
  "Colistin (Polymyxin E)", "Polymyxin B",
  "Chloramphenicol", "Rifampin (Rifampicin)",
  "Fidaxomicin",

  // --- ANTIFUNGALS ---
  "Fluconazole", "Itraconazole", "Voriconazole", "Posaconazole", "Isavuconazole",
  "Amphotericin B", "Caspofungin", "Micafungin", "Anidulafungin", "Nystatin", "Clotrimazole", "Ketoconazole",

  // --- ANTIVIRALS ---
  "Acyclovir", "Valacyclovir", "Ganciclovir", "Valganciclovir", "Oseltamivir (Tamiflu)", "Remdesivir", "Favipiravir", "Molnupiravir"
];

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'p1',
    roomNumber: '402-A',
    name: 'Robert Smith',
    age: 68,
    gender: 'M',
    weight: 75,
    status: 'Admitted',
    oneLiner: '68M w/ HFrEF (EF 20%), admitted for acute decompensation.',
    advancedCarePlan: {
      category: 'Advanced Care Plan',
      limitations: {
        noCPR: true,
        noETT: true,
        noInotropes: false,
        noCVC: false,
        noHD: false
      },
      otherDetails: ''
    },
    acuity: Acuity.WATCH,
    isolation: Isolation.NONE,
    admissionDate: '2023-10-24',
    diagnosis: 'Acute CHF Exacerbation',
    underlyingConditions: 'HFrEF (LVEF 20%), CAD s/p PCI x2 (2018, 2021), HTN, T2DM, CKD stage 3b.',
    insuranceScheme: 'สิทธิข้าราชการ', // Civil Servant
    allergies: ['Penicillin', 'Shellfish'],
    medications: [
      { id: 'm1', name: 'Lasix', dose: '40mg', route: 'IV', frequency: 'BID', isActive: true },
      { id: 'm2', name: 'Lisinopril', dose: '10mg', route: 'PO', frequency: 'Daily', isActive: true },
      { id: 'm3', name: 'Atorvastatin', dose: '40mg', route: 'PO', frequency: 'HS', isActive: true }
    ],
    consults: [
      {
        id: 'c1',
        specialty: 'Cardiology',
        reason: 'Recs for diuretic titration and GDMT optimization.',
        status: 'Active',
        recommendations: 'Continue Lasix drip. Hold Beta-blocker if HR < 55. Plan for Echo tomorrow.',
        requestDate: '2023-10-24'
      },
      {
        id: 'c2',
        specialty: 'Nephrology',
        reason: 'Rising Creatinine during diuresis.',
        status: 'Pending',
        recommendations: '',
        requestDate: '2023-10-25'
      }
    ],
    labs: {
      creatinine: dates.map((d, i) => ({ date: d, value: [1.1, 1.3, 1.8, 1.6, 1.4][i] })),
      wbc: dates.map((d, i) => ({ date: d, value: [8.5, 9.0, 8.8, 7.2, 6.9][i] })),
      hgb: dates.map((d, i) => ({ date: d, value: [10.2, 10.1, 9.8, 9.9, 10.0][i] })),
      k: dates.map((d, i) => ({ date: d, value: [4.2, 4.5, 3.8, 3.6, 4.0][i] })),
      inr: [{ date: dates[4], value: 1.1 }],
      sodium: [{ date: dates[4], value: 136 }],
      others: [],
      pbs: []
    },
    tasks: [
      { id: 't1', description: 'Check morning BMP', isCompleted: true, priority: TaskPriority.BEFORE_NOON },
      { id: 't2', description: 'Titrate Lasix', isCompleted: false, priority: TaskPriority.URGENT },
      { id: 't3', description: 'Call Cardiology for Echo recs', isCompleted: false, priority: TaskPriority.NORMAL }
    ],
    timeline: [
        { id: 'ev1', title: 'Echo Cardiogram', date: '2023-10-26T14:00:00', type: 'Imaging', notes: 'Transport booked', status: 'Scheduled' },
        { id: 'ev2', title: 'Daughter Visiting', date: '2023-10-27T10:00:00', type: 'Meeting', status: 'Scheduled' },
        { id: 'ev3', title: 'Autoimmune Panel', date: '2023-10-24T09:00:00', type: 'Lab', notes: 'ANA, ANCA sent', status: 'Pending Result' }
    ],
    handoff: {
      illnessSeverity: Acuity.WATCH,
      patientSummary: '68M w/ HFrEF admitted for fluid overload. Diuresing well.',
      actionList: 'Check K+ PM, Replete if < 4.0',
      situationAwareness: 'Family is anxious about discharge date.',
      synthesis: 'Stable but watching renal function while diuresing.',
      contingencies: 'If SBP < 90, hold Lasix and call resident.'
    },
    antibiotics: [],
    microbiology: [],
    rounds: [
        {
            id: 'r1',
            date: '2023-10-25T08:00:00',
            subjective: 'Slept well. No orthopnea. Dyspnea improved. Feels dry.',
            physicalExam: 'JVP 3cm. Lungs clear bases. 1+ pitting edema. Heart regular, no S3.',
            intake: 1500,
            output: 2200,
            netBalance: -700,
            assessment: 'Acute CHF, improving. Euvolemic trajectory. Cr stable at 1.4.',
            plan: '1. Continue Lasix 40mg IV BID.\n2. Wean O2 to room air.\n3. Check BMP in AM.'
        }
    ]
  },
  {
    id: 'p2',
    roomNumber: '405-B',
    name: 'Eleanor Rigby',
    age: 82,
    gender: 'F',
    weight: 50,
    status: 'Admitted',
    oneLiner: '82F w/ Dementia, UTI, Septic Shock (resolving).',
    advancedCarePlan: {
      category: 'Full Code',
      limitations: {
        noCPR: false,
        noETT: false,
        noInotropes: false,
        noCVC: false,
        noHD: false
      },
      otherDetails: ''
    },
    acuity: Acuity.UNSTABLE,
    isolation: Isolation.CONTACT,
    admissionDate: '2023-10-26',
    diagnosis: 'Urosepsis',
    underlyingConditions: 'Alzheimer\'s Dementia (FAST 6a), HTN, Dyslipidemia, Recurrent UTIs.',
    insuranceScheme: 'สิทธิบัตรทอง', // Universal Coverage (Gold Card)
    allergies: ['NKDA'],
    medications: [
      { id: 'm4', name: 'Meropenem', dose: '1g', route: 'IV', frequency: 'q8h', isActive: true },
      { id: 'm5', name: 'Norepinephrine', dose: '0.05mcg/kg/min', route: 'IV', frequency: 'Titrate', isActive: true }
    ],
    consults: [
      {
        id: 'c3',
        specialty: 'Infectious Disease',
        reason: 'ESBL E.Coli bacteremia, antibiotic duration.',
        status: 'Completed',
        recommendations: 'Switch to Ertapenem. Treat for 14 days total from first negative blood cx.',
        requestDate: '2023-10-26'
      },
      {
        id: 'c4',
        specialty: 'Palliative Care',
        reason: 'Goals of care discussion with family.',
        status: 'Active',
        recommendations: 'Meeting scheduled for tomorrow 2PM.',
        requestDate: '2023-10-27'
      }
    ],
    labs: {
      creatinine: dates.map((d, i) => ({ date: d, value: [0.8, 0.9, 1.2, 1.5, 1.3][i] })),
      wbc: dates.map((d, i) => ({ date: d, value: [18.0, 22.5, 19.0, 14.0, 11.2][i] })),
      hgb: dates.map((d, i) => ({ date: d, value: [11.5, 11.4, 11.0, 11.2, 11.3][i] })),
      k: dates.map((d, i) => ({ date: d, value: [3.5, 3.6, 3.9, 4.1, 4.0][i] })),
      inr: [{ date: dates[4], value: 1.0 }],
      sodium: [{ date: dates[4], value: 140 }],
      others: [],
      pbs: []
    },
    tasks: [
      { id: 't4', description: 'Follow up Urine Culture', isCompleted: false, priority: TaskPriority.URGENT },
      { id: 't5', description: 'Discuss goals of care w/ daughter', isCompleted: false, priority: TaskPriority.BEFORE_DISCHARGE }
    ],
    timeline: [],
    handoff: {
      illnessSeverity: Acuity.UNSTABLE,
      patientSummary: '82F treating for ESBL E. Coli UTI.',
      actionList: 'Monitor BP, ensure IV Abx given on time.',
      situationAwareness: 'Difficult IV access.',
      synthesis: 'Improving on Meropenem.',
      contingencies: 'If temp > 38.5, redraw cx and call.'
    },
    antibiotics: [
        { id: 'ab1', name: 'Ceftriaxone', dose: '2g IV OD', startDate: '2023-10-26', plannedDuration: 3, indication: 'Empiric UTI', endDate: '2023-10-29' },
        { id: 'ab2', name: 'Meropenem', dose: '1g IV q8h', startDate: '2023-10-29', plannedDuration: 14, indication: 'ESBL E. Coli Bacteremia' }
    ],
    microbiology: [
        { 
            id: 'micro1', 
            specimen: 'Hemoculture', 
            collectionDate: '2023-10-26', 
            status: 'Final', 
            organism: 'E. Coli (ESBL Positive)',
            notes: 'MDR organism detected.',
            tttp: '9.5 hrs',
            collectionSource: 'Lt Arm',
            sensitivity: [
                { antibiotic: 'Ampicillin', interpretation: 'R' },
                { antibiotic: 'Ceftriaxone', interpretation: 'R' },
                { antibiotic: 'Ciprofloxacin', interpretation: 'R' },
                { antibiotic: 'Gentamicin', interpretation: 'S' },
                { antibiotic: 'Meropenem', interpretation: 'S', mic: '<=0.12' },
                { antibiotic: 'Ertapenem', interpretation: 'S' }
            ],
            imageUrls: []
        },
        {
            id: 'micro2',
            specimen: 'Urine Culture',
            collectionDate: '2023-10-26',
            status: 'Final',
            organism: 'E. Coli > 10^5 CFU/ml',
            notes: 'Same profile as blood.',
            sensitivity: [
                { antibiotic: 'Ceftriaxone', interpretation: 'R' },
                { antibiotic: 'Meropenem', interpretation: 'S' }
            ],
            imageUrls: []
        }
    ],
    rounds: []
  },
  {
    id: 'p3',
    roomNumber: '410',
    name: 'John Doe',
    age: 45,
    gender: 'M',
    weight: 80,
    status: 'Admitted',
    oneLiner: '45M w/ ETOH Cirrhosis, GI Bleed.',
    advancedCarePlan: {
      category: 'Not Decided',
      limitations: {
        noCPR: false,
        noETT: false,
        noInotropes: false,
        noCVC: false,
        noHD: false
      },
      otherDetails: ''
    },
    acuity: Acuity.STABLE,
    isolation: Isolation.DROPLET,
    admissionDate: '2023-10-22',
    diagnosis: 'Esophageal Varices',
    underlyingConditions: 'Alcoholic Cirrhosis Child-Pugh B, Chronic Hepatitis C (untreated).',
    insuranceScheme: 'ประกันสังคม', // Social Security
    allergies: ['Sulfa Drugs'],
    medications: [
      { id: 'm6', name: 'Propranolol', dose: '20mg', route: 'PO', frequency: 'BID', isActive: true },
      { id: 'm7', name: 'Octreotide', dose: '50mcg', route: 'IV', frequency: 'Bolus', isActive: true }
    ],
    consults: [
        {
          id: 'c5',
          specialty: 'GI / Endoscopy',
          reason: 'Post-banding evaluation.',
          status: 'Completed',
          recommendations: 'Banding successful. Start Soft Diet.',
          requestDate: '2023-10-22'
        }
    ],
    labs: {
      creatinine: dates.map((d, i) => ({ date: d, value: [0.7, 0.7, 0.8, 0.7, 0.7][i] })),
      wbc: dates.map((d, i) => ({ date: d, value: [5.0, 5.2, 6.0, 5.8, 5.5][i] })),
      hgb: dates.map((d, i) => ({ date: d, value: [7.0, 7.2, 8.0, 8.5, 8.8][i] })),
      k: dates.map((d, i) => ({ date: d, value: [3.8, 4.0, 4.1, 3.9, 4.2][i] })),
      inr: [{ date: dates[4], value: 1.8 }],
      sodium: [{ date: dates[4], value: 133 }],
      others: [],
      pbs: []
    },
    tasks: [],
    timeline: [],
    handoff: {
      illnessSeverity: Acuity.STABLE,
      patientSummary: '45M s/p banding of varices.',
      actionList: 'Clear liquid diet today.',
      situationAwareness: 'History of leaving AMA.',
      synthesis: 'Stable, plan for discharge tomorrow.',
      contingencies: 'If Hematemesis -> Rapid Response.'
    },
    antibiotics: [],
    microbiology: [],
    rounds: []
  }
];
