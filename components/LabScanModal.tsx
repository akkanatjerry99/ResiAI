import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { RawLabResult } from '../types';
import { X, Camera, Scan, Trash2, ImagePlus, FlaskConical, CalendarClock, CheckCircle2, Microscope, Eye } from 'lucide-react';
import ImagePreviewModal from './ImagePreviewModal';

interface LabScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  onScanComplete: (results: RawLabResult[], pbsFindings?: string) => void;
}

const LabScanModal: React.FC<LabScanModalProps> = ({ isOpen, onClose, patientName, onScanComplete }) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  
  // Review State
  const [scannedResults, setScannedResults] = useState<RawLabResult[]>([]);
  const [showReview, setShowReview] = useState(false);
  
  // Extra features based on detection
  const [showPbsInput, setShowPbsInput] = useState(false);
  const [pbsFindings, setPbsFindings] = useState('');
  
  // Global Date/Time for the batch (fallback if row doesn't have time)
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectionTime, setCollectionTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

  // Preview State
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
      if (isOpen) {
          // Reset states when modal opens
          setPendingImages([]);
          setScannedResults([]);
          setShowReview(false);
          setShowPbsInput(false);
          setPbsFindings('');
          setShowImagePreview(false);
          // Set default date/time to now, but this will be overridden if scan is successful
          setCollectionDate(new Date().toISOString().split('T')[0]);
          setCollectionTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newImagesPromises = Array.from(files).map((file: File) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      try {
          const newImages = await Promise.all(newImagesPromises);
          setPendingImages(prev => [...prev, ...newImages]);
      } catch (e) {
          console.error("File reading error", e);
      }
      
      if (event.target) event.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
      setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
      if (pendingImages.length === 0) return;

      setIsScanning(true);
      setScanStatus('Reading lab values & timestamps...');

      try {
        const result = await apiClient.scanLabs(pendingImages, patientName);
        console.log('ScanLabs result:', result);
        if (result && Array.isArray(result.results) && result.results.length > 0) {
            // Standardize date formats and sort
            const standardizedResults = result.results.map(r => {
                if (!r.dateTime) return r;
                try {
                    // Handle 'YYYY-MM-DD HH:mm' format which might not parse directly
                    const d = new Date(r.dateTime.includes('T') ? r.dateTime : r.dateTime.replace(' ', 'T'));
                    if (!isNaN(d.getTime())) {
                        return { ...r, dateTime: d.toISOString() };
                    }
                } catch (e) {
                    // If parsing fails, leave it as is for the user to see, but it will be overridden on save if null
                }
                return r;
            }).sort((a, b) => {
                if (!a.dateTime) return 1;
                if (!b.dateTime) return -1;
                return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
            });

            setScannedResults(standardizedResults);
            
            // Check for CBC components to offer PBS
            const hasCBC = standardizedResults.some(r => ['hgb', 'hemoglobin', 'wbc', 'plt', 'platelet'].some(k => r.testName.toLowerCase().includes(k)));
            if (hasCBC) setShowPbsInput(true);
            
            // Check if PBS text was extracted by AI
            if (result.pbsText) {
                setShowPbsInput(true);
                setPbsFindings(result.pbsText);
            }

            // Set fallback date/time from the most recent valid lab result
            const firstValidDateStr = standardizedResults.find(r => r.dateTime)?.dateTime;
            if (firstValidDateStr) {
                const firstValidDate = new Date(firstValidDateStr);
                if (!isNaN(firstValidDate.getTime())) {
                    setCollectionDate(firstValidDate.toISOString().split('T')[0]);
                    setCollectionTime(firstValidDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                }
            }

            setShowReview(true);
        } else {
            setScannedResults([]);
            setShowReview(true);
            alert('No labs detected or scan failed. Please ensure text is clear and try again.');
        }
      } catch (error) {
        console.error(error);
        setScannedResults([]);
        setShowReview(true);
        alert('Error analyzing labs.');
      } finally {
        setIsScanning(false);
        setScanStatus('');
      }
  };

  const handleSave = () => {
      const fallbackDateTime = `${collectionDate}T${collectionTime}:00`;
      
      const finalResults = scannedResults.map(r => {
          let finalDateTime = r.dateTime;
          // If dateTime is invalid or missing, use the fallback.
          if (!finalDateTime || isNaN(new Date(finalDateTime).getTime())) {
              finalDateTime = fallbackDateTime;
          }
          
          return {
              ...r,
              dateTime: finalDateTime
          };
      });

      onScanComplete(finalResults, pbsFindings);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        images={pendingImages}
        title="Source Lab Sheet"
      />

      {isScanning && (
          <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
              <FlaskConical size={48} className="text-medical-blue animate-bounce" />
              <div className="text-white font-bold mt-4 text-lg">Analyzing Lab Sheets...</div>
              <div className="text-white/70 text-sm">{scanStatus}</div>
          </div>
      )}

      <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-lg shadow-2xl relative backdrop-blur-xl max-h-[90vh] flex flex-col overflow-hidden">
         <button type="button" onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-main transition-colors z-10">
            <X size={24} />
         </button>

         <div className="flex items-center gap-3 mb-6 shrink-0">
             <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                 <FlaskConical size={24} />
             </div>
             <div>
                 <h2 className="text-xl font-bold text-main">Scan Lab Results</h2>
                 <p className="text-sm text-muted">{showReview ? 'Review & Confirm Data' : 'Upload one or multiple pages'}</p>
             </div>
         </div>

         {/* VIEW 1: UPLOAD */}
         {!showReview && (
             <div className="space-y-4 overflow-y-auto custom-scrollbar">
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
                            className="shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-glass-border flex flex-col items-center justify-center text-muted hover:text-main hover:border-blue-500/50 transition-all"
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
                        className="py-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:bg-blue-500/20 border border-blue-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2"
                     >
                         <Camera size={18} />
                         Camera
                     </button>
                     <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="py-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2"
                     >
                         <ImagePlus size={18} />
                         Gallery
                     </button>
                 </div>

                 <button
                    type="button"
                    disabled={pendingImages.length === 0}
                    onClick={handleAnalyze}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                     <Scan size={18} />
                     Analyze Labs
                 </button>
             </div>
         )}

         {/* VIEW 2: REVIEW */}
         {showReview && (
             <div className="flex flex-col h-full overflow-hidden">
                 <div className="mb-4 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10 space-y-3 shrink-0">
                      <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                              <CalendarClock size={14} /> Fallback Timestamp
                          </div>
                          <button 
                            type="button"
                            onClick={() => setShowImagePreview(true)}
                            className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-500/20 flex items-center gap-1 font-bold"
                          >
                              <Eye size={12}/> View Original
                          </button>
                      </div>
                      <div className="flex gap-3">
                          <input 
                              type="date" 
                              value={collectionDate} 
                              onChange={e => setCollectionDate(e.target.value)}
                              className="flex-1 bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-main text-sm focus:ring-2 focus:ring-blue-500/30 outline-none"
                          />
                          <input 
                              type="time" 
                              value={collectionTime} 
                              onChange={e => setCollectionTime(e.target.value)}
                              className="flex-1 bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-main text-sm focus:ring-2 focus:ring-blue-500/30 outline-none"
                          />
                      </div>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-glass-border">
                     <div className="divide-y divide-glass-border">
                         {scannedResults.map((res, i) => {
                             let displayDate = 'Using Default Time';
                             let dateStyle = 'text-muted/50';
                             if (res.dateTime) {
                                 try {
                                     const d = new Date(res.dateTime);
                                     if (!isNaN(d.getTime())) {
                                         displayDate = d.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', year:'numeric'});
                                         dateStyle = 'text-blue-600 dark:text-blue-400 font-bold font-mono bg-blue-500/10';
                                     } else {
                                        displayDate = 'Invalid Date';
                                        dateStyle = 'text-red-500 bg-red-500/10';
                                     }
                                 } catch (e) {
                                     displayDate = 'Invalid Date Format';
                                     dateStyle = 'text-red-500 bg-red-500/10';
                                 }
                             }

                             return (
                                 <div key={i} className="p-3 flex justify-between items-center hover:bg-glass-depth/50">
                                     <div>
                                         <div className="font-medium text-main text-sm">
                                             {res.testName}
                                             {res.category === 'Microbiology' && <span className="ml-2 text-[9px] bg-orange-500/10 text-orange-600 px-1 rounded">Culture</span>}
                                             {res.category === 'ABG' && <span className="ml-2 text-[9px] bg-pink-500/10 text-pink-600 px-1 rounded">ABG</span>}
                                         </div>
                                         <div className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded w-fit ${dateStyle}`}>
                                             {displayDate}
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <span className="font-bold text-main">{res.value}</span>
                                         <span className="text-xs text-muted">{res.unit}</span>
                                         {res.flag && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${res.flag === 'H' || res.flag === 'Panic' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{res.flag}</span>}
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                     
                     {/* PBS Entry */}
                     {showPbsInput && (
                         <div className="p-3 bg-purple-500/5 mt-2 rounded-xl border border-purple-500/10">
                             <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-300 font-bold text-xs uppercase">
                                 <Microscope size={14} /> PBS Findings Detected/Required
                             </div>
                             <textarea 
                                 value={pbsFindings} 
                                 onChange={e => setPbsFindings(e.target.value)}
                                 className="w-full h-20 bg-glass-depth border border-glass-border rounded-lg p-2 text-sm text-main outline-none focus:ring-1 focus:ring-purple-500/30"
                                 placeholder="Enter Peripheral Blood Smear findings here..."
                             />
                         </div>
                     )}
                 </div>

                 <div className="pt-4 mt-2 border-t border-glass-border flex gap-3 shrink-0">
                     <button 
                        type="button"
                        onClick={() => setShowReview(false)} 
                        className="flex-1 py-3 rounded-xl border border-glass-border text-muted hover:bg-glass-depth font-bold text-sm"
                     >
                         Back
                     </button>
                     <button 
                        type="button"
                        onClick={handleSave} 
                        className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
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

export default LabScanModal;
