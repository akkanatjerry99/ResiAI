
import React, { useState, useEffect } from 'react';
import { Patient } from '../types';
import { analyzeDischargeMedications } from '../services/geminiService';
import { X, Sparkles, ShieldAlert, AlertTriangle, Pill, CheckCircle2, ArrowRight, Loader2, History, StopCircle, RefreshCcw, Plus } from 'lucide-react';

interface MedicationReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onUpdate: (updatedPatient: Patient) => void;
}

const MedicationReconciliationModal: React.FC<MedicationReconciliationModalProps> = ({ isOpen, onClose, patient, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const homeMeds = patient.preAdmissionMedications || [];
      const activeMeds = patient.medications.filter(m => m.isActive);
      
      analyzeDischargeMedications(activeMeds, homeMeds, patient.allergies)
        .then(result => {
            setAnalysis(result);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [isOpen, patient]);

  if (!isOpen) return null;

  const handleStopMed = (medName: string) => {
      // Find matching medication in patient.medications (fuzzy match if needed, but exact preferred)
      const targetMed = patient.medications.find(m => m.isActive && m.name.toLowerCase() === medName.toLowerCase());
      if (targetMed) {
          const updatedMeds = patient.medications.map(m => m.id === targetMed.id ? { ...m, isActive: false, endDate: new Date().toISOString().split('T')[0] } : m);
          onUpdate({ ...patient, medications: updatedMeds });
          // Ideally, refresh analysis or optimistically update UI state
          // For now, simpler: close modal or just update parent state
      } else {
          alert("Could not automatically find this medication to stop. Please check the meds list manually.");
      }
  };

  const handleRestartMed = (medName: string) => {
      // Find matching medication in patient.preAdmissionMedications
      const homeMed = patient.preAdmissionMedications?.find(m => m.name.toLowerCase() === medName.toLowerCase());
      if (homeMed) {
          // Add to active meds
          const newMed = {
              ...homeMed,
              id: Date.now().toString(),
              isActive: true,
              startDate: new Date().toISOString().split('T')[0],
              endDate: undefined
          };
          onUpdate({ ...patient, medications: [...patient.medications, newMed] });
          alert(`Restarted ${homeMed.name}.`);
      } else {
          alert("Could not find this medication in home meds list to restart.");
      }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-2xl shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-glass-border bg-gradient-to-r from-indigo-500/10 to-violet-500/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl shadow-inner border border-indigo-500/20">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-main">Medication Safety Check</h2>
                    <p className="text-xs text-muted font-medium">AI Reconciliation & Allergy Screening</p>
                </div>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-glass-depth/30">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                        <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 animate-pulse" />
                    </div>
                    <div className="text-sm font-bold text-muted animate-pulse text-center">
                        Analyzing {patient.medications.length} active medications...<br/>
                        Checking against {patient.allergies.length} allergies and home list.
                    </div>
                </div>
            ) : analysis ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                    
                    {/* Allergy Alerts */}
                    <div className={`rounded-2xl border p-5 ${analysis.allergyAlerts?.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/5 border-green-500/10'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            {analysis.allergyAlerts?.length > 0 ? (
                                <>
                                    <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                                    <h3 className="font-bold text-red-700 dark:text-red-300">Allergy Conflicts Detected</h3>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                                    <h3 className="font-bold text-green-700 dark:text-green-300">No Allergy Conflicts</h3>
                                </>
                            )}
                        </div>
                        
                        {analysis.allergyAlerts?.length > 0 ? (
                            <div className="space-y-2">
                                {analysis.allergyAlerts.map((alert: any, idx: number) => (
                                    <div key={idx} className="bg-white/50 dark:bg-black/20 p-3 rounded-xl text-sm border border-red-500/10 flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                            <div className="font-bold text-red-600 mb-1">{alert.medName}</div>
                                            <div className="text-main leading-snug">{alert.alert}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleStopMed(alert.medName)}
                                            className="text-[10px] bg-red-600 text-white px-2 py-1 rounded font-bold hover:bg-red-700 shadow-sm flex items-center gap-1 shrink-0"
                                        >
                                            <StopCircle size={10} /> Discontinue
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-green-800 dark:text-green-200 opacity-80">
                                No direct conflicts found between active medications and patient allergies ({patient.allergies.join(', ') || 'NKDA'}).
                            </p>
                        )}
                    </div>

                    {/* Reconciliation Changes */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <History size={18} className="text-indigo-500" />
                            <h3 className="font-bold text-main">Reconciliation Analysis</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {analysis.changes?.map((change: any, idx: number) => {
                                let badgeColor = 'bg-gray-100 text-gray-700';
                                if (change.status === 'New') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                                if (change.status === 'Stopped') badgeColor = 'bg-red-100 text-red-700 border-red-200';
                                if (change.status === 'Modified') badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                                if (change.status === 'Continued') badgeColor = 'bg-green-100 text-green-700 border-green-200';

                                return (
                                    <div key={idx} className="bg-glass-panel border border-glass-border p-4 rounded-xl flex flex-col gap-2 hover:bg-glass-depth transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-main flex items-center gap-2">
                                                <Pill size={14} className="text-indigo-400"/> {change.medName}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                                                    {change.status}
                                                </span>
                                                {change.status === 'Stopped' && (
                                                    <button 
                                                        onClick={() => handleRestartMed(change.medName)}
                                                        className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-bold border border-green-500/20 hover:bg-green-500/20 flex items-center gap-1"
                                                        title="Restart Home Med"
                                                    >
                                                        <RefreshCcw size={10} /> Restart
                                                    </button>
                                                )}
                                                {change.status === 'New' && (
                                                    <button 
                                                        onClick={() => handleStopMed(change.medName)}
                                                        className="text-[10px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded font-bold border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1"
                                                        title="Stop New Med"
                                                    >
                                                        <StopCircle size={10} /> Stop
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted leading-relaxed pl-6">
                                            {change.note}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {(!analysis.changes || analysis.changes.length === 0) && (
                                <div className="text-center text-muted py-8 italic border-2 border-dashed border-glass-border rounded-xl">
                                    No significant changes detected or insufficient data.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center text-red-500">
                    <AlertTriangle size={32} className="mb-2" />
                    <p className="font-bold">Analysis Failed</p>
                    <p className="text-xs opacity-70">Please check your connection and try again.</p>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all"
            >
                Done
            </button>
        </div>

      </div>
    </div>
  );
};

export default MedicationReconciliationModal;
