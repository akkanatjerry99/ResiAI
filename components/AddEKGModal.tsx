
import React, { useState, useRef, useEffect } from 'react';
import { EKG } from '../types';
import { interpretEKG } from '../services/geminiService';
import { X, Save, Activity, Scan, ImagePlus, Camera, Trash2, HeartPulse, History, Calendar, Clock, Hash, Pencil } from 'lucide-react';

interface AddEKGModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ekg: EKG) => void;
  ekgToEdit?: EKG | null;
  previousEKG?: EKG; // Pass the most recent EKG for comparison context
}

const AddEKGModal: React.FC<AddEKGModalProps> = ({ isOpen, onClose, onSave, ekgToEdit, previousEKG }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [hn, setHn] = useState('');
  
  const [rate, setRate] = useState('');
  const [rhythm, setRhythm] = useState('');
  const [axis, setAxis] = useState('');
  const [pr, setPr] = useState('');
  const [qrs, setQrs] = useState('');
  const [qtc, setQtc] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [comparison, setComparison] = useState('');

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
      if (isOpen) {
          if (ekgToEdit) {
              try {
                  const d = new Date(ekgToEdit.date.includes('T') ? ekgToEdit.date : ekgToEdit.date.replace(' ', 'T'));
                  if(!isNaN(d.getTime())) {
                      setDate(d.toISOString().split('T')[0]);
                      setTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                  }
              } catch (e) {
                  console.error("Date parse error", e);
                  setDate(new Date().toISOString().split('T')[0]);
              }
              setHn(ekgToEdit.hn || '');
              setRate(ekgToEdit.rate || '');
              setRhythm(ekgToEdit.rhythm || '');
              setAxis(ekgToEdit.axis || '');
              setPr(ekgToEdit.intervals?.pr || '');
              setQrs(ekgToEdit.intervals?.qrs || '');
              setQtc(ekgToEdit.intervals?.qtc || '');
              setFindings(ekgToEdit.findings || '');
              setImpression(ekgToEdit.impression || '');
              setComparison(ekgToEdit.comparison || '');
              setImages(ekgToEdit.imageUrls || []);
          } else {
              // Reset for new entry
              setDate(new Date().toISOString().split('T')[0]);
              setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
              setHn('');
              setRate('');
              setRhythm('');
              setAxis('');
              setPr('');
              setQrs('');
              setQtc('');
              setFindings('');
              setImpression('');
              setComparison('');
              setImages([]);
          }
      }
  }, [isOpen, ekgToEdit]);

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
      
      const prevContext = previousEKG ? `Previous EKG from ${previousEKG.date}: ${previousEKG.impression}. Rate: ${previousEKG.rate}. Rhythm: ${previousEKG.rhythm}.` : undefined;

      try {
          const result = await interpretEKG(images, prevContext);
          if (result) {
              setRate(result.rate || '');
              setRhythm(result.rhythm || '');
              setAxis(result.axis || '');
              if (result.intervals) {
                  setPr(result.intervals.pr || '');
                  setQrs(result.intervals.qrs || '');
                  setQtc(result.intervals.qtc || '');
              }
              setFindings(result.findings || '');
              setImpression(result.impression || '');
              setComparison(result.comparison || '');
              
              // Metadata from AI - Validating formats before setting
              if (result.date && /^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
                  setDate(result.date);
              }
              // Cast result to any to access 'time' property which might be returned by AI but isn't in EKG interface
              const resultAny = result as any;
              if (resultAny.time && /^\d{2}:\d{2}$/.test(resultAny.time)) {
                  setTime(resultAny.time);
              }
              if (result.hn) setHn(result.hn);
          }
      } catch (e) {
          console.error(e);
          alert("Failed to analyze EKG.");
      } finally {
          setIsScanning(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const finalDate = `${date}T${time}:00`;
      onSave({
          id: ekgToEdit ? ekgToEdit.id : Date.now().toString(),
          date: finalDate,
          hn,
          rate,
          rhythm,
          axis,
          intervals: { pr, qrs, qtc },
          findings,
          impression,
          comparison,
          imageUrls: images
      });
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-lg shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-red-500/5 to-rose-500/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                    {ekgToEdit ? <Pencil size={20}/> : <HeartPulse size={20} />}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-main">{ekgToEdit ? 'Edit EKG' : 'Add EKG'}</h2>
                    <p className="text-xs text-muted">{ekgToEdit ? 'Update details' : 'Scan & Interpret'}</p>
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
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                        <Scan size={14} /> Scan EKG Strip
                    </h3>
                </div>
                
                {images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-glass-border group">
                                <img src={img} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 py-2 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold border border-red-500/20 flex items-center justify-center gap-1"><Camera size={14}/> Camera</button>
                    <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex-1 py-2 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold border border-red-500/20 flex items-center justify-center gap-1"><ImagePlus size={14}/> Gallery</button>
                    {images.length > 0 && (
                        <button type="button" onClick={handleAnalyze} disabled={isScanning} className="flex-1 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-1">
                            {isScanning ? 'Reading...' : 'AI Interpret'}
                        </button>
                    )}
                </div>
                
                <input type="file" accept="image/*" multiple ref={galleryInputRef} className="hidden" onChange={handleFileSelect}/>
                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileSelect}/>
                
                {previousEKG && !ekgToEdit && (
                    <div className="mt-2 text-[10px] text-muted flex items-center gap-1">
                        <History size={10} /> Comparison enabled with EKG from {new Date(previousEKG.date).toLocaleDateString()}
                    </div>
                )}
            </div>

            <form id="ekg-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                    <div className="text-[10px] font-bold text-red-600 uppercase mb-2">Metadata</div>
                    <div className="flex gap-3 mb-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-bold text-muted flex items-center gap-1"><Calendar size={9}/> Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-lg px-2 py-1.5 text-xs text-main outline-none"/>
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-bold text-muted flex items-center gap-1"><Clock size={9}/> Time</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-lg px-2 py-1.5 text-xs text-main outline-none"/>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted flex items-center gap-1"><Hash size={9}/> Patient HN</label>
                        <input value={hn} onChange={e => setHn(e.target.value)} placeholder="Extracted HN" className="w-full bg-glass-depth border border-glass-border rounded-lg px-2 py-1.5 text-xs text-main outline-none"/>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">Rate</label>
                        <input value={rate} onChange={e => setRate(e.target.value)} placeholder="bpm" className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none"/>
                    </div>
                    <div className="flex-[2] space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">Rhythm</label>
                        <input value={rhythm} onChange={e => setRhythm(e.target.value)} placeholder="Sinus..." className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none"/>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">Axis</label>
                        <input value={axis} onChange={e => setAxis(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-2 py-2 text-sm text-center outline-none"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">PR</label>
                        <input value={pr} onChange={e => setPr(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-2 py-2 text-sm text-center outline-none"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">QRS</label>
                        <input value={qrs} onChange={e => setQrs(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-2 py-2 text-sm text-center outline-none"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">QTc</label>
                        <input value={qtc} onChange={e => setQtc(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-2 py-2 text-sm text-center outline-none"/>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Findings</label>
                    <textarea value={findings} onChange={e => setFindings(e.target.value)} placeholder="ST elevations, T wave changes, etc." className="w-full h-16 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main outline-none resize-none"/>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-red-500 uppercase ml-1">Impression</label>
                    <input value={impression} onChange={e => setImpression(e.target.value)} placeholder="e.g. Acute Inferior MI" className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main font-bold outline-none"/>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Comparison</label>
                    <input value={comparison} onChange={e => setComparison(e.target.value)} placeholder="No change from previous..." className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none"/>
                </div>
            </form>
        </div>

        <div className="p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md flex justify-end gap-3">
             <button onClick={onClose} className="px-6 py-2 rounded-xl text-muted font-medium hover:bg-glass-depth transition-colors">Cancel</button>
             <button type="submit" form="ekg-form" className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/30 flex items-center gap-2">
                 <Save size={18} /> {ekgToEdit ? 'Update EKG' : 'Save EKG'}
             </button>
        </div>
      </div>
    </div>
  );
};

export default AddEKGModal;
