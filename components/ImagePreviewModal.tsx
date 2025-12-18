import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, Move, RefreshCw, Monitor, Sun, Wand2, ScanFace, Loader2 } from 'lucide-react';
import { detectMedicalAbnormalities } from '../services/geminiService';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, images, initialIndex = 0, title }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Transform States
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); 
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Visual Enhancement States
  const [brightness, setBrightness] = useState(1);
  const [isScreenClean, setIsScreenClean] = useState(false);

  // AI Hotspot States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hotspots, setHotspots] = useState<{ label: string, box_2d: number[], confidence: number }[]>([]);
  const [showHotspots, setShowHotspots] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  // Reset/Init state when modal opens
  useEffect(() => {
      if(isOpen) {
          resetView();
          setCurrentIndex(initialIndex);
          setHotspots([]);
          setShowHotspots(false);
      }
  }, [isOpen, initialIndex]);

  const resetView = () => {
      setScale(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setBrightness(1);
      setIsScreenClean(false);
  };

  if (!isOpen || images.length === 0) return null;

  // --- Handlers ---

  const handlePrev = () => {
      resetView();
      setHotspots([]);
      setShowHotspots(false);
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
      resetView();
      setHotspots([]);
      setShowHotspots(false);
      setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
      const link = document.createElement('a');
      link.href = images[currentIndex];
      // Check if it's video for extension
      const isVideo = images[currentIndex].startsWith('data:video');
      link.download = `media-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      link.click();
  };

  const handleImageLoad = () => {
      // Auto-enhance slightly if needed
  };

  const handleAnalyzeHotspots = async () => {
      // Toggle off if already showing
      if (showHotspots && hotspots.length > 0) {
          setShowHotspots(false);
          return;
      }
      
      // If we have cached hotspots, just show them
      if (hotspots.length > 0) {
          setShowHotspots(true);
          return;
      }

      setIsAnalyzing(true);
      try {
          const results = await detectMedicalAbnormalities(images[currentIndex]);
          if (results.length > 0) {
              setHotspots(results);
              setShowHotspots(true);
          } else {
              alert("No specific abnormalities detected by AI.");
          }
      } catch (error) {
          console.error("Analysis failed", error);
          alert("Failed to analyze image.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  // --- Zoom Logic ---
  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const delta = e.deltaY * -0.001;
      const newScale = Math.min(Math.max(0.5, scale + delta), 8);
      setScale(newScale);
  };

  // --- Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
      // Allow default behavior for video controls
      if ((e.target as HTMLElement).tagName === 'VIDEO') return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      setPan({ 
          x: e.clientX - dragStart.x, 
          y: e.clientY - dragStart.y 
      });
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  const handleMouseLeave = () => {
      setIsDragging(false);
  };

  const isVideo = images[currentIndex].startsWith('data:video');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[210]"
        >
            <X size={24} />
        </button>

        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-[210] flex gap-2 items-center bg-black/40 p-2 rounded-xl border border-white/10 backdrop-blur-md transition-all">
            <button onClick={() => setScale(s => Math.min(s + 0.25, 6))} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title="Zoom In"><ZoomIn size={20}/></button>
            <button onClick={() => setScale(s => Math.max(s - 0.25, 0.5))} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title="Zoom Out"><ZoomOut size={20}/></button>
            
            <div className="w-px h-6 bg-white/20 mx-1"></div>

            <button 
                onClick={() => setIsScreenClean(!isScreenClean)}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${isScreenClean ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title="Enhance Text: Removes screen lines and glare"
            >
                <Wand2 size={20}/>
                <span className="text-xs font-bold hidden sm:inline">Enhance</span>
            </button>

            <button 
                onClick={handleAnalyzeHotspots}
                disabled={isAnalyzing || isVideo}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${showHotspots ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title="AI Scan: Detect fractures, masses, etc."
            >
                {isAnalyzing ? <Loader2 size={20} className="animate-spin"/> : <ScanFace size={20}/>}
                <span className="text-xs font-bold hidden sm:inline">AI Scan</span>
            </button>

            <div className="w-px h-6 bg-white/20 mx-1"></div>

            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2">
                <Sun size={14} className="text-white/70"/>
                <input 
                    type="range" min="0.5" max="2" step="0.1" 
                    value={brightness} onChange={e => setBrightness(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <div className="w-px h-6 bg-white/20 mx-1"></div>

            <button onClick={resetView} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title="Reset View"><RefreshCw size={20}/></button>
            <button onClick={handleDownload} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20" title="Download"><Download size={20}/></button>
        </div>

        {/* Info Overlay */}
        {title && (
            <div className="absolute bottom-4 left-4 text-white/80 bg-black/50 px-3 py-1 rounded-lg text-sm backdrop-blur-sm z-[210] flex items-center gap-2 pointer-events-none">
                <span>{title} • {currentIndex + 1}/{images.length}</span>
            </div>
        )}

        {/* Hints */}
        {scale > 1 && !isVideo && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[210] pointer-events-none animate-fade-out duration-[3000ms] opacity-0 animate-in fade-in fill-mode-forwards">
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
                    <Move size={12} /> Drag to pan, Scroll to zoom
                </div>
            </div>
        )}

        {/* Navigation */}
        {images.length > 1 && (
            <>
                <button 
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[210] backdrop-blur-sm"
                >
                    <ChevronLeft size={32} />
                </button>
                <button 
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[210] backdrop-blur-sm"
                >
                    <ChevronRight size={32} />
                </button>
            </>
        )}

        {/* Image/Video Viewport */}
        <div 
            className={`w-full h-full flex items-center justify-center overflow-hidden p-0 bg-black ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
        >
            <div 
                className="w-full h-full flex items-center justify-center will-change-transform relative"
                style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale})`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
            >
                {isVideo ? (
                    <video 
                        src={images[currentIndex]}
                        controls
                        className="max-w-full max-h-screen object-contain shadow-2xl"
                        style={{
                            filter: `brightness(${brightness}) ${isScreenClean ? 'contrast(1.4) saturate(0) blur(0.6px)' : ''}`,
                            transition: 'filter 0.2s ease-out'
                        }}
                    />
                ) : (
                    <>
                        <img 
                            ref={imgRef}
                            src={images[currentIndex]} 
                            className="max-w-full max-h-screen object-contain origin-center select-none shadow-2xl relative z-10"
                            alt="Preview"
                            draggable={false}
                            onLoad={handleImageLoad}
                            style={{
                                // Filter applies ONLY to the image
                                filter: `brightness(${brightness}) ${isScreenClean ? 'contrast(1.5) brightness(0.95) saturate(0) blur(0.6px)' : ''}`,
                                transition: 'filter 0.2s ease-out'
                            }}
                        />
                        
                        {/* Hotspot Overlay Layer - inside transform but outside filter */}
                        {showHotspots && hotspots.length > 0 && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                                {/* 
                                   We need the overlays to match the image dimensions exactly.
                                   Since the image uses object-contain, we can use the natural aspect ratio 
                                   if we wrap the overlays in a div that matches the displayed image size.
                                   However, a simpler way in this flex container is to rely on aspect-ratio if known,
                                   or just map coordinates to the container if the image fills it.
                                   
                                   Actually, the easiest way for `object-contain` images is to assume the detected boxes
                                   are relative to the *image* pixels. But mapping that to CSS % in a centered flex container is tricky
                                   without JS measurements of the rendered image.
                                   
                                   Trick: Place the boxes relative to the image by using a grid overlay 
                                   if we knew the rendered dimensions. 
                                   
                                   Alternative: Let's assume standard normalization.
                                   Since `img` is `max-w-full max-h-screen`, getting exact rect matches requires JS.
                                   Let's add a small effect to just force the container size to match the image.
                                */}
                                <div 
                                    className="relative"
                                    style={{
                                        width: imgRef.current?.getBoundingClientRect().width ? (imgRef.current.width / scale) : 'auto', 
                                        height: imgRef.current?.getBoundingClientRect().height ? (imgRef.current.height / scale) : 'auto',
                                        // The above is tricky due to React re-renders vs DOM updates.
                                        // A CSS-only hack for overlays on object-contain images involves using grid.
                                        // But here, let's just absolutely position based on the image's natural aspect ratio if possible.
                                        // For simplicity in this demo, we'll position absolute relative to this wrapper 
                                        // which *should* shrink-wrap the image if we change display.
                                    }}
                                >
                                   {/* We need the overlay container to match the image size exactly. 
                                       Changing the parent display to grid and piling them is a robust CSS trick.
                                   */}
                                </div>
                                
                                {/* 
                                   ROBUST SOLUTION:
                                   Position absolute box overlays. 
                                   Since `box_2d` is normalized 0-1000 relative to the image content.
                                   We attach these boxes to a container that has the exact same dimensions as the rendered image.
                                   
                                   To do this without complex JS resize observers:
                                   Make the parent a grid. Image in col 1 row 1. Overlay container in col 1 row 1.
                                */}
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {/* 
                Re-implementing the structure to support overlays correctly:
                We need a wrapper that tightly wraps the image so % based positions work.
                Display: grid, place-items: center.
            */}
            {!isVideo && showHotspots && hotspots.length > 0 && (
                 <div 
                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                    style={{ 
                        transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                    }}
                 >
                     <div className="relative" style={{ width: 'fit-content', height: 'fit-content' }}>
                         {/* Invisible duplicate image to set the container size exactly */}
                         <img 
                             src={images[currentIndex]} 
                             className="max-w-full max-h-screen object-contain opacity-0"
                             alt="ghost"
                         />
                         
                         {/* The boxes */}
                         <div className="absolute inset-0">
                             {hotspots.map((h, i) => (
                                 <div
                                     key={i}
                                     className="absolute border-2 border-red-500 bg-red-500/10 group hover:bg-red-500/20 transition-colors"
                                     style={{
                                         top: `${h.box_2d[0] / 10}%`,
                                         left: `${h.box_2d[1] / 10}%`,
                                         height: `${(h.box_2d[2] - h.box_2d[0]) / 10}%`,
                                         width: `${(h.box_2d[3] - h.box_2d[1]) / 10}%`
                                     }}
                                 >
                                     <div className="absolute -top-6 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                                         {h.label} ({Math.round(h.confidence * 100)}%)
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
            )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-xl backdrop-blur-md z-[210] max-w-[90vw] overflow-x-auto scrollbar-none border border-white/10">
                {images.map((img, idx) => (
                    <div 
                        key={idx}
                        onClick={() => { setCurrentIndex(idx); resetView(); setHotspots([]); setShowHotspots(false); }}
                        className={`w-12 h-12 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${idx === currentIndex ? 'border-purple-500 scale-110 shadow-lg shadow-purple-500/50' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                        {img.startsWith('data:video') ? (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <span className="text-[8px] text-white">VIDEO</span>
                            </div>
                        ) : (
                            <img src={img} className="w-full h-full object-cover" alt="thumb" />
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default ImagePreviewModal;