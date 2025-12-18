
import React, { useState, useRef } from 'react';
import { MicroscopyResult } from '../types';
import { extractPBSReport } from '../services/geminiService';
import { X, Save, Microscope, Scan, ImagePlus, Camera, Trash2 } from 'lucide-react';

interface AddPBSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (pbs: MicroscopyResult) => void;
}

const AddPBSModal: React.FC<AddPBSModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rbc, setRbc] = useState('');
  const [wbc, setWbc] = useState('');
  const [plt, setPlt] = useState('');
  const [parasites, setParasites] = useState('');
  const [others, setOthers] = useState('');
  
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

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

  const handleAnalyze = async () => {
      if (images.length === 0) return;
      setIsScanning(true);
      try {
          const result = await extractPBSReport(images);
          if (result) {
              setRbc(result.rbcMorphology || '');
              setWbc(result.wbcMorphology || '');
              setPlt(result.plateletMorphology || '');
              setParasites(result.parasites || '');
              setOthers(result.others || '');
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsScanning(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onAdd({
          id: Date.now().toString(),
          date,
          rbcMorphology: rbc,
          wbcMorphology: wbc,
          plateletMorphology: plt,
          parasites,
          others,
          imageUrls: images
      });
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-lg shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-pink-500/5 to-rose-500/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                    <Microscope size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-main">Add PBS Result</h2>
                    <p className="text-xs text-muted">Peripheral Blood Smear</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
            {/* Scan Section */}
            <div className="bg-glass-depth p-4 rounded-xl border border-glass-border">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-pink-500 uppercase tracking-wider flex items-center gap-2">
                        <Scan size={14} /> Scan / Attach Image
                    </h3>
                </div>
                
                {images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-glass-border group">
                                <img src={img} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 py-2 bg-pink-500/10 text-pink-600 rounded-lg text-xs font-bold border border-pink-500/20 flex items-center justify-center gap-1"><Camera size={14}/> Camera</button>
                    <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex-1 py-2 bg-indigo-500/10 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-500/20 flex items-center justify-center gap-1"><ImagePlus size={14}/> Gallery</button>
                    {images.length > 0 && (
                        <button type="button" onClick={handleAnalyze} disabled={isScanning} className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-1">
                            {isScanning ? 'Scanning...' : 'Analyze'}
                        </button>
                    )}
                </div>
                
                <input type="file" accept="image/*" multiple ref={galleryInputRef} className="hidden" onChange={handleFileSelect}/>
                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileSelect}/>
            </div>

            <form id="pbs-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Collection Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none focus:ring-2 focus:ring-pink-500/30"/>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">RBC Morphology</label>
                    <textarea value={rbc} onChange={e => setRbc(e.target.value)} placeholder="Normochromic, Normocytic..." className="w-full h-16 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main outline-none resize-none focus:ring-1 focus:ring-pink-500/30"/>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">WBC Morphology</label>
                    <textarea value={wbc} onChange={e => setWbc(e.target.value)} placeholder="Normal maturation..." className="w-full h-16 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main outline-none resize-none focus:ring-1 focus:ring-pink-500/30"/>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Platelets</label>
                    <textarea value={plt} onChange={e => setPlt(e.target.value)} placeholder="Adequate, no clumping..." className="w-full h-16 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main outline-none resize-none focus:ring-1 focus:ring-pink-500/30"/>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Parasites / Others</label>
                    <input value={parasites} onChange={e => setParasites(e.target.value)} placeholder="No malaria parasites found" className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none focus:ring-2 focus:ring-pink-500/30"/>
                </div>
            </form>
        </div>

        <div className="p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-end gap-3">
             <button onClick={onClose} className="px-6 py-2 rounded-xl text-muted font-medium hover:bg-glass-depth transition-colors">Cancel</button>
             <button type="submit" form="pbs-form" className="px-6 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-lg shadow-pink-500/30 flex items-center gap-2">
                 <Save size={18} /> Save PBS
             </button>
        </div>
      </div>
    </div>
  );
};

export default AddPBSModal;
