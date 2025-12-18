import React, { useEffect, useState } from 'react';
import { X, Sparkles, BrainCircuit, Activity } from 'lucide-react';
import { Patient } from '../types';
import apiClient from '../services/apiClient';

interface LabInterpretationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
}

const LabInterpretationModal: React.FC<LabInterpretationModalProps> = ({ isOpen, onClose, patient }) => {
  const [interpretation, setInterpretation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens, but don't run analysis automatically
      setInterpretation('');
      setLoading(false);
      setError('');
    }
  }, [isOpen]);

  const buildLabTimeline = () => {
    const timeline = [];
    const addLab = (testName: string, unit: string | undefined, values: any[] = []) => {
      values.forEach(v => {
        if (v && v.date && v.value !== undefined && v.value !== null) {
          timeline.push({
            testName,
            value: v.value,
            unit,
            dateTime: v.date,
          });
        }
      });
    };
    if (patient.labs) {
      addLab('Creatinine', 'mg/dL', patient.labs.creatinine);
      addLab('WBC', '10^3/uL', patient.labs.wbc);
      addLab('Hemoglobin', 'g/dL', patient.labs.hgb);
      addLab('Potassium', 'mmol/L', patient.labs.k);
      addLab('Sodium', 'mmol/L', patient.labs.sodium);
      addLab('INR', '', patient.labs.inr);
      if (patient.labs.others) {
        patient.labs.others.forEach(otherLab => {
          addLab(otherLab.name, otherLab.unit, otherLab.values);
        });
      }
    }
    return timeline;
  };

  const handleAnalysis = () => {
    setLoading(true);
    setError('');
    setInterpretation('');
    const labTimeline = buildLabTimeline();
    apiClient.interpretLabs({ patient, labTimeline })
      .then(result => {
        setInterpretation(result.interpretation);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to generate interpretation.');
        setLoading(false);
      });
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin"></div>
                <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-violet-500 animate-pulse" />
            </div>
            <div className="text-sm font-bold text-muted animate-pulse">Analyzing lab trends & correlations...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="p-3 bg-red-500/10 rounded-full text-red-500 mb-2">
                <Activity size={32} />
            </div>
            <p className="text-main font-bold">Analysis Failed</p>
            <p className="text-sm text-muted">{error}</p>
            <button 
                onClick={handleAnalysis}
                className="mt-4 px-4 py-2 bg-glass-depth border border-glass-border rounded-lg text-sm font-bold hover:bg-glass-panel"
            >
                Retry
            </button>
        </div>
      );
    }

    if (interpretation) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
             <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 mb-6">
                 <div className="flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-300 uppercase tracking-wider mb-2">
                     <Sparkles size={12} /> Analysis Context
                 </div>
                 <div className="text-sm text-main leading-relaxed">
                     Interpreting data for <span className="font-bold">{patient.name}</span> ({patient.age}{patient.gender}) with dx of <span className="font-bold">{patient.diagnosis}</span>.
                 </div>
             </div>

             <div className="whitespace-pre-wrap text-main text-sm leading-7" dangerouslySetInnerHTML={{ __html: interpretation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />

             <div className="mt-8 pt-4 border-t border-glass-border text-[10px] text-muted text-center italic">
                 Disclaimer: AI-generated content. Verify all findings with clinical judgment and primary data sources.
             </div>
        </div>
      );
    }

    // Initial state
    return (
        <div className="text-center py-12">
            <div className="p-4 bg-violet-500/10 rounded-full text-violet-500 mb-4 inline-block">
                <BrainCircuit size={40} />
            </div>
            <h3 className="text-lg font-bold text-main">Ready to Analyze Labs</h3>
            <p className="text-sm text-muted max-w-sm mx-auto mt-2 mb-6">
                The AI will review the latest lab values in the context of the patient's diagnosis and active problems to provide a clinical interpretation.
            </p>
            <button
                onClick={handleAnalysis}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-lg shadow-violet-500/30 hover:scale-105 transition-all flex items-center gap-2 mx-auto"
            >
                <Sparkles size={16} />
                Analyze Labs
            </button>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-2xl shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-glass-border bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl shadow-inner border border-violet-500/20">
                    <BrainCircuit size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-heading font-light text-main bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 tracking-wide">
                        AI Lab Interpretation
                    </h2>
                    <p className="text-xs text-muted font-medium">Powered by Gemini Clinical Reasoning</p>
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
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {renderContent()}
        </div>

      </div>
    </div>
  );
};

export default LabInterpretationModal;