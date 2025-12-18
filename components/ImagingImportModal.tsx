
import React, { useState, useRef, useEffect } from 'react';
import { extractImagingReport, interpretRadiologyImage, readFileAsBase64 } from '../services/geminiService';
import { ImagingStudy } from '../types';
import { X, Camera, Scan, Trash2, ImagePlus, Image as ImageIcon, FileText, Sparkles, AlertTriangle, Calendar, Clock, Save, ArrowLeft, CheckCircle2, RefreshCw, PlayCircle } from 'lucide-react';

interface ImagingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (study: ImagingStudy) => void;
  comparisonContext?: string;
}

const ImagingImportModal: React.FC<ImagingImportModalProps> = ({ isOpen, onClose, onScanComplete, comparisonContext }) => {
  const [mode, setMode] = useState<'report' | 'image'>('image');
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  
  // Form State
  const [modality, setModality] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [impression, setImpression] = useState('');
  const [findings, setFindings] = useState('');
  const [extractedMeta, setExtractedMeta] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  // Reset when opened
  useEffect(() => {
      if (isOpen) {
          setStep('upload');
          setPendingImages([]);
          setModality('');
          setBodyPart('');
          setImpression('');
          setFindings('');
          setExtractedMeta(false);
          // Default to now
          setToNow();
      }
  }, [isOpen]);

  const setToNow = () => {
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  };

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newImagesPromises = Array.from(files).map((file: File) => {
          // If video, read raw. If image, could compress but for now read raw to keep quality/simplicity consistent with video logic here
          return readFileAsBase64(file);
      });

      const newImages = await Promise.all(newImagesPromises);
      setPendingImages(prev => [...prev, ...newImages]);
      
      if (event.target) event.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
      setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
      if (pendingImages.length === 0) return;

      setIsScanning(true);
      setScanStatus(mode === 'image' ? 'Analyzing media & extracting date/time...' : 'Extracting report details...');

      try {
        let result: any = null;
        if (mode === 'image') {
            result = await interpretRadiologyImage(pendingImages, comparisonContext);
        } else {
            result = await extractImagingReport(pendingImages);
        }

        if (result) {
            setModality(result.modality || 'X-Ray');
            setBodyPart(result.bodyPart || '');
            setImpression(result.impression || '');
            setFindings(result.findings || '');
            
            // Handle Date/Time from AI if available
            let foundMeta = false;
            if (result.date && result.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                setDate(result.date);
                foundMeta = true;
            }
            if (result.time && result.time.match(/^\d{2}:\d{2}$/)) {
                setTime(result.time);
                foundMeta = true;
            }
            setExtractedMeta(foundMeta);

            setStep('review');
        } else {
            alert('Could not interpret imaging data.');
        }
      } catch (error) {
        console.error(error);
        alert('Error during analysis.');
      } finally {
        setIsScanning(false);
        setScanStatus('');
      }
  };

  const handleSave = () => {
      const fullDate = `${date}T${time || '00:00'}:00`;
      
      const study: ImagingStudy = {
          id: Date.now().toString(),
          modality,
          bodyPart,
          date: fullDate,
          impression,
          findings,
          imageUrls: pendingImages
      };

      onScanComplete(study);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      
      {isScanning && (
          <div className="absolute inset-0 z-[170] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
              <Sparkles size={48} className="text-purple-500 animate-pulse" />
              <div className="text-white font-bold mt-4 text-lg">AI Radiologist Working...</div>
              <div className="text-white/70 text-sm">{scanStatus}</div>
          </div>
      )}

      <div className={`bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-lg shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-300 ${step === 'review' ? 'h-[90vh]' : 'h-auto'}`}>
         
         {/* Header */}
         <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-purple-500/5 to-indigo-500/5 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2">
                 <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                     <ImageIcon size={20} />
                 </div>
                 <div>
                     <h2 className="text-lg font-bold text-main">Add Imaging</h2>
                     <p className="text-xs text-muted">{step === 'upload' ? 'Upload & Interpret' : 'Review & Confirm'}</p>
                 </div>
             </div>
             <button onClick={onClose} className="p-1 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
             </button>
         </div>

         {/* UPLOAD STEP */}
         {step === 'upload' && (
             <div className="p-6 space-y-4">
                 {comparisonContext && (
                     <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-xs text-main flex items-start gap-2">
                         <AlertTriangle size={14} className="text-purple-500 shrink-0 mt-0.5" />
                         <div>
                             <span className="font-bold text-purple-600 dark:text-purple-300">Comparison Mode:</span> AI will compare findings with previous study.
                         </div>
                     </div>
                 )}

                 <div className="flex gap-2 mb-4 bg-glass-depth p-1 rounded-xl border border-glass-border">
                     <button 
                        onClick={() => setMode('image')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'image' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-muted hover:text-main'}`}
                     >
                         <ImageIcon size={14}/> Image / Video
                     </button>
                     <button 
                        onClick={() => setMode('report')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'report' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-muted hover:text-main'}`}
                     >
                         <FileText size={14}/> Report Text
                     </button>
                 </div>

                 {/* Hidden Inputs */}
                 <input type="file" accept="image/*,video/*" multiple ref={galleryInputRef} className="hidden" onChange={handleFileSelect}/>
                 <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleFileSelect}/>

                 <div className="space-y-4">
                     {pendingImages.length > 0 ? (
                         <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                             {pendingImages.map((img, idx) => (
                                 <div key={idx} className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-glass-border group bg-black/10 flex items-center justify-center">
                                     {img.startsWith('data:video') ? (
                                         <PlayCircle size={32} className="text-white/80"/>
                                     ) : (
                                         <img src={img} alt={`scan-${idx}`} className="w-full h-full object-cover" />
                                     )}
                                     <button
                                        type="button"
                                        onClick={() => handleRemoveImage(idx)}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                     >
                                         <Trash2 size={20} />
                                     </button>
                                 </div>
                             ))}
                             <button 
                                onClick={() => galleryInputRef.current?.click()}
                                className="shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-glass-border flex flex-col items-center justify-center text-muted hover:text-main hover:border-purple-500/50 transition-all"
                             >
                                 <ImagePlus size={20} />
                                 <span className="text-[10px] font-bold mt-1">Add Media</span>
                             </button>
                         </div>
                     ) : (
                         <div className="h-32 rounded-2xl border-2 border-dashed border-glass-border flex flex-col items-center justify-center text-muted bg-glass-depth">
                             <ImagePlus size={32} className="mb-2 opacity-50" />
                             <span className="text-sm">No media selected</span>
                         </div>
                     )}

                     <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => cameraInputRef.current?.click()} className="py-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2">
                             <Camera size={18} /> Camera
                         </button>
                         <button onClick={() => galleryInputRef.current?.click()} className="py-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2">
                             <ImagePlus size={18} /> Gallery
                         </button>
                     </div>

                     <button
                        disabled={pendingImages.length === 0}
                        onClick={handleAnalyze}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                         <Sparkles size={18} />
                         {mode === 'image' ? 'Analyze Image/Video' : 'Process Report'}
                     </button>
                 </div>
             </div>
         )}

         {/* REVIEW STEP */}
         {step === 'review' && (
             <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4">
                 <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                     
                     <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/10 relative overflow-hidden">
                         {extractedMeta && (
                             <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] px-2 py-0.5 rounded-bl-lg font-bold flex items-center gap-1">
                                 <CheckCircle2 size={10} /> Auto-Extracted
                             </div>
                         )}
                         <div className="flex justify-between items-center mb-3">
                             <div className="text-xs font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1">
                                 <Calendar size={14} /> Study Metadata
                             </div>
                             <button onClick={setToNow} className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded-lg border border-purple-500/20 hover:bg-purple-500/20 flex items-center gap-1 font-bold">
                                 <RefreshCw size={10} /> Set to Now
                             </button>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                 <label className="text-[10px] font-bold text-muted uppercase ml-1">Date</label>
                                 <input 
                                    type="date" 
                                    value={date} 
                                    onChange={e => setDate(e.target.value)} 
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none focus:ring-2 focus:ring-purple-500/30"
                                 />
                             </div>
                             <div className="space-y-1">
                                 <label className="text-[10px] font-bold text-muted uppercase ml-1">Time</label>
                                 <input 
                                    type="time" 
                                    value={time} 
                                    onChange={e => setTime(e.target.value)} 
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none focus:ring-2 focus:ring-purple-500/30"
                                 />
                             </div>
                         </div>
                     </div>

                     {pendingImages.length > 0 && pendingImages[0].startsWith('data:video') && (
                         <div className="w-full rounded-xl overflow-hidden bg-black aspect-video border border-glass-border">
                             <video controls className="w-full h-full object-contain">
                                 <source src={pendingImages[0]} type="video/mp4"/>
                                 Your browser does not support the video tag.
                             </video>
                         </div>
                     )}

                     <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                             <label className="text-xs font-bold text-muted uppercase ml-1">Modality</label>
                             <input 
                                value={modality} 
                                onChange={e => setModality(e.target.value)} 
                                placeholder="e.g. CXR, CT Chest"
                                className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-purple-500/30 font-bold"
                             />
                         </div>
                         <div className="space-y-1">
                             <label className="text-xs font-bold text-muted uppercase ml-1">Body Part</label>
                             <input 
                                value={bodyPart} 
                                onChange={e => setBodyPart(e.target.value)} 
                                placeholder="e.g. Chest, Abdomen"
                                className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-purple-500/30"
                             />
                         </div>
                     </div>

                     <div className="space-y-1">
                         <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase ml-1 flex items-center gap-1"><Sparkles size={12}/> Impression / Conclusion</label>
                         <textarea 
                            value={impression}
                            onChange={e => setImpression(e.target.value)}
                            className="w-full h-24 bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-sm text-main font-medium outline-none resize-none focus:ring-2 focus:ring-purple-500/30"
                            placeholder="Diagnostic impression..."
                         />
                     </div>

                     <div className="space-y-1">
                         <label className="text-xs font-bold text-muted uppercase ml-1">Detailed Findings</label>
                         <textarea 
                            value={findings}
                            onChange={e => setFindings(e.target.value)}
                            className="w-full h-32 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main outline-none resize-none focus:ring-2 focus:ring-purple-500/30"
                            placeholder="Detailed observations..."
                         />
                     </div>
                 </div>

                 <div className="p-4 border-t border-glass-border bg-glass-panel flex gap-3 shrink-0">
                     <button 
                        onClick={() => setStep('upload')} 
                        className="flex-1 py-3 rounded-xl border border-glass-border text-muted hover:text-main font-bold transition-colors flex items-center justify-center gap-2 hover:bg-glass-depth"
                     >
                         <ArrowLeft size={18} /> Back
                     </button>
                     <button 
                        onClick={handleSave} 
                        className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
                     >
                         <CheckCircle2 size={18} /> Confirm & Save
                     </button>
                 </div>
             </div>
         )}

      </div>
    </div>
  );
};

export default ImagingImportModal;
