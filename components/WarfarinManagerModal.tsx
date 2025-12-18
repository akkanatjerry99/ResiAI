import React, { useState, useEffect } from 'react';
import { Patient, LabValue, AnticoagulationProfile, TimelineEvent } from '../types';
import { getWarfarinDoseSuggestion, parseWarfarinSchedule } from '../services/geminiService';
import { X, Activity, TrendingUp, AlertTriangle, Pill, Calculator, Save, CalendarClock, Zap, Loader2, Plus, Trash2, HeartPulse, Stethoscope, Droplet } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatToBuddhistEra } from '../services/dateService';

interface WarfarinManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onUpdate: (updatedProfile: AnticoagulationProfile, newInr?: LabValue, nextLabEvent?: TimelineEvent) => void;
}

interface ScheduleRow {
    id: string;
    dose: string;
    days: string[];
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CustomGraphTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        let dateStr = item.date;
        try {
             const d = new Date(item.date);
             dateStr = formatToBuddhistEra(d) + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch (e) {}
        
        return (
            <div className="bg-glass-panel border border-glass-border p-2 rounded-lg shadow-xl backdrop-blur-xl">
                <div className="text-sm font-bold text-main">INR: {item.value}</div>
                <div className="text-xs text-muted">{dateStr}</div>
            </div>
        );
    }
    return null;
};

