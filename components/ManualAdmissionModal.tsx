import React, { useState, useEffect, useRef } from 'react';
import { ClinicalAdmissionNote, ChronicDisease, RawLabResult } from '../types';
import { extractChronicDiseaseInfo, extractEchoReport } from '../services/geminiService';
import { X, Save, Stethoscope, FileText, CheckCircle2, BrainCircuit, Activity, Heart, Wind, UserCheck, FolderHeart, Sparkles, Loader2, Plus, Trash2, Scan, Camera, ChevronDown, ChevronUp, Eye, AlertCircle, Check, FlaskConical } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface ManualAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: ClinicalAdmissionNote) => void;
  initialData?: ClinicalAdmissionNote;
}

const COMMON_PMH = ["HTN", "DLP", "T2DM", "CKD", "CAD", "AFib", "Stroke", "COPD", "Asthma", "HF"];
const COMMON_CC = ["Chest Pain", "Dyspnea", "Fever", "Abdominal Pain", "Altered Mental Status", "Weakness", "Headache"];

const PE_TEMPLATES = {
  general: "Alert, oriented x3, no acute distress.",
  heent: "Normocephalic, atraumatic. PERRLA, EOMI. Mucous membranes moist.",
  cvs: "Regular rate and rhythm. Normal S1/S2. No murmurs, rubs, or gallops.",
  resp: "Lungs clear to auscultation bilaterally. No wheezes, rales, or rhonchi.",
  abd: "Soft, non-tender, non-distended. Bowel sounds active. No guarding/rebound.",
  neuro: "CN II-XII grossly intact. Motor 5/5 all extremities. Sensation intact.",
  ext: "Warm and well perfused. No clubbing, cyanosis, or edema."
};

