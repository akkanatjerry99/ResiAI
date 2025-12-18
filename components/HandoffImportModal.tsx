import React, { useState } from 'react';
import { X, Sparkles, FileText, Check, AlertCircle, ArrowRight, Loader2, Save } from 'lucide-react';
import { parseBulkHandoffText } from '../services/geminiService';
import { Patient, Handoff, Acuity } from '../types';

interface HandoffImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onImport: (updates: { patientId: string, handoff: Partial<Handoff>, acuity?: Acuity }[]) => void;
}

const HandoffImportModal: React.FC<HandoffImportModalProps> = ({ isOpen, onClose, patients, onImport }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const results = await parseBulkHandoffText(text);
      
      // Match with existing patients
      const matchedResults = results.map(res => {
        const match = patients.find(p => 
            p.roomNumber === res.roomNumber || 
            p.name.toLowerCase().includes(res.name.toLowerCase()) ||
            res.name.toLowerCase().includes(p.name.toLowerCase())
        );
        return {
            ...res,
            matchedPatient: match
        };
      });

      setParsedData(matchedResults);
      setStep('review');
    } catch (e) {
      console.error(e);
      alert("Failed to process text. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    const updates = parsedData
        .filter(item => item.matchedPatient)
        .map(item => ({
            patientId: item.matchedPatient.id,
            handoff: item.update,
            acuity: item.acuity
        }));
    
    onImport(updates);
    handleClose();
  };

  const handleClose = () => {
      setText('');
      setParsedData([]);
      setStep('input');
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-2xl shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-glass-border bg-gradient-to-r from-violet-500/10 to-indigo-500/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl shadow-inner border border-violet-500/20">
                    <Sparkles size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-main">AI Handoff Generator</h2>
                    <p className="text-xs text-muted font-medium">Parse raw text from messengers (I-PASS)</p>
                </div>
            </div>
            <button 
                onClick={handleClose} 
                className="p-2 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-glass-depth/30">
            {step === 'input' ? (
                <div className="space-y-4">
                    <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex gap-3">
                        <FileText className="text-blue-500 shrink-0 mt-1" size={20} />
                        <div>
                            <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300">Paste Handoff Text</h3>
                            <p className="text-xs text-blue-600/80 dark:text-blue-300/80 leading-relaxed mt-1">
                                Paste the raw text from your group chat (e.g., LINE, WhatsApp). The AI will identify patients by room number or name and structure the data into I-PASS format.
                            </p>
                        </div>
                    </div>
                    <textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste text here... (e.g., '501 Chaleaw: ...')"
                        className="w-full h-64 bg-glass-panel border border-glass-border rounded-2xl p-4 text-sm text-main outline-none focus:ring-2 focus:ring-violet-500/30 resize-none font-mono"
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Preview Changes</h3>
                        <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-1 rounded-lg border border-violet-200 dark:border-violet-800">
                            {parsedData.filter(d => d.matchedPatient).length} Matched / {parsedData.length} Found
                        </span>
                    </div>
                    
                    <div className="space-y-3">
                        {parsedData.map((item, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl border ${item.matchedPatient ? 'bg-glass-panel border-glass-border' : 'bg-red-500/5 border-red-500/20 opacity-70'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        {item.matchedPatient ? (
                                            <div className="flex items-center gap-2">
                                                <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded text-xs font-bold border border-green-500/20">Matched</span>
                                                <span className="font-bold text-main">{item.matchedPatient.name} (Rm {item.matchedPatient.roomNumber})</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="bg-red-500/10 text-red-600 px-2 py-0.5 rounded text-xs font-bold border border-red-500/20">No Match</span>
                                                <span className="font-bold text-main text-sm">Rm {item.roomNumber} - {item.name}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.acuity === 'Unstable' ? 'bg-red-500 text-white' : item.acuity === 'Watch' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                                        {item.acuity || 'Stable'}
                                    </div>
                                </div>
                                
                                {item.matchedPatient && (
                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                        <div className="bg-glass-depth p-2 rounded-lg">
                                            <span className="font-bold text-violet-500 block mb-1">Summary</span>
                                            <p className="text-main leading-relaxed">{item.update.patientSummary}</p>
                                        </div>
                                        {item.update.actionList && (
                                            <div className="bg-glass-depth p-2 rounded-lg">
                                                <span className="font-bold text-blue-500 block mb-1">Actions</span>
                                                <p className="text-main leading-relaxed">{item.update.actionList}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-end gap-3 shrink-0">
            {step === 'input' ? (
                <>
                    <button onClick={handleClose} className="px-6 py-2 rounded-xl text-muted font-medium hover:bg-glass-depth transition-colors">Cancel</button>
                    <button 
                        onClick={handleProcess} 
                        disabled={isProcessing || !text.trim()}
                        className="px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                        Process Text
                    </button>
                </>
            ) : (
                <>
                    <button onClick={() => setStep('input')} className="px-6 py-2 rounded-xl text-muted font-medium hover:bg-glass-depth transition-colors">Back</button>
                    <button 
                        onClick={handleConfirm}
                        className="px-6 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-500/30 flex items-center gap-2 transition-all"
                    >
                        <Save size={18}/>
                        Confirm Updates
                    </button>
                </>
            )}
        </div>

      </div>
    </div>
  );
};

export default HandoffImportModal;