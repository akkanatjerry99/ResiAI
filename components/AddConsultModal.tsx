
import React, { useState, useEffect } from 'react';
import { Consultation, ConsultStatus } from '../types';
import { X, UserPlus, Search, Check, ChevronDown, Pencil, AlertCircle, FileText, ClipboardList } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface AddConsultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (consult: Consultation) => void;
  consultToEdit?: Consultation | null;
}

const IM_SPECIALTIES = [
  "Cardiology", "Pulmonology", "Nephrology", "Infectious Disease", 
  "Gastroenterology", "Endocrinology", "Hematology/Oncology", 
  "Rheumatology", "Geriatrics", "Palliative Care", "ICU/Critical Care", "Neurology"
];

const OTHER_SPECIALTIES = [
  "General Surgery", "Orthopedics", "Neurosurgery", "Urology",
  "ENT (Otolaryngology)", "Ophthalmology", "Dermatology", "Psychiatry", 
  "Radiology (Interventional)", "Rehabilitation Medicine (PM&R)", "OB/GYN",
  "Other"
];

const AddConsultModal: React.FC<AddConsultModalProps> = ({ isOpen, onClose, onAdd, consultToEdit }) => {
  const [reason, setReason] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [status, setStatus] = useState<ConsultStatus>('Pending');
  
  // Combobox State
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState(''); 

  useEffect(() => {
    if (isOpen) {
        if (consultToEdit) {
            setReason(consultToEdit.reason);
            setRecommendations(consultToEdit.recommendations || '');
            setStatus(consultToEdit.status);
            
            // Check if the specialty is in our standard lists
            const allSpecs = [...IM_SPECIALTIES, ...OTHER_SPECIALTIES];
            
            // If it's in the list (and not literally "Other"), select it.
            // If not in list, it's a custom one -> Select "Other" and fill custom field.
            if (allSpecs.includes(consultToEdit.specialty) && consultToEdit.specialty !== 'Other') {
                setSelectedSpecialty(consultToEdit.specialty);
                setCustomSpecialty('');
            } else {
                setSelectedSpecialty('Other');
                setCustomSpecialty(consultToEdit.specialty === 'Other' ? '' : consultToEdit.specialty);
            }
        } else {
            setReason('');
            setRecommendations('');
            setStatus('Pending');
            setSelectedSpecialty('');
            setCustomSpecialty('');
        }
    }
  }, [isOpen, consultToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalSpecialty = selectedSpecialty;
    if (selectedSpecialty === 'Other') {
        if (!customSpecialty.trim()) {
            alert("Please specify the specialty.");
            return;
        }
        finalSpecialty = customSpecialty;
    }

    if (!finalSpecialty || !reason) return;

    onAdd({
        id: consultToEdit ? consultToEdit.id : Date.now().toString(),
        specialty: finalSpecialty,
        reason,
        status,
        recommendations,
        requestDate: consultToEdit ? consultToEdit.requestDate : new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-md shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-indigo-500/5 to-blue-500/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                    {consultToEdit ? <Pencil size={20}/> : <UserPlus size={20} />}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-main">{consultToEdit ? 'Update Consult' : 'New Consultation'}</h2>
                    <p className="text-xs text-muted">{consultToEdit ? 'Modify details or add recommendations' : 'Request specialist opinion'}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
            
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Specialty / Unit</label>
                <ModernSelect 
                    value={selectedSpecialty}
                    onChange={setSelectedSpecialty}
                    options={[...IM_SPECIALTIES, ...OTHER_SPECIALTIES]}
                    searchable
                    placeholder="Select Specialty..."
                />
            </div>

            {selectedSpecialty === 'Other' && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-indigo-500 uppercase ml-1">Specify Specialty</label>
                    <input 
                        value={customSpecialty}
                        onChange={(e) => setCustomSpecialty(e.target.value)}
                        placeholder="e.g. Rheumatology, Pain Clinic"
                        className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold"
                        autoFocus
                    />
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Reason for Consult</label>
                <input 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Evaluate for CAD, Management of..."
                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Current Status</label>
                <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border">
                    {['Pending', 'Active', 'Completed'].map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setStatus(s as ConsultStatus)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${status === s ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-muted hover:text-main'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-glass-border">
                <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase ml-1 flex items-center gap-1">
                    <ClipboardList size={12}/> Recommendations / Plan
                </label>
                <textarea 
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    placeholder="Enter specialist recommendations or treatment plan here..."
                    className="w-full h-32 bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none leading-relaxed"
                />
            </div>

            <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.98]"
            >
                {consultToEdit ? 'Update Consultation' : 'Request Consultation'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default AddConsultModal;