const WarfarinManagerModal: React.FC<WarfarinManagerModalProps> = ({ isOpen, onClose, patient, onUpdate }) => {
  const [targetLow, setTargetLow] = useState(2.0);
  const [targetHigh, setTargetHigh] = useState(3.0);
  const [indication, setIndication] = useState('');
  
  // New Schedule State
  const [schedule, setSchedule] = useState<ScheduleRow[]>([
      { id: '1', dose: '', days: DAYS_OF_WEEK } // Default 1 row, daily
  ]);

  const [newInrValue, setNewInrValue] = useState('');
  const [suggestion, setSuggestion] = useState<{suggestion: string, reasoning: string, nextLab: string, tabletSuggestion: string, interactions: string[], recommendedFollowUpDays?: number} | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [isParsingSchedule, setIsParsingSchedule] = useState(false);
  
  // Bleeding Logic
  const [hasMajorBleeding, setHasMajorBleeding] = useState(false);
  const [showBleedingCheck, setShowBleedingCheck] = useState(false);

  // Initialize
  useEffect(() => {
    if (isOpen) {
        if (patient.anticoagulation) {
            setTargetLow(patient.anticoagulation.targetINRLow);
            setTargetHigh(patient.anticoagulation.targetINRHigh);
            setIndication(patient.anticoagulation.indication);
            
            const total = patient.anticoagulation.currentWeeklyDoseMg;
            if (total > 0) {
                setSchedule([{ id: Date.now().toString(), dose: (total / 7).toFixed(1).replace(/\.0$/, ''), days: DAYS_OF_WEEK }]);
            } else {
                setSchedule([{ id: Date.now().toString(), dose: '', days: DAYS_OF_WEEK }]);
            }
        } else {
            setTargetLow(2.0);
            setTargetHigh(3.0);
            setIndication('AFib / DVT / PE');
            setSchedule([{ id: Date.now().toString(), dose: '', days: DAYS_OF_WEEK }]);
        }
        setSuggestion(null);
        setNewInrValue('');
        setAutoSchedule(true);
        setHasMajorBleeding(false);
        setShowBleedingCheck(false);
    }
  }, [isOpen, patient]);

  // Check for supratherapeutic INR
  useEffect(() => {
      const val = parseFloat(newInrValue);
      if (!isNaN(val) && val > targetHigh) {
          setShowBleedingCheck(true);
      } else {
          setShowBleedingCheck(false);
          setHasMajorBleeding(false);
      }
  }, [newInrValue, targetHigh]);

  const weeklyTotal = schedule.reduce((acc, row) => {
      const dose = parseFloat(row.dose);
      if (!isNaN(dose)) {
          return acc + (dose * row.days.length);
      }
      return acc;
  }, 0);

  const latestInr = patient.labs.inr.length > 0 
    ? patient.labs.inr[patient.labs.inr.length - 1].value 
    : 0;

  const handleCalculate = async () => {
      setIsCalculating(true);
      const history = [...patient.labs.inr];
      if (newInrValue) {
          history.push({ date: new Date().toISOString(), value: parseFloat(newInrValue) });
      }
      const medList = patient.medications.filter(m => m.isActive).map(m => m.name);

      const result = await getWarfarinDoseSuggestion(history, targetLow, targetHigh, weeklyTotal, medList, indication, hasMajorBleeding);
      setSuggestion(result);
      setIsCalculating(false);
  };

  const handleSave = () => {
      const profile: AnticoagulationProfile = {
          targetINRLow: targetLow,
          targetINRHigh: targetHigh,
          currentWeeklyDoseMg: weeklyTotal,
          indication
      };

      let newLab = undefined;
      if (newInrValue) {
          newLab = { date: new Date().toISOString(), value: parseFloat(newInrValue) };
      }

      let nextLabEvent = undefined;
      if (suggestion?.recommendedFollowUpDays && autoSchedule) {
           const nextDate = new Date();
           nextDate.setDate(nextDate.getDate() + suggestion.recommendedFollowUpDays);
           nextDate.setHours(8, 0, 0, 0);

           nextLabEvent = {
               id: Date.now().toString() + '_inr',
               title: 'Follow Up INR',
               date: nextDate.toISOString(),
               type: 'Lab',
               status: 'Scheduled',
               notes: `Per Warfarin protocol. Target ${targetLow}-${targetHigh}.`
           } as TimelineEvent;
      }

      onUpdate(profile, newLab, nextLabEvent);
      onClose();
  };

  const autoFillSchedule = async () => {
      const warfarinMeds = patient.medications.filter(m => m.isActive && (m.name.toLowerCase().includes('warfarin') || m.name.toLowerCase().includes('coumadin')));
      
      if (warfarinMeds.length > 0) {
          const structuredRows: ScheduleRow[] = [];
          for (const med of warfarinMeds) {
              const doseNum = parseFloat(med.dose);
              if (!isNaN(doseNum)) {
                  if (med.specificSchedule?.days && med.specificSchedule.days.length > 0) {
                      structuredRows.push({
                          id: med.id,
                          dose: doseNum.toString(),
                          days: med.specificSchedule.days
                      });
                  } else if (!med.specificSchedule || med.frequency.toLowerCase().includes('daily') || med.frequency.toLowerCase() === 'od') {
                      structuredRows.push({
                          id: med.id,
                          dose: doseNum.toString(),
                          days: DAYS_OF_WEEK
                      });
                  }
              }
          }

          if (structuredRows.length > 0) {
              setSchedule(structuredRows);
              return;
          }

          setIsParsingSchedule(true);
          const combinedDoseText = warfarinMeds.map(m => `${m.name} ${m.dose} ${m.frequency}`).join('; ');
          
          const parsed = await parseWarfarinSchedule(combinedDoseText);
          
          if (parsed && parsed.length > 0) {
              const newSchedule = parsed.map(p => ({
                  id: Math.random().toString(),
                  dose: p.dose.toString(),
                  days: p.days
              }));
              setSchedule(newSchedule);
          } else {
              const firstMedDose = parseFloat(warfarinMeds[0].dose);
              if (!isNaN(firstMedDose)) {
                  setSchedule([{ id: Date.now().toString(), dose: firstMedDose.toString(), days: DAYS_OF_WEEK }]);
              }
          }
          setIsParsingSchedule(false);
      } else {
          alert("No active Warfarin order found in medications.");
      }
  };

  const addRow = () => {
      setSchedule(prev => [...prev, { id: Date.now().toString(), dose: '', days: [] }]);
  };

  const removeRow = (id: string) => {
      setSchedule(prev => prev.filter(r => r.id !== id));
  };

  const updateRowDose = (id: string, dose: string) => {
      setSchedule(prev => prev.map(r => r.id === id ? { ...r, dose } : r));
  };

  const toggleDay = (rowId: string, day: string) => {
      setSchedule(prev => prev.map(r => {
          if (r.id !== rowId) return r;
          const hasDay = r.days.includes(day);
          const newDays = hasDay ? r.days.filter(d => d !== day) : [...r.days, day];
          return { ...r, days: newDays };
      }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-glass-panel border border-glass-border rounded-3xl w-full max-w-3xl shadow-2xl relative backdrop-blur-xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-glass-border flex justify-between items-center bg-gradient-to-r from-red-500/10 to-orange-500/10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-500/20 text-red-600 dark:text-red-300 rounded-xl">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-main">Warfarin & INR Manager</h2>
                        <p className="text-sm text-muted">Anticoagulation monitoring and dosing.</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-glass-depth transition-colors">
                    <X size={24} className="text-muted" />
                </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* Graph */}
                <div className="bg-glass-depth rounded-2xl p-4 border border-glass-border">
                    <h3 className="text-xs font-bold text-muted uppercase mb-4 flex items-center gap-2">
                        <TrendingUp size={14}/> INR Trend
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={patient.labs.inr}>
                                <defs>
                                    <linearGradient id="colorInr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                <XAxis dataKey="date" hide />
                                <YAxis domain={[0, 5]} hide />
                                <Tooltip content={<CustomGraphTooltip />} cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }} />
                                <ReferenceLine y={targetHigh} stroke="orange" strokeDasharray="3 3" label={{ value: 'Target High', fontSize: 10, fill: 'orange' }} />
                                <ReferenceLine y={targetLow} stroke="green" strokeDasharray="3 3" label={{ value: 'Target Low', fontSize: 10, fill: 'green' }} />
                                <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} fill="url(#colorInr)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center mt-2 px-2">
                        <div className="text-sm text-muted">Latest INR: <span className="font-bold text-main text-lg">{latestInr}</span></div>
                        <div className="flex items-center gap-2">
                             <label className="text-xs font-bold text-main">Add Today's INR:</label>
                             <input 
                                type="number" 
                                value={newInrValue}
                                onChange={(e) => setNewInrValue(e.target.value)}
                                className="w-20 bg-glass-panel border border-glass-border rounded-lg px-2 py-1 text-sm font-bold text-center focus:ring-2 focus:ring-red-500/50 outline-none"
                                placeholder="Value"
                             />
                        </div>
                    </div>
                </div>

                {/* Major Bleeding Check (Conditional) */}
                {showBleedingCheck && (
                    <div className="bg-red-500/10 border-2 border-red-500/20 rounded-2xl p-4 animate-in slide-in-from-top-2">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-500 text-white rounded-lg mt-1 shrink-0">
                                <AlertTriangle size={20} className="animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-red-600 dark:text-red-300 text-sm mb-1">Supratherapeutic INR Detected</h4>
                                <p className="text-xs text-red-800 dark:text-red-200 mb-3 leading-relaxed">
                                    INR is above target range ({targetLow}-{targetHigh}). Please evaluate for Major Bleeding Criteria (ISTH / Thai Guidelines):
                                </p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 bg-white/40 dark:bg-black/20 p-2 rounded-lg border border-red-500/10">
                                        <HeartPulse size={14} /> Fatal or Hemodynamic instability
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 bg-white/40 dark:bg-black/20 p-2 rounded-lg border border-red-500/10">
                                        <Stethoscope size={14} /> Critical Site (Intracranial, Retroperitoneal...)
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 bg-white/40 dark:bg-black/20 p-2 rounded-lg border border-red-500/10">
                                        <Droplet size={14} /> Hgb drop ≥ 2 g/dL or Transfusion required
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 p-3 rounded-xl bg-red-500/20 border border-red-500/30 cursor-pointer hover:bg-red-500/30 transition-colors w-full sm:w-fit">
                                    <input 
                                        type="checkbox" 
                                        checked={hasMajorBleeding}
                                        onChange={e => setHasMajorBleeding(e.target.checked)}
                                        className="w-5 h-5 rounded border-red-500 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="font-bold text-sm text-red-700 dark:text-white">Patient has Major Bleeding?</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Targets */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-muted uppercase flex items-center gap-2"><Activity size={14}/> Targets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-muted font-medium">Indication</label>
                            <input value={indication} onChange={e => setIndication(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm"/>
                        </div>
                        <div className="flex gap-2">
                             <div className="flex-1 space-y-1">
                                 <label className="text-xs text-muted font-medium">Target Low</label>
                                 <input type="number" step="0.5" value={targetLow} onChange={e => setTargetLow(Number(e.target.value))} className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-center"/>
                             </div>
                             <div className="flex-1 space-y-1">
                                 <label className="text-xs text-muted font-medium">Target High</label>
                                 <input type="number" step="0.5" value={targetHigh} onChange={e => setTargetHigh(Number(e.target.value))} className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-center"/>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Dosing Schedule */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-muted uppercase flex items-center gap-2"><Pill size={14}/> Dosing Schedule</h3>
                        <button 
                            onClick={autoFillSchedule} 
                            disabled={isParsingSchedule}
                            className="px-3 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-500/20 hover:bg-indigo-500/20 flex items-center gap-1"
                        >
                            {isParsingSchedule ? <Loader2 size={10} className="animate-spin"/> : 'Auto-Fill from Meds'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {schedule.map((row, idx) => (
                            <div key={row.id} className="bg-glass-depth border border-glass-border p-3 rounded-xl flex flex-col md:flex-row gap-3 items-center">
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <input 
                                        type="number" 
                                        value={row.dose} 
                                        onChange={(e) => updateRowDose(row.id, e.target.value)}
                                        className="w-20 bg-glass-panel border border-glass-border rounded-lg p-2 text-sm font-bold text-center outline-none focus:ring-1 focus:ring-indigo-500"
                                        placeholder="mg"
                                    />
                                    <span className="text-xs text-muted font-bold">mg</span>
                                </div>
                                
                                <div className="flex gap-1 flex-1 justify-center md:justify-start overflow-x-auto w-full md:w-auto scrollbar-none">
                                    {DAYS_OF_WEEK.map(day => {
                                        const isSelected = row.days.includes(day);
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => toggleDay(row.id, day)}
                                                className={`
                                                    w-8 h-8 rounded-full text-[10px] font-bold transition-all border
                                                    ${isSelected ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-glass-panel text-muted border-glass-border hover:bg-indigo-500/10'}
                                                `}
                                            >
                                                {day.charAt(0)}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button onClick={() => removeRow(row.id)} className="p-2 text-muted hover:text-red-500 md:ml-auto">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <button onClick={addRow} className="text-xs font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600">
                            <Plus size={12}/> Add Dosage Slot
                        </button>
                        <div className="bg-glass-panel px-3 py-1.5 rounded-xl border border-glass-border">
                            <span className="text-xs text-muted mr-2">Total Weekly Dose:</span>
                            <span className="text-lg font-bold text-main">{weeklyTotal.toFixed(1)} mg</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleCalculate}
                        disabled={weeklyTotal === 0 || isCalculating}
                        className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                        {isCalculating ? <Activity className="animate-spin" size={16}/> : <Calculator size={16}/>}
                        Analyze Dose & Interactions
                    </button>
                </div>

                {/* AI Suggestion Area */}
                {suggestion && (
                    <div className="animate-in slide-in-from-bottom-2 space-y-3 pt-2">
                        {/* Warnings */}
                        {(indication.toLowerCase().includes('mechanical') || indication.toLowerCase().includes('valve')) && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                                <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                                <div className="text-xs text-red-700 dark:text-red-200">
                                    <strong>Mechanical Valve Alert:</strong> Strictly adhere to INR target. DOACs are contraindicated. Avoid Vitamin K for minor elevations.
                                </div>
                            </div>
                        )}

                        {suggestion.interactions.length > 0 && (
                            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <div className="text-xs font-bold text-orange-600 dark:text-orange-300 mb-1 flex items-center gap-1">
                                    <Zap size={12} /> Interactions Detected
                                </div>
                                <ul className="list-disc pl-4 text-xs text-orange-800 dark:text-orange-100">
                                    {suggestion.interactions.map((int, i) => <li key={i}>{int}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Main Suggestion */}
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-500 text-white rounded-lg mt-1">
                                    <Calculator size={16} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-indigo-600 dark:text-indigo-300 text-sm mb-1">Dose Suggestion</h4>
                                    <div className="text-main font-bold text-lg mb-2">{suggestion.suggestion}</div>
                                    
                                    {suggestion.tabletSuggestion && (
                                        <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg mb-2 text-sm font-mono text-main border border-glass-border">
                                            <div className="text-[10px] text-muted uppercase mb-1">Tablet Regimen</div>
                                            {suggestion.tabletSuggestion}
                                        </div>
                                    )}

                                    <p className="text-sm text-muted leading-relaxed mb-3">{suggestion.reasoning}</p>
                                    
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-sm font-bold text-main bg-glass-depth p-2 rounded-lg border border-glass-border w-fit">
                                            <CalendarClock size={16} className="text-indigo-500" />
                                            Next Lab: {suggestion.nextLab}
                                        </div>
                                        {suggestion.recommendedFollowUpDays && (
                                            <label className="flex items-center gap-2 text-xs font-medium text-muted cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={autoSchedule}
                                                    onChange={e => setAutoSchedule(e.target.checked)}
                                                    className="rounded border-glass-border text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Auto-schedule in Timeline
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-end gap-3">
                 <button onClick={onClose} className="px-6 py-2 rounded-xl text-muted font-medium hover:bg-glass-depth transition-colors">Cancel</button>
                 <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/30 flex items-center gap-2">
                     <Save size={18} /> Save & Update
                 </button>
            </div>
        </div>
    </div>
  );
};

export default WarfarinManagerModal;