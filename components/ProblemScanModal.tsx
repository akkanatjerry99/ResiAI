
import React, { useState, useRef } from 'react';
import { extractProblemListFromImage } from '../services/geminiService';
import { ProblemEntry } from '../types';
import { X, Camera, Scan, Trash2, ImagePlus, AlertCircle } from 'lucide-react';

interface ProblemScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (problems: ProblemEntry[]) => void;
}

const ProblemScanModal: React.FC<ProblemScanModalProps> = ({ isOpen, onClose, onScanComplete }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

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
      setPendingImages(prev => [...prev, ...newImages]);
      
      if (event.target) event.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
      setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
      if (pendingImages.length === 0) return;

      setIsScanning(true);
      setScanStatus('Identifying problems and plans...');

      try {
        const result = await extractProblemListFromImage(pendingImages);
        if (result && result.length > 0) {
            onScanComplete(result);
            setPendingImages([]);
            onClose();
        } else {
            alert('No problems detected. Please ensure text is clear.');
        }
      } catch (error) {
        console.error(error);
        alert('Error analyzing problem list.');
      } finally {
        setIsScanning(false);
        setScanStatus('');
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {isScanning && (
          <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
              <AlertCircle size={48} className="text-medical-warning animate-bounce" />
              <div className="text-white font-bold mt-4 text-lg">Analyzing Problem List...</div>
              <div className="text-white/70 text-sm">{scanStatus}</div>
          </div>
      )}

      <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-lg shadow-2xl relative backdrop-blur-xl">
         <button type="button" onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-main transition-colors">
            <X size={24} />
         </button>

         <div className="flex items-center gap-3 mb-6">
             <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-500">
                 <AlertCircle size={24} />
             </div>
             <div>
                 <h2 className="text-xl font-bold text-main">Scan Problem List</h2>
                 <p className="text-sm text-muted">Upload diagnosis lists or assessment sections.</p>
             </div>
         </div>

         {/* Hidden Inputs */}
         <input 
            type="file" 
            accept="image/*"
            multiple 
            ref={galleryInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
        />
         <input 
            type="file" 
            accept="image/*"
            capture="environment"
            ref={cameraInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
        />

         <div className="space-y-4">
             {/* Thumbnails */}
             {pendingImages.length > 0 ? (
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                     {pendingImages.map((img, idx) => (
                         <div key={idx} className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-glass-border group">
                             <img src={img} alt={`scan-${idx}`} className="w-full h-full object-cover" />
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
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-glass-border flex flex-col items-center justify-center text-muted hover:text-main hover:border-indigo-500/50 transition-all"
                     >
                         <ImagePlus size={20} />
                         <span className="text-[10px] font-bold mt-1">Add Page</span>
                     </button>
                 </div>
             ) : (
                 <div className="h-32 rounded-2xl border-2 border-dashed border-glass-border flex flex-col items-center justify-center text-muted bg-glass-depth">
                     <ImagePlus size={32} className="mb-2 opacity-50" />
                     <span className="text-sm">No images selected</span>
                 </div>
             )}

             <div className="grid grid-cols-2 gap-3">
                 <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2"
                 >
                     <Camera size={18} />
                     Camera
                 </button>
                 <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2"
                 >
                     <ImagePlus size={18} />
                     Gallery
                 </button>
             </div>

             <button
                type="button"
                disabled={pendingImages.length === 0}
                onClick={handleAnalyze}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
                 <Scan size={18} />
                 Scan & Extract Problems
             </button>
         </div>
      </div>
    </div>
  );
};

export default ProblemScanModal;