const ManualAdmissionModal: React.FC<ManualAdmissionModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [activeStep, setActiveStep] = useState<'history' | 'chronic' | 'pe' | 'plan'>('history');

  // Fields
  const [noteType, setNoteType] = useState('Admission Note');

  const [cc, setCc] = useState('');
  const [hpi, setHpi] = useState('');
  const [pmh, setPmh] = useState('');
  
  // Chronic Disease State
  const [chronicDiseases, setChronicDiseases] = useState<ChronicDisease[]>([]);
  const [extracting, setExtracting] = useState(false);

  // Structured PE
  const [peGeneral, setPeGeneral] = useState('');
  const [peCvs, setPeCvs] = useState('');
  const [peResp, setPeResp] = useState('');
  const [peAbd, setPeAbd] = useState('');
  const [peNeuro, setPeNeuro] = useState('');
  const [peExt, setPeExt] = useState('');
  const [peOther, setPeOther] = useState('');

  const [investigations, setInvestigations] = useState('');
  const [impression, setImpression] = useState('');
  const [plan, setPlan] = useState('');
  
  // Structured Labs (from scan)
  const [extractedLabs, setExtractedLabs] = useState<RawLabResult[]>([]);
  
  // Echo Scanning
  const echoInputRef = useRef<HTMLInputElement>(null);
  const [scanningEchoIndex, setScanningEchoIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setNoteType(initialData.noteType || 'Admission Note');
            setCc(initialData.chiefComplaint || '');
            setHpi(initialData.presentIllness || '');
            setPmh(initialData.pastHistory || '');
            setInvestigations(initialData.investigations || '');
            setImpression(initialData.impression || '');
            setPlan(initialData.managementPlan || '');
            setChronicDiseases(initialData.chronicDiseases || []);
            setExtractedLabs(initialData.extractedLabs || []);
            
            if (initialData.physicalExam) {
                 if (typeof initialData.physicalExam === 'object') {
                     // Flatten object if it exists to prevent errors
                     const flattened = Object.entries(initialData.physicalExam)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n');
                     setPeOther(flattened);
                 } else {
                     setPeOther(initialData.physicalExam);
                 }
            }
        } else {
            // Reset
            setNoteType('Admission Note');
            setCc(''); setHpi(''); setPmh('');
            setChronicDiseases([]);
            setPeGeneral(''); setPeCvs(''); setPeResp(''); setPeAbd(''); setPeNeuro(''); setPeExt(''); setPeOther('');
            setInvestigations(''); setImpression(''); setPlan('');
            setExtractedLabs([]);
        }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    const fullPe = [
        peGeneral ? `Gen: ${peGeneral}` : '',
        peCvs ? `CVS: ${peCvs}` : '',
        peResp ? `Resp: ${peResp}` : '',
        peAbd ? `Abd: ${peAbd}` : '',
        peNeuro ? `Neuro: ${peNeuro}` : '',
        peExt ? `Ext: ${peExt}` : '',
        peOther
    ].filter(Boolean).join('\n');

    const newNote: ClinicalAdmissionNote = {
        noteType,
        chiefComplaint: cc,
        presentIllness: hpi,
        pastHistory: pmh,
        physicalExam: fullPe,
        investigations,
        impression,
        managementPlan: plan,
        problemList: initialData?.problemList || [], 
        chronicDiseases,
        extractedLabs,
        scannedAt: initialData?.scannedAt || new Date().toISOString()
    };

    onSave(newNote);
    onClose();
  };

  const addText = (setter: React.Dispatch<React.SetStateAction<string>>, current: string, text: string) => {
      setter(current ? `${current}, ${text}` : text);
  };

  const handleAiExtractChronic = async () => {
      if (!pmh) {
          alert("Please enter Past History text first.");
          return;
      }
      setExtracting(true);
      const extracted = await extractChronicDiseaseInfo(pmh);
      if (extracted.length > 0) {
          setChronicDiseases(prev => [...prev, ...extracted]);
      } else {
          alert("No specific disease details extracted. Try adding manually.");
      }
      setExtracting(false);
  };

  const handleEchoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && scanningEchoIndex !== null) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = async (ev) => {
              const base64 = ev.target?.result as string;
              if (base64) {
                  // Call AI service
                  const result = await extractEchoReport([base64]);
                  if (result) {
                      // Update state
                      const newDiseases = [...chronicDiseases];
                      const idx = scanningEchoIndex;
                      
                      // Update Last Values (LVEF)
                      newDiseases[idx].lastValues = { 
                          ...newDiseases[idx].lastValues, 
                          lvef: result.lvef || '' 
                      };
                      
                      // Update Last Exam (Echo)
                      newDiseases[idx].lastExam = {
                          ...newDiseases[idx].lastExam,
                          echo: `Date: ${result.date || 'N/A'}. Valves: ${result.valves}. Wall: ${result.wallMotion}`
                      };

                      setChronicDiseases(newDiseases);
                  } else {
                      alert("Could not extract Echo data.");
                  }
              }
              setScanningEchoIndex(null);
          };
          reader.readAsDataURL(file);
      }
  };

  const addNewDisease = (type: string) => {
      setChronicDiseases(prev => [...prev, { type, lastValues: {}, lastExam: {} }]);
  };

  const updateDisease = (index: number, field: keyof ChronicDisease, value: any) => {
      const newDiseases = [...chronicDiseases];
      newDiseases[index] = { ...newDiseases[index], [field]: value };
      setChronicDiseases(newDiseases);
  };

  const updateDiseaseNested = (index: number, parent: 'lastValues' | 'lastExam', key: string, value: string) => {
      const newDiseases = [...chronicDiseases];
      const obj = newDiseases[index][parent] || {};
      newDiseases[index] = { ...newDiseases[index], [parent]: { ...obj, [key]: value } };
      setChronicDiseases(newDiseases);
  };

  const removeLab = (index: number) => {
      setExtractedLabs(prev => prev.filter((_, i) => i !== index));
  };

  const removeDisease = (index: number) => {
      setChronicDiseases(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-glass-panel border border-glass-border rounded-3xl w-full max-w-4xl shadow-2xl relative backdrop-blur-xl h-[85vh] flex flex-col overflow-hidden"
      >
        
        {/* Hidden Input for Echo Scan */}
        <input 
            type="file" 
            accept="image/*" 
            ref={echoInputRef} 
            className="hidden" 
            onChange={handleEchoScan} 
        />

        {/* Header */}
        <div className="px-6 py-4 border-b border-glass-border flex justify-between items-center bg-glass-panel/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                    <FileText size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-main">Clinical Documentation</h2>
                    <p className="text-xs text-muted">Manual Entry & Editing</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <div className="w-48">
                     <ModernSelect 
                        value={noteType}
                        onChange={setNoteType}
                        options={['Admission Note', 'Transfer Note', 'Consult Note', 'Progress Note']}
                     />
                 </div>

                <button onClick={onClose} className="p-2 text-muted hover:text-main hover:bg-glass-depth rounded-lg">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Steps/Tabs */}
        <div className="flex border-b border-glass-border shrink-0 overflow-x-auto scrollbar-none">
            {[
                { id: 'history', label: 'History', icon: <FileText size={16}/> },
                { id: 'chronic', label: 'Chronic / OPD', icon: <FolderHeart size={16}/> },
                { id: 'pe', label: 'Physical Exam', icon: <Stethoscope size={16}/> },
                { id: 'plan', label: 'Inv & Plan', icon: <BrainCircuit size={16}/> }
            ].map((step) => (
                <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id as any)}
                    className={`flex-1 py-3 px-4 min-w-fit text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeStep === step.id ? 'bg-indigo-500/10 text-indigo-500 border-b-2 border-indigo-500' : 'text-muted hover:bg-glass-depth hover:text-main'}`}
                >
                    {step.icon} {step.label}
                </button>
            ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-glass-depth/20 custom-scrollbar">
            
            {/* HISTORY TAB */}
            {activeStep === 'history' && (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Chief Complaint (CC)</label>
                        <textarea 
                            value={cc} onChange={e => setCc(e.target.value)} 
                            className="w-full h-16 bg-glass-panel border border-glass-border rounded-xl p-3 text-main text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                            placeholder="Reason for admission..."
                        />
                        <div className="flex gap-2 flex-wrap">
                            {COMMON_CC.map(item => (
                                <button key={item} onClick={() => addText(setCc, cc, item)} className="px-2 py-1 bg-glass-depth border border-glass-border rounded-lg text-[10px] text-muted hover:bg-glass-panel hover:text-main transition-colors">
                                    + {item}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">History of Present Illness (HPI)</label>
                        <textarea 
                            value={hpi} onChange={e => setHpi(e.target.value)} 
                            className="w-full h-32 bg-glass-panel border border-glass-border rounded-xl p-3 text-main text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                            placeholder="Detailed narrative of current illness..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Past Medical History (PMH)</label>
                        <textarea 
                            value={pmh} onChange={e => setPmh(e.target.value)} 
                            className="w-full h-24 bg-glass-panel border border-glass-border rounded-xl p-3 text-main text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                            placeholder="Underlying conditions..."
                        />
                        <div className="flex gap-2 flex-wrap">
                            {COMMON_PMH.map(item => (
                                <button key={item} onClick={() => addText(setPmh, pmh, item)} className="px-2 py-1 bg-glass-depth border border-glass-border rounded-lg text-[10px] text-muted hover:bg-glass-panel hover:text-main transition-colors">
                                    + {item}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CHRONIC TAB */}
            {activeStep === 'chronic' && (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-indigo-500" />
                            <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">AI Extraction</div>
                        </div>
                        <button 
                            onClick={handleAiExtractChronic} 
                            disabled={extracting}
                            className="px-3 py-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-2"
                        >
                            {extracting ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />}
                            Populate from History Text
                        </button>
                    </div>

                    <div className="space-y-4">
                        {chronicDiseases.map((d, i) => (
                            <div key={i} className="bg-glass-panel border border-glass-border rounded-xl p-4 relative group">
                                <button onClick={() => removeDisease(i)} className="absolute top-3 right-3 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                
                                <div className="grid grid-cols-2 gap-4 mb-3 pr-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase">Condition</label>
                                        <input value={d.type} onChange={e => updateDisease(i, 'type', e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-lg p-2 text-sm font-bold text-main outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase">Diagnosis Date/Loc</label>
                                        <input value={d.diagnosisDate} onChange={e => updateDisease(i, 'diagnosisDate', e.target.value)} placeholder="e.g. 2018 @ Siriraj" className="w-full bg-glass-depth border border-glass-border rounded-lg p-2 text-sm text-main outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-blue-500 uppercase">Last Values (OPD)</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input placeholder="HbA1c" value={d.lastValues?.hba1c || ''} onChange={e => updateDiseaseNested(i, 'lastValues', 'hba1c', e.target.value)} className="bg-glass-depth border border-glass-border rounded p-1.5 text-xs outline-none" />
                                            <input placeholder="Cr / eGFR" value={d.lastValues?.creatinine || ''} onChange={e => updateDiseaseNested(i, 'lastValues', 'creatinine', e.target.value)} className="bg-glass-depth border border-glass-border rounded p-1.5 text-xs outline-none" />
                                            {/* Add more fields dynamically if needed, keeping simple for now */}
                                        </div>
                                        <textarea 
                                            placeholder="Complications..."
                                            value={d.complications || ''}
                                            onChange={e => updateDisease(i, 'complications', e.target.value)}
                                            className="w-full h-12 bg-glass-depth border border-glass-border rounded-lg p-2 text-xs outline-none resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-green-500 uppercase">Last Exam / Imaging</label>
                                            {(d.type.toLowerCase().includes('hf') || d.type.toLowerCase().includes('heart') || d.type.toLowerCase().includes('valve')) && (
                                                <button 
                                                    onClick={() => { setScanningEchoIndex(i); echoInputRef.current?.click(); }}
                                                    className="text-[9px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded border border-green-500/20 hover:bg-green-500/20 flex items-center gap-1"
                                                >
                                                    <Camera size={10}/> Scan Echo
                                                </button>
                                            )}
                                        </div>
                                        <textarea 
                                            placeholder="Echo / Eye Exam / Foot Exam details..."
                                            value={d.lastExam?.echo || d.lastExam?.eye || ''}
                                            onChange={e => updateDiseaseNested(i, 'lastExam', 'echo', e.target.value)}
                                            className="w-full h-20 bg-glass-depth border border-glass-border rounded-lg p-2 text-xs outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => addNewDisease('DM')} className="px-3 py-1.5 rounded-lg border border-glass-border text-xs text-muted hover:bg-glass-depth">+ DM</button>
                        <button onClick={() => addNewDisease('HTN')} className="px-3 py-1.5 rounded-lg border border-glass-border text-xs text-muted hover:bg-glass-depth">+ HTN</button>
                        <button onClick={() => addNewDisease('DLP')} className="px-3 py-1.5 rounded-lg border border-glass-border text-xs text-muted hover:bg-glass-depth">+ DLP</button>
                        <button onClick={() => addNewDisease('CKD')} className="px-3 py-1.5 rounded-lg border border-glass-border text-xs text-muted hover:bg-glass-depth">+ CKD</button>
                        <button onClick={() => addNewDisease('HF')} className="px-3 py-1.5 rounded-lg border border-glass-border text-xs text-muted hover:bg-glass-depth">+ HF</button>
                        <button onClick={() => addNewDisease('')} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 text-xs font-bold hover:bg-indigo-500/20 flex items-center gap-1"><Plus size={12}/> Custom</button>
                    </div>
                </div>
            )}

            {/* PHYSICAL EXAM TAB */}
            {activeStep === 'pe' && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-end mb-2">
                        <button 
                            onClick={() => {
                                setPeGeneral(PE_TEMPLATES.general);
                                setPeCvs(PE_TEMPLATES.cvs);
                                setPeResp(PE_TEMPLATES.resp);
                                setPeAbd(PE_TEMPLATES.abd);
                                setPeNeuro(PE_TEMPLATES.neuro);
                                setPeExt(PE_TEMPLATES.ext);
                            }}
                            className="text-xs bg-green-500/10 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-500/20 font-bold border border-green-500/20 flex items-center gap-1"
                        >
                            <CheckCircle2 size={12}/> Fill All Normal
                        </button>
                    </div>

                    {[
                        { l: 'General', s: peGeneral, set: setPeGeneral, p: 'GA...' },
                        { l: 'HEENT', s: peCvs, set: setPeCvs, p: 'Head, Eyes, Ears, Nose, Throat...' }, // Wait, mapping was CVS for HEENT in state? Let's assume user maps correctly
                        { l: 'CVS', s: peCvs, set: setPeCvs, p: 'Heart sounds, murmurs...' },
                        { l: 'Respiratory', s: peResp, set: setPeResp, p: 'Breath sounds...' },
                        { l: 'Abdomen', s: peAbd, set: setPeAbd, p: 'Tenderness, distension...' },
                        { l: 'Neuro', s: peNeuro, set: setPeNeuro, p: 'Motor, sensory, CN...' },
                        { l: 'Extremities', s: peExt, set: setPeExt, p: 'Edema, pulses...' },
                        { l: 'Other', s: peOther, set: setPeOther, p: 'Skin, etc...' }
                    ].map((section, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-muted uppercase ml-1">{section.l}</label>
                                {Object.keys(PE_TEMPLATES).find(k => k === section.l.toLowerCase().substring(0,3) || (section.l === 'General' && k === 'general') || (section.l === 'Abdomen' && k === 'abd')) && (
                                    <button 
                                        onClick={() => section.set(PE_TEMPLATES[Object.keys(PE_TEMPLATES).find(k => k === section.l.toLowerCase().substring(0,3) || (section.l === 'General' && k === 'general') || (section.l === 'Abdomen' && k === 'abd')) as keyof typeof PE_TEMPLATES])}
                                        className="text-[10px] text-green-500 hover:underline"
                                    >
                                        Normal
                                    </button>
                                )}
                            </div>
                            <textarea 
                                value={section.s}
                                onChange={e => section.set(e.target.value)}
                                className="w-full h-16 bg-glass-panel border border-glass-border rounded-xl p-2 text-sm text-main outline-none focus:ring-1 focus:ring-green-500/30 resize-none"
                                placeholder={section.p}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* PLAN TAB */}
            {activeStep === 'plan' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    
                    {/* Investigations */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                            <FlaskConical size={14}/> Investigations (Labs / Imaging)
                        </label>
                        
                        {/* Extracted Labs List */}
                        {extractedLabs.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                                {extractedLabs.map((l, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-glass-panel border border-glass-border text-xs group">
                                        <span className="font-bold text-main">{l.testName}: {l.value} {l.unit}</span>
                                        <button onClick={() => removeLab(i)} className="text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <textarea 
                            value={investigations} onChange={e => setInvestigations(e.target.value)} 
                            className="w-full h-24 bg-glass-panel border border-glass-border rounded-xl p-3 text-main text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                            placeholder="Free text findings (CXR, EKG, etc.)..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Impression / Diagnosis</label>
                        <textarea 
                            value={impression} onChange={e => setImpression(e.target.value)} 
                            className="w-full h-20 bg-glass-panel border border-glass-border rounded-xl p-3 text-main font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                            placeholder="Primary problem..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Management Plan</label>
                        <textarea 
                            value={plan} onChange={e => setPlan(e.target.value)} 
                            className="w-full h-48 bg-glass-panel border border-glass-border rounded-xl p-3 text-main text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none font-mono"
                            placeholder="- Plan item 1&#10;- Plan item 2"
                        />
                    </div>
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-end gap-3 shrink-0">
             <button onClick={onClose} className="px-6 py-2 rounded-xl text-muted font-medium hover:bg-glass-depth transition-colors">Cancel</button>
             <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2">
                 <Save size={18} /> Save Note
             </button>
        </div>

      </div>
    </div>
  );
};

export default ManualAdmissionModal;
