


import React, { useState, useEffect, useRef } from 'react';
import { Patient, DailyRound, TaskPriority, Task, LabValue, CultureResult, RawLabResult } from '../types';
import { X, Save, Mic, MicOff, Maximize2, Activity, BrainCircuit, FileText, ClipboardCheck, Loader2, ArrowRight, ArrowUp, ArrowDown, Scan, FlaskConical, Image as ImageIcon, Trash2, Plus, Stethoscope, Sparkles, Bug, Heart, Wind, Utensils, Droplet, Syringe, Thermometer, LayoutList, AlignLeft, Check, Pencil } from 'lucide-react';
import { generatePreRoundSummary, extractTasksFromText, compressImage, generateRoundSummary } from '../services/geminiService';
import LabScanModal from './LabScanModal';
import ImagingImportModal from './ImagingImportModal';
import ImagePreviewModal from './ImagePreviewModal';
import MicroScanModal from './MicroScanModal';
import ModernSelect from './ui/ModernSelect';

interface RoundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onSave: (round: DailyRound, newTasks: Task[], newResults?: { labs?: RawLabResult[], imaging?: any, cultures?: CultureResult[] }) => void;
}

const PE_DEFAULTS = {
    gen: "Alert, oriented, no acute distress.",
    cvs: "RRR, normal S1/S2, no murmurs.",
    resp: "Lungs clear to auscultation bilaterally.",
    abd: "Soft, non-tender, non-distended, BS+.",
    neuro: "Grossly intact, moving all extremities.",
    ext: "Warm, well perfused, no edema.",
};

