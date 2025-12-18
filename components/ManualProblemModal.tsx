
import React, { useState, useEffect } from 'react';
import { ProblemEntry } from '../types';
import { X, Save, AlertCircle, FileText, Activity } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface ManualProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (problem: ProblemEntry) => void;
  initialData?: ProblemEntry;
}

const ManualProblemModal: React.FC<ManualProblemModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [problem, setProblem] = useState('');
  const [status, setStatus] = useState<'Active' | 'Improved' | 'Stable' | 'Worsening' | 'Resolved'>('Active');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setProblem(initialData.problem);
        setStatus(initialData.status || 'Active');
        setPlan(initialData.plan);
      } else {
        setProblem('');
        setStatus('Active');
        setPlan('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      problem,
      status,
      plan
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-md shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-red-500/5 to-orange-500/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-main">{initialData ? 'Edit Problem' : 'Add Problem'}</h2>
                    <p className="text-xs text-muted">Manage clinical problem list</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Problem / Diagnosis</label>
                <input 
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="e.g. Acute Kidney Injury"
                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main outline-none focus:ring-2 focus:ring-red-500/30 font-medium"
                    autoFocus={!initialData}
                    required
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Clinical Status</label>
                <ModernSelect 
                    value={status}
                    onChange={(v) => setStatus(v as any)}
                    options={['Active', 'Stable', 'Improved', 'Worsening', 'Resolved']}
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Plan / Assessment</label>
                <textarea 
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="e.g. Monitor Urine Output, Avoid nephrotoxins..."
                    className="w-full h-32 bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main outline-none focus:ring-2 focus:ring-red-500/30 resize-none leading-relaxed text-sm"
                />
            </div>

            <button 
                type="submit"
                disabled={!problem}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <Save size={18} /> {initialData ? 'Update Problem' : 'Add Problem'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ManualProblemModal;
