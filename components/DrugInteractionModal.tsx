
import React, { useState, useEffect } from 'react';
import { Medication } from '../types';
import { checkDrugInteractions } from '../services/geminiService';
import { X, AlertTriangle, ShieldCheck, Pill, Loader2, Info } from 'lucide-react';

interface DrugInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMedications: Medication[];
}

interface Interaction {
    pair: string;
    severity: 'High' | 'Moderate' | 'Low';
    description: string;
}

const DrugInteractionModal: React.FC<DrugInteractionModalProps> = ({ isOpen, onClose, activeMedications }) => {
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(false);
      setInteractions([]);

      const medList = activeMedications.map(m => m.name);
      
      if (medList.length < 2) {
          setLoading(false);
          return;
      }

      checkDrugInteractions(medList)
        .then(result => {
            setInteractions(result);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setError(true);
            setLoading(false);
        });
    }
  }, [isOpen, activeMedications]);

  if (!isOpen) return null;

  const getSeverityStyle = (severity: string) => {
      switch(severity) {
          case 'High': return 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300';
          case 'Moderate': return 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300';
          case 'Low': return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300';
          default: return 'bg-gray-100 border-gray-200 text-gray-700';
      }
  };

  const getSeverityIcon = (severity: string) => {
      switch(severity) {
          case 'High': return <AlertTriangle size={18} className="text-red-600"/>;
          case 'Moderate': return <Info size={18} className="text-orange-600"/>;
          default: return <Info size={18} className="text-blue-600"/>;
      }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-lg shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-glass-border bg-gradient-to-r from-amber-500/10 to-orange-500/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl shadow-inner border border-amber-500/20">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-main">Interaction Check</h2>
                    <p className="text-xs text-muted font-medium">Analysis of {activeMedications.length} active medications</p>
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
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-glass-depth/20">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                        <Pill size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500 animate-pulse" />
                    </div>
                    <div className="text-sm font-bold text-muted animate-pulse text-center">
                        Scanning for interactions...
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-red-500">
                    <AlertTriangle size={32} className="mb-2" />
                    <p className="font-bold">Analysis Failed</p>
                    <p className="text-xs opacity-70">Please check your connection and try again.</p>
                </div>
            ) : interactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-glass-border rounded-2xl bg-white/20 dark:bg-black/10">
                    <ShieldCheck size={48} className="text-green-500 mb-4 opacity-80" />
                    <h3 className="text-lg font-bold text-main">No Significant Interactions</h3>
                    <p className="text-sm text-muted mt-1 max-w-xs">AI analysis did not detect major drug-drug interactions in the current list.</p>
                </div>
            ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    {interactions.map((interaction, idx) => (
                        <div key={idx} className={`rounded-xl border p-4 shadow-sm flex flex-col gap-2 ${getSeverityStyle(interaction.severity)}`}>
                            <div className="flex justify-between items-start">
                                <div className="font-bold text-sm flex items-center gap-2">
                                    {getSeverityIcon(interaction.severity)}
                                    {interaction.pair}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider bg-white/50 dark:bg-black/20`}>
                                    {interaction.severity} Risk
                                </span>
                            </div>
                            <div className="text-xs leading-relaxed pl-7 opacity-90">
                                {interaction.description}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-between items-center">
            <div className="text-[10px] text-muted italic">
                AI-generated analysis. Verify with clinical pharmacist.
            </div>
            <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-500/25 transition-all"
            >
                Close
            </button>
        </div>

      </div>
    </div>
  );
};

export default DrugInteractionModal;