const SYSTEMS = [
    { id: 'CNS', label: 'CNS', icon: <BrainCircuit size={16}/>, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'CVS', label: 'CVS', icon: <Heart size={16}/>, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'RS', label: 'RS', icon: <Wind size={16}/>, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'GI', label: 'GI', icon: <Utensils size={16}/>, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'GU', label: 'GU / Renal', icon: <Droplet size={16}/>, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { id: 'FEN', label: 'FEN / Nut', icon: <FlaskConical size={16}/>, color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 'Hemato', label: 'Hemato', icon: <Syringe size={16}/>, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'ID', label: 'ID', icon: <Bug size={16}/>, color: 'text-lime-500', bg: 'bg-lime-500/10' },
    { id: 'Endocrine', label: 'Endocrine', icon: <Thermometer size={16}/>, color: 'text-teal-500', bg: 'bg-teal-500/10' }
];

const RoundingModal: React.FC<RoundingModalProps> = ({ isOpen, onClose, patient, onSave }) => {
  const [activeTab, setActiveTab] = useState<'subjective' | 'objective' | 'plan'>('subjective');
  const [showLabScan, setShowLabScan] = useState(false);
  const [showImagingScan, setShowImagingScan] = useState(false);
  const [showMicroScan, setShowMicroScan] = useState(false);
  const [view, setView] = useState<'input' | 'task-confirm'>('input');
  
  // --- Subjective ---
  const [subjective, setSubjective] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // --- Objective ---
  // Vitals & IO
  const [intake, setIntake] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [vitalTrends, setVitalTrends] = useState('');
  
  // Vitals Image Handling
  const vitalsInputRef = useRef<HTMLInputElement>(null);
  const [scannedVitalsImage, setScannedVitalsImage] = useState<string | null>(null);
  const [showVitalsPreview, setShowVitalsPreview] = useState(false);
  
  // Scanned Labs (Structured)
  const [scannedLabs, setScannedLabs] = useState<RawLabResult[]>([]);
  
  // Scanned Imaging
  const [scannedImaging, setScannedImaging] = useState(''); 
  const [scannedImagingObject, setScannedImagingObject] = useState<any | null>(null);
  const [scannedImagingImages, setScannedImagingImages] = useState<string[]>([]);
  const [showImagingPreview, setShowImagingPreview] = useState(false);

  // Scanned Microbiology
  const [scannedCultures, setScannedCultures] = useState<CultureResult[]>([]);
  
  // Physical Exam Structured
  const [peGen, setPeGen] = useState('');
  const [peCvs, setPeCvs] = useState('');
  const [peResp, setPeResp] = useState('');
  const [peAbd, setPeAbd] = useState('');
  const [peNeuro, setPeNeuro] = useState('');
  const [peExt, setPeExt] = useState('');
  const [peOther, setPeOther] = useState('');

  // --- Assessment & Plan ---
  const [roundingMode, setRoundingMode] = useState<'standard' | 'systems'>('standard');
  const [assessment, setAssessment] = useState('');
  const [planText, setPlanText] = useState('');
  const [systemsInput, setSystemsInput] = useState<Record<string, string>>({
      CNS: '', CVS: '', RS: '', GI: '', GU: '', FEN: '', Hemato: '', ID: '', Endocrine: ''
  });
  
  // Generated Tasks State
  const [generatedTasks, setGeneratedTasks] = useState<{id: string, description: string, priority: TaskPriority, selected: boolean}[]>([]);
  
  // Task Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editPrio, setEditPrio] = useState<TaskPriority>(TaskPriority.NORMAL);

  // Scanning State
  const [isScanningVitals, setIsScanningVitals] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Pending Cultures from Patient Record
  const pendingCultures = (patient.microbiology || []).filter(c => c.status === 'Pending' || c.status === 'Prelim');

  // Init/Reset
  useEffect(() => {
      if (isOpen) {
          setSubjective('');
          setPeGen(''); setPeCvs(''); setPeResp(''); setPeAbd(''); setPeNeuro(''); setPeExt(''); setPeOther('');
          setIntake(''); setOutput('');
          setAssessment(''); setPlanText('');
          setSystemsInput({ CNS: '', CVS: '', RS: '', GI: '', GU: '', FEN: '', Hemato: '', ID: '', Endocrine: '' });
          setRoundingMode('standard');
          setVitalTrends(''); setScannedVitalsImage(null);
          setScannedLabs([]); 
          setScannedImaging(''); setScannedImagingObject(null); setScannedImagingImages([]);
          setScannedCultures([]);
          setGeneratedTasks([]);
          setView('input');
          setActiveTab('subjective');
          setIsListening(false);
          setShowVitalsPreview(false);
          setShowImagingPreview(false);
          setEditingTaskId(null);
      }
  }, [isOpen, patient]);

  // Setup Speech Recognition
  useEffect(() => {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'th-TH'; // Thai Language Support

          recognitionRef.current.onresult = (event: any) => {
              let finalTranscript = '';
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                  if (event.results[i].isFinal) {
                      finalTranscript += event.results[i][0].transcript;
                  }
              }
              if (finalTranscript) {
                  setSubjective(prev => {
                      const spacer = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
                      return prev + spacer + finalTranscript;
                  });
              }
          };
          
          recognitionRef.current.onend = () => setIsListening(false);
      }
  }, []);

  const toggleDictation = () => {
      if (!recognitionRef.current) {
          alert("Voice dictation not supported in this browser.");
          return;
      }
      if (isListening) {
          recognitionRef.current.stop();
          setIsListening(false);
      } else {
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  const handleSystemChange = (sysId: string, val: string) => {
      setSystemsInput(prev => ({ ...prev, [sysId]: val }));
  };

  // Helper to find previous lab value
  const getPreviousLab = (testName: string): { value: number | string, date: string } | null => {
      if (!testName) return null;
      const norm = testName.toLowerCase();
      let values: LabValue[] = [];
      if (norm.includes('creatinine') || norm === 'cr') values = patient.labs.creatinine;
      else if (norm.includes('wbc')) values = patient.labs.wbc;
      else if (norm.includes('hgb') || norm.includes('hemoglobin')) values = patient.labs.hgb;
      else if (norm.includes('potassium') || norm === 'k') values = patient.labs.k;
      else if (norm.includes('sodium') || norm === 'na') values = patient.labs.sodium;
      else if (norm.includes('inr')) values = patient.labs.inr;
      else {
          const custom = patient.labs.others.find(l => l.name.toLowerCase() === norm);
          if (custom) values = custom.values;
      }
      
      if (values.length > 0) {
          return values[values.length - 1]; 
      }
      return null;
  };

  // --- AI Handlers ---

  const handleAiDraft = async () => {
      setIsAiLoading(true);
      const summary = await generatePreRoundSummary(patient);
      if (summary) {
          if (!subjective) setSubjective(summary.subjective);
          if (!assessment) setAssessment(summary.assessment);
          if (summary.planList && !planText) {
              setPlanText(summary.planList.map(p => `- ${p}`).join('\n'));
          }
      }
      setIsAiLoading(false);
  };

  const handleSmartVitalsScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setIsScanningVitals(true);
          try {
              // Just compress and display, no extraction per user request
              const compressed = await compressImage(e.target.files[0]);
              setScannedVitalsImage(compressed);
          } catch (err) {
              console.error(err);
              alert("Error processing image.");
          } finally {
              setIsScanningVitals(false);
              if(vitalsInputRef.current) vitalsInputRef.current.value = '';
          }
      }
  };

  const handleImagingScanComplete = (study: any) => {
      setScannedImaging(`${study.modality} ${study.bodyPart}: ${study.impression} (vs Prev: ${study.findings})`);
      setScannedImagingObject(study);
      if (study.imageUrls && study.imageUrls.length > 0) {
          setScannedImagingImages(study.imageUrls);
      }
  };

  const handleMicroScanComplete = (results: CultureResult[]) => {
      setScannedCultures(prev => [...prev, ...results]);
  };

  const handleAnalyzePlan = async () => {
      // Consolidate text for analysis
      let textToAnalyze = planText;
      
      if (roundingMode === 'systems') {
          const joinedSystems = Object.entries(systemsInput)
              .filter(([_, v]) => (v as string).trim().length > 0)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n');
          textToAnalyze = joinedSystems;
      }

      // Validation
      if (!subjective && !textToAnalyze && !peGen) {
          onClose(); // Nothing to save
          return;
      }

      setIsAiLoading(true);
      // Extract tasks from plan
      const extracted = await extractTasksFromText(textToAnalyze);
      
      if (extracted.length > 0) {
          setGeneratedTasks(extracted.map((t, i) => ({ ...t, id: i.toString(), selected: true })));
          setView('task-confirm');
      } else {
          // Direct save if no tasks found
          handleFinalSave([]);
      }
      setIsAiLoading(false);
  };

  const handleFinalSave = async (tasksToSave: Task[]) => {
      setIsAiLoading(true);
      const net = (parseInt(intake) || 0) - (parseInt(output) || 0);
      
      const fullPe = [
          peGen ? `Gen: ${peGen}` : '',
          peCvs ? `CVS: ${peCvs}` : '',
          peResp ? `Resp: ${peResp}` : '',
          peAbd ? `Abd: ${peAbd}` : '',
          peNeuro ? `Neuro: ${peNeuro}` : '',
          peExt ? `Ext: ${peExt}` : '',
          peOther
      ].filter(Boolean).join('\n');

      // Format structured labs into text for legacy 'vitalTrends' field if needed
      let labsText = '';
      if (scannedLabs.length > 0) {
          labsText = '\nNew Labs: ' + scannedLabs.map(l => `${l.testName} ${l.value}${l.unit} ${l.flag ? '('+l.flag+')' : ''}`).join(', ');
      }
      let imgText = scannedImaging ? `\nImaging: ${scannedImaging}` : '';
      
      let microText = '';
      if (scannedCultures.length > 0) {
          microText = '\nMicro: ' + scannedCultures.map(c => `${c.specimen}: ${c.organism || 'Pending'} (${c.status})`).join(', ');
      }

      const objectiveText = `${fullPe}\nI/O: ${intake}/${output} (Net ${net})\n${vitalTrends}${labsText}`;

      // Handle Systems Mode Aggregation
      let finalAssessment = assessment;
      let finalPlan = planText;
      let finalSystemsReview: Record<string, string> | undefined = undefined;

      if (roundingMode === 'systems') {
          const nonEmptySystems = Object.entries(systemsInput).filter(([_, v]) => (v as string).trim().length > 0);
          if (nonEmptySystems.length > 0) {
              finalSystemsReview = systemsInput;
              // Create a summary for the assessment/plan fields for backwards compatibility / AI summary
              finalAssessment = nonEmptySystems.map(([k, v]) => `${k}: ${v}`).join('\n');
              finalPlan = 'See Systems Review';
          }
      }

      // Generate Summary using AI
      let summary = '';
      try {
          summary = await generateRoundSummary({
              s: subjective,
              o: objectiveText,
              a: finalAssessment,
              p: finalPlan
          });
      } catch (e) {
          console.error("Failed to generate summary", e);
      }

      const newRound: DailyRound = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          subjective,
          physicalExam: fullPe,
          intake: parseInt(intake) || 0,
          output: parseInt(output) || 0,
          netBalance: net,
          assessment: finalAssessment,
          plan: finalPlan,
          planList: finalPlan.split('\n').filter(t => t.trim().length > 0).map((t, i) => ({ id: i.toString(), text: t, isTask: false })),
          systemsReview: finalSystemsReview,
          vitalTrends: `${vitalTrends}${labsText}${microText}${imgText}`.trim(),
          vitalGraphImage: scannedVitalsImage || undefined,
          summary: summary // Save the generated summary
      };

      onSave(newRound, tasksToSave, { 
          labs: scannedLabs, 
          imaging: scannedImagingObject,
          cultures: scannedCultures
      });
      setIsAiLoading(false);
      onClose();
  };

  const handleConfirmTasks = () => {
      const tasks: Task[] = generatedTasks.filter(t => t.selected).map(t => ({
          id: Date.now().toString() + Math.random(),
          description: t.description,
          priority: t.priority,
          isCompleted: false
      }));
      handleFinalSave(tasks);
  };

  // --- Task Editing Handlers ---
  const startEditTask = (task: {id: string, description: string, priority: TaskPriority}, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTaskId(task.id);
      setEditDesc(task.description);
      setEditPrio(task.priority);
  };

  const saveEditTask = (e: React.MouseEvent) => {
      e.stopPropagation();
      setGeneratedTasks(prev => prev.map(t => 
          t.id === editingTaskId ? { ...t, description: editDesc, priority: editPrio } : t
      ));
      setEditingTaskId(null);
  };

  const cancelEditTask = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTaskId(null);
  };

  // Prepare imaging context from the most recent study (index 0)
  const mostRecentImaging = patient.imaging && patient.imaging.length > 0 ? patient.imaging[0] : null;
  const comparisonContext = mostRecentImaging ? `Previous ${mostRecentImaging.modality} of ${mostRecentImaging.bodyPart} on ${mostRecentImaging.date}: ${mostRecentImaging.impression}` : undefined;

  if (!isOpen) return null;

  // --- Task Confirmation View ---
  if (view === 'task-confirm') {
      return (
          <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-glass-panel border-0 md:border border-glass-border p-0 md:rounded-3xl w-full md:w-[95%] max-w-lg shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden h-[100dvh] md:h-auto md:max-h-[90dvh]">
                  <div className="p-6 border-b border-glass-border bg-gradient-to-r from-green-500/5 to-emerald-500/5 shrink-0">
                      <h3 className="text-xl font-bold text-main flex items-center gap-2">
                          <ClipboardCheck size={24} className="text-green-500"/> Confirm Tasks
                      </h3>
                      <p className="text-sm text-muted mt-1">AI detected these actionable items. Select which to add to the patient's task list.</p>
                  </div>
                  
                  <div className="p-6 space-y-3 flex-1 overflow-y-auto custom-scrollbar bg-glass-depth/30">
                      {generatedTasks.map(t => {
                          const isEditing = editingTaskId === t.id;
                          return (
                              <div 
                                key={t.id} 
                                onClick={!isEditing ? () => setGeneratedTasks(prev => prev.map(pt => pt.id === t.id ? {...pt, selected: !pt.selected} : pt)) : undefined}
                                className={`flex items-start p-4 rounded-xl border transition-all shadow-sm ${t.selected && !isEditing ? 'bg-green-500/10 border-green-500/30' : isEditing ? 'bg-glass-panel border-indigo-500/50 ring-2 ring-indigo-500/10' : 'bg-glass-panel border-glass-border opacity-60 hover:opacity-80 cursor-pointer'}`}
                              >
                                  {!isEditing && (
                                      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors shrink-0 ${t.selected ? 'bg-green-500 border-green-500 text-white' : 'border-muted bg-transparent'}`}>
                                          {t.selected && <ClipboardCheck size={14}/>}
                                      </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0">
                                      {isEditing ? (
                                          <div className="space-y-2">
                                              <input 
                                                  value={editDesc}
                                                  onChange={(e) => setEditDesc(e.target.value)}
                                                  className="w-full bg-glass-depth border border-glass-border rounded-lg px-2 py-1 text-sm text-main outline-none focus:ring-1 focus:ring-indigo-500"
                                                  autoFocus
                                              />
                                              <div className="flex gap-2">
                                                  {['Normal', 'Urgent', 'Before Noon', 'Before Discharge'].map((p) => (
                                                      <button 
                                                          key={p} 
                                                          onClick={(e) => { e.stopPropagation(); setEditPrio(p as TaskPriority); }}
                                                          className={`text-[10px] px-2 py-1 rounded border transition-all ${editPrio === p ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-glass-panel text-muted border-glass-border'}`}
                                                      >
                                                          {p}
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      ) : (
                                          <>
                                              <div className={`text-sm font-bold ${t.selected ? 'text-main' : 'text-muted'}`}>{t.description}</div>
                                              <div className="text-[10px] font-bold mt-1 uppercase tracking-wider text-muted">{t.priority}</div>
                                          </>
                                      )}
                                  </div>

                                  <div className="ml-2 flex flex-col gap-1">
                                      {isEditing ? (
                                          <>
                                              <button onClick={saveEditTask} className="p-1.5 bg-green-500/10 text-green-600 rounded hover:bg-green-500/20"><Check size={14}/></button>
                                              <button onClick={cancelEditTask} className="p-1.5 bg-red-500/10 text-red-600 rounded hover:bg-red-500/20"><X size={14}/></button>
                                          </>
                                      ) : (
                                          <button onClick={(e) => startEditTask(t, e)} className="p-1.5 text-muted hover:text-indigo-500 hover:bg-indigo-500/10 rounded transition-colors"><Pencil size={14}/></button>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Enhanced Footer for Mobile */}
                  <div className="p-4 md:p-6 border-t border-glass-border bg-glass-panel flex flex-col sm:flex-row gap-3 shrink-0 pb-8 sm:pb-6 z-20">
                      <button onClick={() => setView('input')} className="flex-1 py-3 md:py-2 rounded-xl border border-glass-border text-muted hover:text-main font-bold transition-colors hover:bg-glass-depth order-2 sm:order-1">Back to Edit</button>
                      <button onClick={handleConfirmTasks} className="flex-1 py-3 md:py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] order-1 sm:order-2">
                          {isAiLoading ? <Loader2 className="animate-spin" size={18}/> : 'Save Round & Tasks'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- Main Rounding View ---
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Sub Modals */}
      <LabScanModal 
        isOpen={showLabScan} 
        onClose={() => setShowLabScan(false)} 
        patientName={patient.name}
        onScanComplete={(results) => setScannedLabs(results)}
      />
      <ImagingImportModal 
        isOpen={showImagingScan}
        onClose={() => setShowImagingScan(false)}
        comparisonContext={comparisonContext}
        onScanComplete={handleImagingScanComplete}
      />
      <MicroScanModal
        isOpen={showMicroScan}
        onClose={() => setShowMicroScan(false)}
        onScanComplete={handleMicroScanComplete}
      />
      <ImagePreviewModal
        isOpen={showVitalsPreview}
        onClose={() => setShowVitalsPreview(false)}
        images={scannedVitalsImage ? [scannedVitalsImage] : []}
        title="Vitals Flowsheet"
      />
      <ImagePreviewModal
        isOpen={showImagingPreview}
        onClose={() => setShowImagingPreview(false)}
        images={scannedImagingImages}
        title="Scanned Imaging"
      />

      <div className="bg-glass-panel border-0 md:border border-glass-border md:rounded-3xl w-full md:w-[98%] lg:max-w-6xl shadow-2xl relative backdrop-blur-xl h-[100dvh] md:h-[90dvh] flex flex-col overflow-hidden transition-all font-thai">
        
        {/* Hidden Vitals Input */}
        <input 
            type="file" 
            accept="image/*" 
            ref={vitalsInputRef} 
            className="hidden" 
            onChange={handleSmartVitalsScan} 
        />

        {/* Header */}
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-violet-500/5 to-indigo-500/5 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4 sm:gap-0 pt-safe sm:pt-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500">
                    <Activity size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-main">Daily Rounding</h2>
                    <p className="text-xs text-muted flex items-center gap-1">
                        {patient.name} • {new Date().toLocaleDateString()}
                    </p>
                </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={handleAiDraft} disabled={isAiLoading} className="flex-1 sm:flex-none px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-violet-500/25 transition-all">
                    {isAiLoading ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                    AI Pre-Round Draft
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-glass-depth text-muted hover:text-main transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Tab Navigation - Pill Style */}
        <div className="flex px-6 gap-2 border-b border-glass-border shrink-0 overflow-x-auto scrollbar-none py-3">
            {[
                { id: 'subjective', label: 'Subjective / อาการ', icon: <FileText size={16}/> },
                { id: 'objective', label: 'Objective / ตรวจร่างกาย', icon: <Activity size={16}/> },
                { id: 'plan', label: 'Plan / แผนการรักษา', icon: <BrainCircuit size={16}/> }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border
                        ${activeTab === tab.id 
                            ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/30' 
                            : 'bg-glass-panel border-glass-border text-muted hover:text-main hover:bg-glass-depth'}
                    `}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-glass-depth/20 custom-scrollbar relative">
            
            {/* SUBJECTIVE TAB */}
            {activeTab === 'subjective' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                    <div className="space-y-2 flex-1 flex flex-col">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Subjective / Overnight Events</label>
                            <button 
                                onClick={toggleDictation}
                                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-all ${isListening ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-glass-panel text-muted border-glass-border hover:border-violet-500 hover:text-violet-500'}`}
                            >
                                {isListening ? <Mic size={12}/> : <MicOff size={12}/>}
                                {isListening ? 'Listening (Thai)...' : 'Dictate (Thai)'}
                            </button>
                        </div>
                        <textarea 
                            value={subjective}
                            onChange={(e) => setSubjective(e.target.value)}
                            className="w-full flex-1 bg-glass-panel border border-glass-border rounded-2xl p-4 text-main text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none shadow-sm min-h-[200px]"
                            placeholder="Patient complaints, nursing reports, events overnight..."
                        />
                        <div className="text-[10px] text-muted italic text-right">Supports Thai Language Dictation</div>
                    </div>
                </div>
            )}

            {/* OBJECTIVE TAB */}
            {activeTab === 'objective' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    {/* Vitals & IO */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-glass-panel border border-glass-border rounded-2xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-main text-sm flex items-center gap-2"><Activity size={16} className="text-red-500"/> Vitals & I/O</h3>
                                <button 
                                    onClick={() => vitalsInputRef.current?.click()} 
                                    className="text-[10px] bg-red-500/10 text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/20 font-bold flex items-center gap-1"
                                >
                                    {isScanningVitals ? <Loader2 size={12} className="animate-spin"/> : <Scan size={12}/>}
                                    Scan Flowsheet
                                </button>
                            </div>
                            
                            {/* Vitals Image Preview */}
                            {scannedVitalsImage && (
                                <div className="mb-3 relative group rounded-lg overflow-hidden border border-glass-border h-32 w-full bg-black/5">
                                    <img src={scannedVitalsImage} className="w-full h-full object-contain" alt="Vitals" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => setShowVitalsPreview(true)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><Maximize2 size={20}/></button>
                                        <button onClick={() => setScannedVitalsImage(null)} className="p-2 bg-red-500/20 rounded-full text-red-500 hover:bg-red-500/40"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="text-[10px] font-bold text-muted uppercase">Intake (ml)</label>
                                    <input type="number" value={intake} onChange={e => setIntake(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-lg p-2 text-sm outline-none" placeholder="0"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted uppercase">Output (ml)</label>
                                    <input type="number" value={output} onChange={e => setOutput(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-lg p-2 text-sm outline-none" placeholder="0"/>
                                </div>
                            </div>
                            <div className="text-center text-xs font-bold bg-glass-depth py-1 rounded-lg border border-glass-border">
                                Net: <span className={(parseInt(intake)-parseInt(output)) > 0 ? 'text-blue-500' : 'text-orange-500'}>{(parseInt(intake) || 0) - (parseInt(output) || 0)}</span> ml
                            </div>
                        </div>

                        {/* Labs Section */}
                        <div className="bg-glass-panel border border-glass-border rounded-2xl p-4 shadow-sm flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-main text-sm flex items-center gap-2"><FlaskConical size={16} className="text-blue-500"/> Today's Labs</h3>
                                <button onClick={() => setShowLabScan(true)} className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-500/20 font-bold flex items-center gap-1">
                                    <Plus size={12}/> Add / Scan
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto max-h-48 custom-scrollbar space-y-2">
                                {scannedLabs.length === 0 ? (
                                    <div className="text-center text-muted text-xs italic py-4">No labs added today.</div>
                                ) : (
                                    scannedLabs.map((lab, i) => {
                                        // Robust check for testName
                                        if (!lab.testName) return null;
                                        
                                        const prev = getPreviousLab(lab.testName);
                                        const isHigh = lab.flag === 'H' || lab.flag === 'Panic';
                                        const isLow = lab.flag === 'L';
                                        // Ensure numeric comparison is done correctly
                                        const trend = prev ? (Number(lab.value) > Number(prev.value) ? 'up' : Number(lab.value) < Number(prev.value) ? 'down' : 'flat') : null;
                                        
                                        return (
                                            <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-glass-depth border border-glass-border text-sm">
                                                <div className="font-bold text-main">{lab.testName}</div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-end">
                                                        <div className={`font-bold flex items-center gap-1 ${isHigh ? 'text-red-500' : isLow ? 'text-blue-500' : 'text-main'}`}>
                                                            {lab.value} 
                                                            {trend === 'up' && <ArrowUp size={10} className="text-red-400"/>}
                                                            {trend === 'down' && <ArrowDown size={10} className="text-green-400"/>}
                                                        </div>
                                                        {prev && (
                                                            <div className="text-[9px] text-muted flex items-center gap-1">
                                                                Prev: {prev.value}
                                                                <span className="opacity-70">
                                                                    ({new Date(prev.date).toLocaleDateString()} {new Date(prev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })})
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {lab.flag && <span className="text-[9px] px-1 bg-red-100 text-red-600 rounded font-bold">{lab.flag}</span>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Microbiology Section */}
                    <div className="bg-glass-panel border border-glass-border rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-main text-sm flex items-center gap-2"><Bug size={16} className="text-orange-500"/> Microbiology / Infection</h3>
                            <button onClick={() => setShowMicroScan(true)} className="text-[10px] bg-orange-500/10 text-orange-600 px-2 py-1 rounded-lg hover:bg-orange-500/20 font-bold flex items-center gap-1">
                                <Scan size={12}/> Scan Result
                            </button>
                        </div>
                        
                        {/* Pending Cultures Notification */}
                        {pendingCultures.length > 0 && (
                            <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                                <FlaskConical size={14} className="text-yellow-600" />
                                <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Pending: {pendingCultures.map(c => c.specimen).join(', ')}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            {scannedCultures.length > 0 ? scannedCultures.map((culture, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-glass-depth border border-glass-border text-sm flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-main">{culture.specimen}</div>
                                        <div className="text-xs text-muted">{culture.collectionDate}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold ${culture.organism?.toLowerCase().includes('no growth') ? 'text-green-500' : 'text-red-500'}`}>
                                            {culture.organism || 'Pending'}
                                        </div>
                                        <div className="text-[10px] text-muted">{culture.status}</div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-muted text-xs italic py-2">No new cultures scanned.</div>
                            )}
                        </div>
                    </div>

                    {/* Imaging Section */}
                    <div className="bg-glass-panel border border-glass-border rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-main text-sm flex items-center gap-2"><ImageIcon size={16} className="text-purple-500"/> Imaging</h3>
                            <div className="flex gap-2">
                                {scannedImagingImages.length > 0 && (
                                    <button 
                                        onClick={() => setShowImagingPreview(true)} 
                                        className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-500/20 font-bold flex items-center gap-1"
                                    >
                                        <Maximize2 size={12} /> View X-Ray
                                    </button>
                                )}
                                <button onClick={() => setShowImagingScan(true)} className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded-lg hover:bg-purple-500/20 font-bold flex items-center gap-1">
                                    <Scan size={12}/> Compare Study
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            {/* X-Ray Thumbnail */}
                            {scannedImagingImages.length > 0 && (
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-black shrink-0 border border-glass-border">
                                    <img src={scannedImagingImages[0]} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <textarea 
                                value={scannedImaging} 
                                onChange={e => setScannedImaging(e.target.value)} 
                                className="w-full h-16 bg-glass-depth border border-glass-border rounded-lg p-2 text-xs text-main outline-none resize-none" 
                                placeholder="Imaging findings..."
                            />
                        </div>
                    </div>

                    {/* Physical Exam (Structured) */}
                    <div className="bg-glass-panel border border-glass-border rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-main text-sm flex items-center gap-2"><Stethoscope size={16} className="text-green-500"/> Physical Exam</h3>
                            <button 
                                onClick={() => {
                                    setPeGen(PE_DEFAULTS.gen);
                                    setPeCvs(PE_DEFAULTS.cvs);
                                    setPeResp(PE_DEFAULTS.resp);
                                    setPeAbd(PE_DEFAULTS.abd);
                                    setPeNeuro(PE_DEFAULTS.neuro);
                                    setPeExt(PE_DEFAULTS.ext);
                                }}
                                className="text-[10px] bg-green-500/10 text-green-600 px-2 py-1 rounded-lg hover:bg-green-500/20 font-bold border border-green-500/20"
                            >
                                Fill Normal
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { l: 'General', v: peGen, s: setPeGen },
                                { l: 'CVS', v: peCvs, s: setPeCvs },
                                { l: 'Resp', v: peResp, s: setPeResp },
                                { l: 'Abd', v: peAbd, s: setPeAbd },
                                { l: 'Neuro', v: peNeuro, s: setPeNeuro },
                                { l: 'Ext', v: peExt, s: setPeExt },
                            ].map((f, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">{f.l}</label>
                                    <input value={f.v} onChange={e => f.s(e.target.value)} className="bg-glass-depth border border-glass-border rounded-lg px-2 py-1.5 text-xs text-main outline-none focus:ring-1 focus:ring-green-500/50"/>
                                </div>
                            ))}
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-muted uppercase ml-1">Other / Wounds</label>
                                <textarea value={peOther} onChange={e => setPeOther(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-lg px-2 py-1.5 text-xs text-main outline-none focus:ring-1 focus:ring-green-500/50 resize-none h-10"/>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PLAN TAB */}
            {activeTab === 'plan' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-end mb-4">
                        <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border">
                            <button 
                                onClick={() => setRoundingMode('standard')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${roundingMode === 'standard' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-muted hover:text-main'}`}
                            >
                                <AlignLeft size={14}/> Standard
                            </button>
                            <button 
                                onClick={() => setRoundingMode('systems')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${roundingMode === 'systems' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-muted hover:text-main'}`}
                            >
                                <LayoutList size={14}/> Systems
                            </button>
                        </div>
                    </div>

                    {roundingMode === 'standard' ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-wider">Assessment / Problem List Update</label>
                                <textarea 
                                    value={assessment}
                                    onChange={(e) => setAssessment(e.target.value)}
                                    className="w-full h-32 bg-glass-panel border border-glass-border rounded-2xl p-4 text-main text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none shadow-sm"
                                    placeholder="Current problems and status..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-wider">Plan</label>
                                <textarea 
                                    value={planText}
                                    onChange={(e) => setPlanText(e.target.value)}
                                    className="w-full h-48 bg-glass-panel border border-glass-border rounded-2xl p-4 text-main text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none shadow-sm font-mono"
                                    placeholder="- Plan item 1&#10;- Plan item 2"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {SYSTEMS.map(sys => (
                                <div key={sys.id} className="bg-glass-panel border border-glass-border rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${sys.bg} ${sys.color}`}>
                                            {sys.icon}
                                        </div>
                                        <label className="text-xs font-bold text-main">{sys.label}</label>
                                    </div>
                                    <textarea 
                                        value={systemsInput[sys.id]}
                                        onChange={e => handleSystemChange(sys.id, e.target.value)}
                                        className="w-full bg-glass-depth border-none rounded-lg p-2 text-xs text-main outline-none focus:ring-1 focus:ring-violet-500/30 resize-none h-16"
                                        placeholder={`Assessment & Plan for ${sys.label}...`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-end shrink-0 z-20">
            <button 
                onClick={handleAnalyzePlan}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2"
                disabled={isAiLoading}
            >
                {isAiLoading ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                <span>Analyze Plan & Generate Tasks</span>
            </button>
        </div>

      </div>
    </div>
  );
};

export default RoundingModal;
