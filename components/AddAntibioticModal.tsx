
import React, { useState, useEffect } from 'react';
import { Antibiotic } from '../types';
import { X, Pill, Calendar, Clock, Activity, Save, Plus, Minus, StopCircle, Pencil, AlertCircle } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';
import { MEDICATION_DATABASE, STANDARD_ANTIBIOTIC_DOSES } from '../constants';

interface AddAntibioticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (abx: Antibiotic) => void;
  antibioticToEdit?: Antibiotic | null;
}

// Robust checker for antibiotics/antimicrobials
const isLikelyAntibiotic = (name: string) => {
    const n = name.toLowerCase();
    const keywords = [
        // Classes / Suffixes
        'cillin', 'cef', 'ceph', 'penem', 'floxacin', 'mycin', 'micin', 'cyclin', 
        'zole', 'trim', 'sulfa', 'vanco', 'metro', 'nitro', 'colistin', 'doxy', 
        'clav', 'dapto', 'linezolid', 'clinda', 'fosfo', 'aztreonam', 'rifamp',
        'isoniazid', 'ethambutol', 'pyrazinamide', 'acyclovir', 'ganciclovir', 
        'oseltamivir', 'fungin', 'vir', 'mox', 'pristina', 'chloramphenicol',
        // Brands
        'augmentin', 'unasyn', 'zosyn', 'tazocin', 'rocephin', 'fortum', 'maxipime',
        'meronem', 'invanz', 'tienam', 'zyvox', 'cubicin', 'tygacil', 'flagyl',
        'bactrim', 'septra', 'diflucan', 'vfend', 'tamiflu', 'targocid', 'keflex',
        'omnicef', 'cipro', 'levaquin', 'avelox', 'zithromax', 'klacid', 'vibramycin'
    ];
    return keywords.some(k => n.includes(k));
};

const COMMON_ANTIBIOTICS = MEDICATION_DATABASE.filter(m => isLikelyAntibiotic(m));

const AddAntibioticModal: React.FC<AddAntibioticModalProps> = ({ isOpen, onClose, onAdd, antibioticToEdit }) => {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('7');
  const [indication, setIndication] = useState('');
  const [error, setError] = useState('');
  
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
      if (isOpen) {
          if (antibioticToEdit) {
              setName(antibioticToEdit.name);
              setDose(antibioticToEdit.dose);
              setStartDate(antibioticToEdit.startDate);
              setDuration(antibioticToEdit.plannedDuration.toString());
              setIndication(antibioticToEdit.indication);
              updateSuggestions(antibioticToEdit.name);
          } else {
              // Reset
              setName(''); setDose(''); setIndication(''); setDuration('7');
              setStartDate(new Date().toISOString().split('T')[0]);
              setSuggestions([]);
          }
          setError('');
      }
  }, [isOpen, antibioticToEdit]);

  const updateSuggestions = (medName: string) => {
      const key = Object.keys(STANDARD_ANTIBIOTIC_DOSES).find(k => medName.includes(k));
      if (key) {
          setSuggestions(STANDARD_ANTIBIOTIC_DOSES[key]);
      } else {
          setSuggestions([]);
      }
  };

  const handleNameChange = (val: string) => {
      setName(val);
      setError('');
      updateSuggestions(val);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dose) return;

    // Validation: Check if it's an antibiotic
    if (!isLikelyAntibiotic(name)) {
        setError(`"${name}" does not appear to be a known antibiotic or antimicrobial. Please check the name.`);
        return;
    }

    const newAbx: Antibiotic = {
        id: antibioticToEdit ? antibioticToEdit.id : Date.now().toString(),
        name,
        dose,
        startDate,
        plannedDuration: Number(duration),
        indication,
        endDate: new Date(new Date(startDate).getTime() + (Number(duration) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    };

    onAdd(newAbx);
    onClose();
  };

  const adjustDuration = (days: number) => {
      const current = Number(duration) || 0;
      const newVal = Math.max(1, current + days);
      setDuration(newVal.toString());
  };

  const stopToday = () => {
      const start = new Date(startDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Minimum 1 day
      setDuration(Math.max(1, diffDays).toString());
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-md shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden">
        
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-blue-500/5 to-cyan-500/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    {antibioticToEdit ? <Pencil size={20} /> : <Pill size={20} />}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-main">{antibioticToEdit ? 'Edit Antibiotic' : 'Add Antibiotic'}</h2>
                    <p className="text-xs text-muted">{antibioticToEdit ? 'Modify order details' : 'Infection control tracking'}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Antibiotic Name</label>
                <ModernSelect 
                    value={name}
                    onChange={handleNameChange}
                    options={COMMON_ANTIBIOTICS}
                    searchable={true}
                    placeholder="Select antibiotic..."
                />
                {error && (
                    <div className="flex items-center gap-2 text-[10px] text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20 mt-1">
                        <AlertCircle size={12} className="shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase ml-1">Dose & Freq</label>
                
                {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-1">
                        {suggestions.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setDose(s)}
                                className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${dose === s ? 'bg-blue-500 text-white border-blue-500' : 'bg-glass-depth text-main border-glass-border hover:bg-glass-panel'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <input 
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="e.g. 1g IV q8h"
                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Start Date</label>
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Duration (Days)</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-20 bg-glass-depth border border-glass-border rounded-xl px-2 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30 text-center font-bold"
                        />
                        <div className="flex gap-1">
                            <button type="button" onClick={() => adjustDuration(-1)} className="p-2 bg-glass-depth rounded-lg text-muted hover:text-red-500"><Minus size={14}/></button>
                            <button type="button" onClick={() => adjustDuration(1)} className="p-2 bg-glass-depth rounded-lg text-muted hover:text-green-500"><Plus size={14}/></button>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => adjustDuration(3)} className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-1 rounded border border-blue-500/20">+3d</button>
                        <button type="button" onClick={() => adjustDuration(7)} className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-1 rounded border border-blue-500/20">+1wk</button>
                        <button type="button" onClick={stopToday} className="text-[10px] bg-red-500/10 text-red-600 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1"><StopCircle size={10}/> Stop Today</button>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Indication</label>
                <input 
                    value={indication}
                    onChange={(e) => setIndication(e.target.value)}
                    placeholder="e.g. HAP, UTI"
                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"
                />
            </div>

            <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
                <Save size={18} /> {antibioticToEdit ? 'Update Order' : 'Save Order'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default AddAntibioticModal;
