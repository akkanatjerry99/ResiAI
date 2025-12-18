import React, { useState, useEffect } from 'react';
import { Patient, Task, Medication, Consultation, TaskPriority } from '../types';
import { X, CheckCircle2, AlertTriangle, Calendar, Pill, FileText, ArrowRight, Home, LogOut, CheckSquare, Stethoscope, Clock, Sparkles, Loader2, Trash2, Plus } from 'lucide-react';
import { generateDischargeCriteria, scanForMedicalAppointments, analyzeDischargeMedications, generateDischargeSummary } from '../services/geminiService';
import { formatToBuddhistEra } from '../services/dateService';

interface DischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onDischarge: (updatedPatient: Patient) => void;
}

interface ChecklistItem {
    id: string;
    label: string;
    checked: boolean;
    isAi?: boolean;
}

const DEFAULT_CHECKS = [
    "Vital signs stable for >24h",
    "Pain controlled on oral meds",
    "Voiding / Bowels returning to baseline",
    "Ambulating at baseline level",
    "Catheters / Lines removed"
];

const DischargeModal: React.FC<DischargeModalProps> = ({ isOpen, onClose, patient, onDischarge }) => {
  const [step, setStep] = useState(1);
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Step 1: Clinical & Tasks
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [clinicalChecks, setClinicalChecks] = useState<ChecklistItem[]>([]);
  const [isAiLoadingChecks, setIsAiLoadingChecks] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');

  // Step 2: Medication Reconciliation
  const [medsReconciled, setMedsReconciled] = useState<{med: Medication, action: 'continue' | 'stop' | 'modify', note: string}[]>([]);
  const [aiMedAnalysis, setAiMedAnalysis] = useState<any>(null);
  const [isAnalyzingMeds, setIsAnalyzingMeds] = useState(false);

  // Step 3: Logistics (OPD & Consults)
  const [overlappingAppts, setOverlappingAppts] = useState<any[]>([]);
  const [consultFollowUps, setConsultFollowUps] = useState<{consultId: string, date: string, notes: string}[]>([]);
  const [isScanningAppts, setIsScanningAppts] = useState(false);
  const [scannedAppts, setScannedAppts] = useState<{title: string, date: string, source: string, resolved: boolean}[]>([]);

  // Step 4: Summary
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
      if (isOpen) {
          // Init Step 1
          setPendingTasks(patient.tasks.filter(t => !t.isCompleted));
          
          // Init Dynamic Checklist
          setClinicalChecks(DEFAULT_CHECKS.map(label => ({ id: Math.random().toString(), label, checked: false })));
          
          // Init Step 2
          setMedsReconciled(patient.medications.map(m => ({
              med: m,
              action: m.isActive ? 'continue' : 'stop',
              note: ''
          })));
          setAiMedAnalysis(null);

          // Init Step 3 - Check overlaps from structured timeline
          const admissionTime = new Date(patient.admissionDate).getTime();
          const todayTime = new Date().getTime();
          const overlaps = patient.timeline.filter(e => {
              const eTime = new Date(e.date).getTime();
              return eTime >= admissionTime && eTime <= todayTime && (e.type === 'Meeting' || e.type === 'Other');
          }).map(e => ({ ...e, resolved: false }));
          
          setOverlappingAppts(overlaps);
          setScannedAppts([]); // Reset scanned

          // Init Step 3 - Consults
          setConsultFollowUps(patient.consults.map(c => ({ consultId: c.id, date: '', notes: c.followUpNotes || '' })));

          // Init Step 4
          setSummary(''); // Clear summary to encourage generation or manual entry
          
          setStep(1);
      }
  }, [isOpen, patient]);

  if (!isOpen) return null;

  // --- Handlers ---

  const handleToggleTask = (taskId: string) => {
      setPendingTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const handleToggleCheck = (id: string) => {
      setClinicalChecks(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const handleAddCheck = () => {
      if (!newCheckItem.trim()) return;
      setClinicalChecks(prev => [...prev, { id: Date.now().toString(), label: newCheckItem, checked: true }]);
      setNewCheckItem('');
  };

  const handleDeleteCheck = (id: string) => {
      setClinicalChecks(prev => prev.filter(c => c.id !== id));
  };

  const handleAiSuggestCriteria = async () => {
      setIsAiLoadingChecks(true);
      try {
          const criteria = await generateDischargeCriteria(patient);
          if (criteria && criteria.length > 0) {
              const newItems = criteria.map(c => ({ id: Date.now() + Math.random().toString(), label: c, checked: false, isAi: true }));
              setClinicalChecks(prev => [...prev, ...newItems]);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsAiLoadingChecks(false);
      }
  };

  const handleAnalyzeMeds = async () => {
      setIsAnalyzingMeds(true);
      const homeMeds = patient.preAdmissionMedications || [];
      const activeMeds = patient.medications.filter(m => m.isActive);
      const result = await analyzeDischargeMedications(activeMeds, homeMeds, patient.allergies);
      setAiMedAnalysis(result);
      setIsAnalyzingMeds(false);
  };

  const handleAiScanAppts = async () => {
      setIsScanningAppts(true);
      try {
          const results = await scanForMedicalAppointments(patient);
          if (results.length > 0) {
              setScannedAppts(results.map(r => ({ ...r, resolved: false })));
          } else {
              alert("No hidden appointments found in clinical notes.");
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsScanningAppts(false);
      }
  };

  const handleResolveAppt = (index: number, listType: 'timeline' | 'scanned') => {
      if (listType === 'timeline') {
          setOverlappingAppts(prev => prev.map((a, i) => i === index ? { ...a, resolved: !a.resolved } : a));
      } else {
          setScannedAppts(prev => prev.map((a, i) => i === index ? { ...a, resolved: !a.resolved } : a));
      }
  };

  const handleMedAction = (medId: string, action: 'continue' | 'stop' | 'modify') => {
      setMedsReconciled(prev => prev.map(m => m.med.id === medId ? { ...m, action } : m));
  };

  const handleConsultDate = (consultId: string, date: string) => {
      setConsultFollowUps(prev => prev.map(c => c.consultId === consultId ? { ...c, date } : c));
  };

  const handleConsultNote = (consultId: string, notes: string) => {
      setConsultFollowUps(prev => prev.map(c => c.consultId === consultId ? { ...c, notes } : c));
  };

  const handleGenerateSummary = async () => {
      setIsGeneratingSummary(true);
      // Construct list of active meds based on reconciliation step
      const finalMeds = medsReconciled
          .filter(m => m.action === 'continue' || m.action === 'modify')
          .map(m => m.med);
          
      const aiSummary = await generateDischargeSummary(patient, finalMeds);
      setSummary(aiSummary);
      setIsGeneratingSummary(false);
  };

  const handleFinalize = () => {
      // 1. Process Tasks (assume completed)
      
      // 2. Process Meds
      const updatedMeds = medsReconciled.map(item => ({
          ...item.med,
          isActive: item.action === 'continue' || item.action === 'modify',
          isHomeMed: item.action === 'continue' || item.action === 'modify'
      }));

      // 3. Process Consults
      const updatedConsults = patient.consults.map(c => {
          const followUp = consultFollowUps.find(f => f.consultId === c.id);
          return followUp ? { 
              ...c, 
              followUpDate: followUp.date || undefined,
              followUpNotes: followUp.notes || undefined
          } : c;
      });

      const updatedPatient: Patient = {
          ...patient,
          status: 'Discharged',
          dischargeDate,
          medications: updatedMeds,
          consults: updatedConsults,
          handoff: {
              ...patient.handoff,
              patientSummary: patient.handoff.patientSummary + `\n\n[DISCHARGED ${dischargeDate}]: ${summary}`
          }
      };

      onDischarge(updatedPatient);
      onClose();
  };

  // --- Renders ---

  const renderStep1 = () => (
      <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="bg-glass-depth p-4 rounded-xl border border-glass-border">
              <h3 className="font-bold text-main mb-3 flex items-center gap-2"><CheckSquare size={18} className="text-blue-500"/> Active Tasks Check</h3>
              {pendingTasks.length === 0 ? (
                  <div className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 size={16}/> All clinical tasks completed.</div>
              ) : (
                  <div className="space-y-2">
                      <p className="text-xs text-muted mb-2">Please complete or cancel pending tasks:</p>
                      {pendingTasks.map(t => (
                          <div key={t.id} onClick={() => handleToggleTask(t.id)} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer ${t.isCompleted ? 'bg-green-500/10 border-green-500/30' : 'bg-glass-panel border-glass-border'}`}>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${t.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-muted'}`}>
                                  {t.isCompleted && <CheckCircle2 size={12}/>}
                              </div>
                              <span className={`text-sm ${t.isCompleted ? 'text-muted line-through' : 'text-main'}`}>{t.description}</span>
                              {t.priority === TaskPriority.URGENT && <span className="text-[9px] bg-red-500 text-white px-1 rounded">URGENT</span>}
                          </div>
                      ))}
                  </div>
              )}
          </div>

          <div className="bg-glass-depth p-4 rounded-xl border border-glass-border">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-main flex items-center gap-2"><Stethoscope size={18} className="text-teal-500"/> Clinical Clearance</h3>
                  <button 
                      onClick={handleAiSuggestCriteria}
                      disabled={isAiLoadingChecks}
                      className="text-[10px] bg-teal-500/10 text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-500/20 font-bold flex items-center gap-1"
                  >
                      {isAiLoadingChecks ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                      AI Suggest Criteria
                  </button>
              </div>
              
              <div className="space-y-2">
                  {clinicalChecks.map((check) => (
                      <div key={check.id} className="flex items-center gap-2 group">
                           <label className={`flex-1 flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${check.checked ? 'bg-teal-500/5 border-teal-500/20' : 'bg-glass-panel border-glass-border'}`}>
                              <input type="checkbox" checked={check.checked} onChange={() => handleToggleCheck(check.id)} className="rounded text-teal-600 focus:ring-teal-500"/>
                              <span className="text-sm">{check.label}</span>
                              {check.isAi && <Sparkles size={10} className="text-teal-500 ml-1" />}
                           </label>
                           <button onClick={() => handleDeleteCheck(check.id)} className="p-2 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Trash2 size={14}/>
                           </button>
                      </div>
                  ))}
                  
                  {/* Add Custom Item */}
                  <div className="flex gap-2 mt-2">
                      <input 
                          value={newCheckItem}
                          onChange={e => setNewCheckItem(e.target.value)}
                          placeholder="Add specific criterion..."
                          className="flex-1 bg-glass-panel border border-glass-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-500/30"
                          onKeyDown={e => e.key === 'Enter' && handleAddCheck()}
                      />
                      <button onClick={handleAddCheck} disabled={!newCheckItem} className="p-2 bg-teal-500/10 text-teal-600 rounded-lg hover:bg-teal-500/20 disabled:opacity-50">
                          <Plus size={16}/>
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderStep2 = () => (
      <div className="space-y-4 animate-in slide-in-from-right-4">
          <div className="flex justify-between items-center">
              <h3 className="font-bold text-main flex items-center gap-2"><Pill size={18} className="text-purple-500"/> Meds Reconciliation</h3>
              <button 
                  onClick={handleAnalyzeMeds}
                  disabled={isAnalyzingMeds}
                  className="text-xs bg-indigo-500/10 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-500/20 flex items-center gap-2 transition-all"
              >
                  {isAnalyzingMeds ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                  AI Analyze Meds & Allergies
              </button>
          </div>

          {/* AI Insights Panel */}
          {aiMedAnalysis && (
              <div className="animate-in fade-in space-y-3">
                  {aiMedAnalysis.allergyAlerts?.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                          <h4 className="text-red-600 font-bold text-xs uppercase mb-2 flex items-center gap-1">
                              <AlertTriangle size={12}/> Safety Warning
                          </h4>
                          {aiMedAnalysis.allergyAlerts.map((a: any, i: number) => (
                              <div key={i} className="text-xs text-red-700 dark:text-red-300 mb-1 leading-snug">
                                  <strong>{a.medName}:</strong> {a.alert}
                              </div>
                          ))}
                      </div>
                  )}
                  
                  {aiMedAnalysis.changes?.length > 0 && (
                      <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl">
                          <h4 className="text-indigo-600 font-bold text-xs uppercase mb-2 flex items-center gap-1">
                              <Sparkles size={12}/> Reconciliation Insights
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {aiMedAnalysis.changes.map((c: any, i: number) => (
                                  <div key={i} className="flex flex-col p-2 bg-glass-panel border border-glass-border/50 rounded-lg">
                                      <div className="flex justify-between items-center mb-1">
                                          <span className="font-bold text-xs text-main">{c.medName}</span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold 
                                              ${c.status === 'New' ? 'bg-green-100 text-green-700' : 
                                                c.status === 'Stopped' ? 'bg-red-100 text-red-700' : 
                                                c.status === 'Modified' ? 'bg-amber-100 text-amber-700' : 
                                                'bg-blue-100 text-blue-700'}`}>
                                              {c.status}
                                          </span>
                                      </div>
                                      <span className="text-[10px] text-muted">{c.note}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          )}

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
              {medsReconciled.map((item, idx) => (
                  <div key={item.med.id} className="p-3 bg-glass-depth border border-glass-border rounded-xl flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                          <div>
                              <div className="font-bold text-main text-sm">{item.med.name}</div>
                              <div className="text-xs text-muted">{item.med.dose} • {item.med.frequency}</div>
                          </div>
                          <div className="flex bg-glass-panel rounded-lg p-0.5 border border-glass-border">
                              <button onClick={() => handleMedAction(item.med.id, 'continue')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${item.action === 'continue' ? 'bg-green-500 text-white shadow-sm' : 'text-muted hover:text-main'}`}>Home Med</button>
                              <button onClick={() => handleMedAction(item.med.id, 'stop')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${item.action === 'stop' ? 'bg-red-500 text-white shadow-sm' : 'text-muted hover:text-main'}`}>Stop</button>
                          </div>
                      </div>
                      {item.action === 'continue' && (
                          <input 
                            placeholder="Note (e.g. Decrease dose to...)" 
                            value={item.note} 
                            onChange={(e) => setMedsReconciled(prev => prev.map((m, i) => i === idx ? { ...m, note: e.target.value } : m))}
                            className="w-full bg-glass-panel border-none rounded-lg px-2 py-1 text-xs text-main outline-none placeholder-muted/50"
                          />
                      )}
                  </div>
              ))}
          </div>
      </div>
  );

  const renderStep3 = () => (
      <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                   <h3 className="text-sm font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={16}/> OPD Appointment Conflicts</h3>
                   <button 
                       onClick={handleAiScanAppts}
                       disabled={isScanningAppts}
                       className="text-[10px] bg-red-500/10 text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/20 font-bold flex items-center gap-1"
                   >
                       {isScanningAppts ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                       Deep Scan (AI)
                   </button>
              </div>
              
              <div className="space-y-2">
                  {/* Timeline Overlaps */}
                  {overlappingAppts.map((evt, idx) => (
                      <div key={evt.id} className={`text-xs flex justify-between items-center p-2 rounded border ${evt.resolved ? 'bg-green-100 border-green-200 text-green-700 opacity-60' : 'bg-white/50 dark:bg-black/20 border-red-500/20'}`}>
                          <div>
                              <span className="font-bold block">{evt.title}</span>
                              <span className="font-mono text-[10px]">{formatToBuddhistEra(evt.date)} (Timeline)</span>
                          </div>
                          <button onClick={() => handleResolveAppt(idx, 'timeline')} className={`text-[10px] px-2 py-1 rounded font-bold ${evt.resolved ? 'text-green-600' : 'bg-red-100 text-red-600'}`}>
                              {evt.resolved ? 'Resolved' : 'Mark Resolved'}
                          </button>
                      </div>
                  ))}

                  {/* Scanned Overlaps */}
                  {scannedAppts.map((evt, idx) => (
                      <div key={idx} className={`text-xs flex justify-between items-center p-2 rounded border ${evt.resolved ? 'bg-green-100 border-green-200 text-green-700 opacity-60' : 'bg-purple-500/10 border-purple-500/20'}`}>
                          <div>
                              <span className="font-bold block flex items-center gap-1"><Sparkles size={8} className="text-purple-500"/> {evt.title}</span>
                              <span className="font-mono text-[10px]">{evt.date} (Source: {evt.source})</span>
                          </div>
                          <button onClick={() => handleResolveAppt(idx, 'scanned')} className={`text-[10px] px-2 py-1 rounded font-bold ${evt.resolved ? 'text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                              {evt.resolved ? 'Resolved' : 'Mark Resolved'}
                          </button>
                      </div>
                  ))}

                  {overlappingAppts.length === 0 && scannedAppts.length === 0 && (
                      <div className="text-xs text-muted italic text-center py-2">No conflicts detected.</div>
                  )}
              </div>
          </div>

          <div className="space-y-3">
              <h3 className="font-bold text-main flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> Notify Units / Follow-up</h3>
              {patient.consults.length === 0 ? (
                  <div className="text-sm text-muted italic">No active consultations to schedule.</div>
              ) : (
                  <div className="space-y-2">
                      {patient.consults.map(c => {
                          const followUp = consultFollowUps.find(f => f.consultId === c.id);
                          return (
                              <div key={c.id} className="p-3 bg-glass-depth border border-glass-border rounded-xl flex flex-col gap-2">
                                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                      <div>
                                          <div className="font-bold text-sm text-main">{c.specialty}</div>
                                          <div className="text-xs text-muted">{c.reason}</div>
                                      </div>
                                      <div className="flex items-center gap-2 bg-glass-panel px-2 py-1 rounded-lg border border-glass-border shrink-0">
                                          <label className="text-[10px] font-bold text-muted uppercase whitespace-nowrap">Appt Date:</label>
                                          <input 
                                            type="date" 
                                            value={followUp?.date || ''} 
                                            onChange={(e) => handleConsultDate(c.id, e.target.value)}
                                            className="bg-transparent border-none outline-none text-xs text-main focus:ring-0"
                                          />
                                      </div>
                                  </div>
                                  <input 
                                      placeholder="Add follow-up notes (e.g. Check CBC before visit, bring film)..."
                                      className="w-full bg-glass-panel border border-glass-border rounded-lg px-3 py-2 text-xs text-main outline-none focus:ring-1 focus:ring-blue-500 placeholder-muted/70"
                                      value={followUp?.notes || ''}
                                      onChange={(e) => handleConsultNote(c.id, e.target.value)}
                                  />
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      </div>
  );

  const renderStep4 = () => (
      <div className="space-y-4 animate-in slide-in-from-right-4">
          <div className="bg-glass-depth p-4 rounded-xl border border-glass-border">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-main flex items-center gap-2"><FileText size={18} className="text-indigo-500"/> Discharge Summary</h3>
                  <button 
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                  >
                      {isGeneratingSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Generate AI Summary
                  </button>
              </div>
              <textarea 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full h-64 bg-glass-panel border border-glass-border rounded-xl p-4 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none font-mono leading-relaxed"
                  placeholder="Summary will include: CC, HPI, PE, Hospital Course, Labs, and Discharge Meds..."
              />
          </div>
          
          <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex items-center justify-between">
              <div>
                  <div className="font-bold text-main text-sm">Discharge Date</div>
                  <div className="text-xs text-muted">Effective immediately upon confirmation</div>
              </div>
              <input 
                  type="date"
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                  className="bg-glass-panel border border-glass-border rounded-xl px-3 py-2 text-sm font-bold text-main"
              />
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-2xl shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-glass-border bg-gradient-to-r from-green-500/5 to-teal-500/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/10 text-green-600 rounded-xl">
                    <LogOut size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-main">Discharge Patient</h2>
                    <p className="text-xs text-muted">{patient.name} • {patient.roomNumber}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Steps Progress */}
        <div className="flex border-b border-glass-border shrink-0">
            {[1, 2, 3, 4].map(s => (
                <div 
                    key={s} 
                    className={`flex-1 h-1 transition-all duration-300 ${step >= s ? 'bg-green-500' : 'bg-glass-border'}`}
                />
            ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-glass-depth/20">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-between items-center shrink-0">
            <button 
                onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
                className="px-6 py-2.5 rounded-xl border border-glass-border text-muted hover:text-main font-bold text-sm hover:bg-glass-depth transition-colors"
            >
                {step === 1 ? 'Cancel' : 'Back'}
            </button>
            <div className="flex items-center gap-2">
                {step < 4 ? (
                    <button 
                        onClick={() => setStep(s => s + 1)}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2"
                    >
                        Next Step <ArrowRight size={16}/>
                    </button>
                ) : (
                    <button 
                        onClick={handleFinalize}
                        className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-lg shadow-green-500/30 transition-all flex items-center gap-2"
                    >
                        <Home size={16}/> Confirm Discharge
                    </button>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default DischargeModal;
