import React, { useState, useEffect, useRef } from 'react';
import { CultureResult, Sensitivity } from '../types';
import { X, Bug, Save, Calendar, FileText, Activity, FlaskConical, ImagePlus, Trash2, Camera, Plus, Minus } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface EditCultureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (culture: CultureResult) => void;
  initialData?: CultureResult;
}

const CULTURE_TYPES = [
  "Hemoculture (Blood)",
  "Urine Culture",
  "Sputum Culture (C/S)",
  "Stool Culture",
  "Wound Swab",
  "Pus Swab",
  "CSF Culture",
  "Pleural Fluid",
  "Ascitic Fluid",
  "Synovial Fluid",
  "Peritoneal Fluid",
  "Bronchial Wash / BAL",
  "Throat Swab",
  "Nasopharyngeal Swab",
  "Rectal Swab",
  "Catheter Tip",
  "Tissue Biopsy",
  "Eye Swab",
  "Ear Swab",
  "HVS / Genital Swab",
  "Body Fluid (Other)",
  "Fungal Culture",
  "AFB Stain / Culture",
  "Endotracheal Aspirate",
  "Bone Marrow Culture",
  "Pericardial Fluid"
];

const EditCultureModal: React.FC<EditCultureModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [specimen, setSpecimen] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Pending' | 'Prelim' | 'Final'>('Pending');
  const [organism, setOrganism] = useState('');
  const [gramStain, setGramStain] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  // Sensitivity State
  const [sensitivities, setSensitivities] = useState<Sensitivity[]>([]);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSpecimen(initialData.specimen);
        setSource(initialData.collectionSource || '');
        setDate(initialData.collectionDate);
        setStatus(initialData.status);
        setOrganism(initialData.organism || '');
        setGramStain(initialData.gramStain || '');
        setNotes(initialData.notes || '');
        setImages(initialData.imageUrls || []);
        setSensitivities(initialData.sensitivity || []);
      } else {
        setSpecimen('Hemoculture (Blood)');
        setSource('');
        setDate(new Date().toISOString().split('T')[0]);
        setStatus('Pending');
        setOrganism('');
        setGramStain('');
        setNotes('');
        setImages([]);
        setSensitivities([]);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newImagesPromises = Array.from(files).map((file: File) => {
          return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(file);
          });
      });

      const newImages = await Promise.all(newImagesPromises);
      setImages(prev => [...prev, ...newImages]);
      if (event.target) event.target.value = '';
  };

  const handleAddSensitivity = () => {
      setSensitivities([...sensitivities, { antibiotic: '', interpretation: 'S' }]);
  };

  const updateSensitivity = (index: number, field: keyof Sensitivity, value: any) => {
      const newSens = [...sensitivities];
      newSens[index] = { ...newSens[index], [field]: value };
      setSensitivities(newSens);
  };

  const removeSensitivity = (index: number) => {
      setSensitivities(sensitivities.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCulture: CultureResult = {
      id: initialData ? initialData.id : Date.now().toString(),
      specimen,
      collectionSource: source,
      collectionDate: date,
      status,
      organism,
      gramStain,
      notes,
      imageUrls: images,
      sensitivity: sensitivities,
      tttp: initialData?.tttp
    };
    onSave(newCulture);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-md shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-orange-500/5 to-red-500/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                    <Bug size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-main">{initialData ? 'Edit Culture' : 'Add Culture'}</h2>
                    <p className="text-xs text-muted">Microbiology Report Details</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Specimen</label>
                <ModernSelect 
                    value={specimen} 
                    onChange={setSpecimen} 
                    options={CULTURE_TYPES} 
                    searchable 
                    placeholder="Select Specimen" 
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Date Collected</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-orange-500/30" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Status</label>
                    <ModernSelect 
                        value={status} 
                        onChange={(v) => setStatus(v as any)} 
                        options={['Pending', 'Prelim', 'Final']} 
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Source / Site</label>
                <input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Left Arm, Foley Catheter" className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-orange-500/30" />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Gram Stain</label>
                <input value={gramStain} onChange={e => setGramStain(e.target.value)} placeholder="e.g. GNR, GPC in clusters" className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-orange-500/30" />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Organism</label>
                <input value={organism} onChange={e => setOrganism(e.target.value)} placeholder="e.g. E. Coli, S. Aureus" className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main font-bold outline-none focus:ring-2 focus:ring-orange-500/30" />
            </div>

            <div className="bg-glass-depth p-3 rounded-xl border border-glass-border">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-muted uppercase">Sensitivities</label>
                    <button type="button" onClick={handleAddSensitivity} className="text-[10px] bg-orange-500/10 text-orange-600 px-2 py-1 rounded hover:bg-orange-500/20 font-bold flex items-center gap-1">
                        <Plus size={10} /> Add Abx
                    </button>
                </div>
                <div className="space-y-2">
                    {sensitivities.map((s, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input 
                                placeholder="Antibiotic" 
                                value={s.antibiotic} 
                                onChange={e => updateSensitivity(idx, 'antibiotic', e.target.value)} 
                                className="flex-1 bg-glass-panel border border-glass-border rounded-lg px-2 py-1 text-xs text-main outline-none"
                            />
                            <select 
                                value={s.interpretation} 
                                onChange={e => updateSensitivity(idx, 'interpretation', e.target.value)} 
                                className="bg-glass-panel border border-glass-border rounded-lg px-2 py-1 text-xs text-main outline-none"
                            >
                                <option value="S">S</option>
                                <option value="I">I</option>
                                <option value="R">R</option>
                            </select>
                            <button type="button" onClick={() => removeSensitivity(idx)} className="p-1 text-muted hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                    ))}
                    {sensitivities.length === 0 && <div className="text-center text-xs text-muted italic">No data</div>}
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Notes / Comments</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details..." className="w-full h-16 bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-orange-500/30 resize-none" />
            </div>

            {/* Image Attachments */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase ml-1 flex items-center gap-1"><ImagePlus size={12}/> Attachments</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-glass-border group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                        </div>
                    ))}
                    <button type="button" onClick={() => galleryInputRef.current?.click()} className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-glass-border flex flex-col items-center justify-center text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all">
                        <Plus size={16} />
                    </button>
                </div>
                <input type="file" accept="image/*" multiple ref={galleryInputRef} className="hidden" onChange={handleFileSelect}/>
            </div>
        </div>

        <div className="p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-end gap-3 shrink-0">
             <button onClick={onClose} className="px-6 py-2 rounded-xl text-muted font-medium hover:bg-glass-depth transition-colors">Cancel</button>
             <button onClick={handleSubmit} className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/30 flex items-center gap-2">
                 <Save size={18} /> Save
             </button>
        </div>
      </div>
    </div>
  );
};

export default EditCultureModal;