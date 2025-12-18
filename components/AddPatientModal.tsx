


import React, { useState, useEffect, useRef } from 'react';
import { Patient, Acuity, Isolation, ACPLimitations } from '../types';
import { extractPatientDataFromImage, compressImage } from '../services/geminiService';
import { X, User, Activity, FileText, ShieldAlert, CreditCard, HeartPulse, CheckCircle2, AlertTriangle, Search, ChevronDown, Camera, Scan, Trash2, ImagePlus } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (patient: Patient) => void;
}

const THAI_INSURANCE_SCHEMES = [
  "สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง) - Universal Coverage",
  "สิทธิหลักประกันสุขภาพ (ผู้พิการ) - UCS Disabled",
  "สิทธิหลักประกันสุขภาพ (ผู้สูงอายุ) - UCS Elderly",
  "สิทธิข้าราชการ (กรมบัญชีกลาง) - Civil Servant (CSMBS)",
  "สิทธิเบิกตรงกรมบัญชีกลาง - CSMBS Direct Billing",
  "สิทธิองค์กรปกครองส่วนท้องถิ่น (อปท.) - Local Gov Officer",
  "สิทธิรัฐวิสาหกิจ - State Enterprise Officer",
  "สิทธิประกันสังคม - Social Security Scheme (SSS)",
  "สิทธิประกันสุขภาพแรงงานต่างด้าว - Migrant Health Insurance",
  "สิทธิครูเอกชน - Private School Teacher",
  "สิทธิพนักงานมหาวิทยาลัย - University Staff",
  "สิทธิทหารผ่านศึก - Veterans",
  "ประกันสุขภาพภาคเอกชน - Private Insurance (AIA, AXA, etc.)",
  "ชำระเงินเอง - Self-Pay / Cash",
  "พรบ.คุ้มครองผู้ประสบภัยจากรถ - RVP (Road Accident)",
  "กองทุนทดแทนผู้ประสบภัย - Victim Compensation Fund"
];

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onAdd }) => {
  // Form State
  const [name, setName] = useState('');
  const [hn, setHn] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [roomNumber, setRoomNumber] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [underlyingConditions, setUnderlyingConditions] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [acuity, setAcuity] = useState<Acuity>(Acuity.STABLE);
  const [isolation, setIsolation] = useState<Isolation>(Isolation.NONE);
  
  // Insurance State
  const [insuranceScheme, setInsuranceScheme] = useState('สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง) - Universal Coverage');
  const [isInsuranceOpen, setIsInsuranceOpen] = useState(false);
  const [insuranceSearch, setInsuranceSearch] = useState('');

  // Advanced Care Plan State
  const [acpCategory, setAcpCategory] = useState<'Full Code' | 'Advanced Care Plan' | 'Not Decided'>('Full Code');
  const [limitations, setLimitations] = useState<ACPLimitations>({
    noCPR: false,
    noETT: false,
    noInotropes: false,
    noCVC: false,
    noHD: false
  });
  const [otherDetails, setOtherDetails] = useState('');

  // OCR State
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset fields
      setName('');
      setHn('');
      setAge('');
      setGender('M');
      setRoomNumber('');
      setDiagnosis('');
      setUnderlyingConditions('');
      setOneLiner('');
      setAcuity(Acuity.STABLE);
      setIsolation(Isolation.NONE);
      
      // Reset Insurance
      setInsuranceScheme('สิทธิหลักประกันสุขภาพแห่งชาติ (บัตรทอง) - Universal Coverage');
      setIsInsuranceOpen(false);
      setInsuranceSearch('');

      // Reset ACP
      setAcpCategory('Full Code');
      setLimitations({
        noCPR: false,
        noETT: false,
        noInotropes: false,
        noCVC: false,
        noHD: false
      });
      setOtherDetails('');
      setScanStatus('');
      setPendingImages([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleLimitation = (key: keyof ACPLimitations) => {
      setLimitations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const newImagesPromises = Array.from(files).map((file: File) => compressImage(file));

      try {
          const newImages = await Promise.all(newImagesPromises);
          setPendingImages(prev => [...prev, ...newImages]);
      } catch (e) {
          console.error("Compression error", e);
      }
      
      // Reset input so same file can be selected again if needed
      if (event.target) event.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
      setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeImages = async () => {
      if (pendingImages.length === 0) return;

      setIsScanning(true);
      setScanStatus(`Synthesizing data from ${pendingImages.length} images...`);

      try {
        const extracted = await extractPatientDataFromImage(pendingImages);

        if (extracted) {
            if (extracted.name) setName(extracted.name);
            if (extracted.hn) setHn(extracted.hn);
            if (extracted.age) setAge(extracted.age);
            if (extracted.gender) setGender(extracted.gender);
            if (extracted.diagnosis) setDiagnosis(extracted.diagnosis);
            if (extracted.underlyingConditions) setUnderlyingConditions(extracted.underlyingConditions);
            if (extracted.oneLiner) setOneLiner(extracted.oneLiner);
        }
      } catch (error) {
        console.error("Scan error", error);
        alert("Failed to analyze images. Please try again.");
      } finally {
        setIsScanning(false);
        setScanStatus('');
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || age === '' || !roomNumber) {
        alert("Please fill in Name, Age, and Room Number.");
        return;
    }

    // Extract simple name for card display if long
    const schemeShort = insuranceScheme.split(' - ')[0];

    const newPatient: Patient = {
      id: hn || Date.now().toString(), // Use HN as ID if available, otherwise timestamp
      hn,
      name,
      age: Number(age),
      gender,
      roomNumber,
      status: 'Admitted',
      diagnosis,
      underlyingConditions,
      oneLiner: oneLiner || `${age}${gender} w/ ${diagnosis}`,
      acuity,
      isolation,
      advancedCarePlan: {
          category: acpCategory,
          limitations: acpCategory === 'Advanced Care Plan' ? limitations : {
            noCPR: false, noETT: false, noInotropes: false, noCVC: false, noHD: false
          },
          otherDetails: acpCategory === 'Advanced Care Plan' ? otherDetails : ''
      },
      insuranceScheme: schemeShort,
      admissionDate: new Date().toISOString().split('T')[0],
      allergies: [], 
      consults: [], 
      medications: [], 
      labs: {
        creatinine: [],
        wbc: [],
        hgb: [],
        k: [],
        inr: [],
        sodium: [],
        others: []
      },
      tasks: [],
      timeline: [],
      handoff: {
        illnessSeverity: acuity,
        patientSummary: oneLiner,
        actionList: '',
        situationAwareness: '',
        synthesis: '',
        contingencies: ''
      },
      antibiotics: [],
      microbiology: []
    };

    onAdd(newPatient);
    onClose();
  };

  const filteredInsuranceSchemes = THAI_INSURANCE_SCHEMES.filter(scheme => 
    scheme.toLowerCase().includes(insuranceSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      
      {isScanning && (
          <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
              <Scan size={48} className="text-medical-teal animate-pulse" />
              <div className="text-white font-bold mt-4 text-lg">Analyzing Case...</div>
              <div className="text-white/70 text-sm">{scanStatus}</div>
          </div>
      )}

      <div 
        className="bg-glass-panel border border-glass-border rounded-3xl w-full max-w-2xl shadow-2xl relative backdrop-blur-xl transform transition-all scale-100 max-h-[90vh] flex flex-col m-4 sm:m-0 font-thai"
        onClick={(e) => {
           e.stopPropagation();
           if(isInsuranceOpen) setIsInsuranceOpen(false);
        }}
      >
        {/* Hidden Inputs */}
        <input 
            type="file" 
            accept="image/*"
            multiple 
            ref={galleryInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            onClick={(e) => e.stopPropagation()} 
        />
         <input 
            type="file" 
            accept="image/*"
            capture="environment"
            ref={cameraInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            onClick={(e) => e.stopPropagation()} 
        />

        {/* Header */}
        <div className="p-6 border-b border-glass-border flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-main">Admit New Patient</h2>
            <p className="text-sm text-muted">Enter demographics or scan case summary.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-main transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 custom-scrollbar">
            <form id="add-patient-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Image Scanning Section */}
                <div className="bg-glass-depth p-4 rounded-2xl border border-glass-border">
                     <div className="flex justify-between items-center mb-3">
                         <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-2">
                             <Scan size={14} /> Auto-Fill Data
                         </h3>
                         <span className="text-[10px] text-muted">{pendingImages.length} images selected</span>
                     </div>
                     
                     {/* Action Buttons */}
                     <div className="flex gap-2 mb-4">
                         <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex-1 py-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 font-bold text-xs transition-all flex flex-col items-center gap-1"
                         >
                             <Camera size={20} />
                             Take Photo
                         </button>
                         <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="flex-1 py-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 font-bold text-xs transition-all flex flex-col items-center gap-1"
                         >
                             <ImagePlus size={20} />
                             Gallery (Multi)
                         </button>
                     </div>

                     {/* Thumbnail Staging Area */}
                     {pendingImages.length > 0 && (
                         <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                             {pendingImages.map((img, idx) => (
                                 <div key={idx} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-glass-border group">
                                     <img src={img} alt={`scan-${idx}`} className="w-full h-full object-cover" />
                                     <button
                                        type="button"
                                        onClick={() => handleRemoveImage(idx)}
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                             ))}
                         </div>
                     )}

                     {pendingImages.length > 0 && (
                         <button
                            type="button"
                            onClick={handleAnalyzeImages}
                            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                         >
                             <Scan size={16} /> Analyze {pendingImages.length} Images
                         </button>
                     )}
                </div>

                {/* Demographics Section */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-2">
                        <User size={14}/> Demographics
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-muted font-medium ml-1">Full Name (ชื่อ-สกุล) *</label>
                            <input 
                                required
                                type="text" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                placeholder="Ex. สมชาย ใจดี"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs text-muted font-medium ml-1">HN</label>
                                <input 
                                    type="text" 
                                    value={hn}
                                    onChange={e => setHn(e.target.value)}
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="57-xxxxxx"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted font-medium ml-1">Room (เตียง/ห้อง) *</label>
                                <input 
                                    required
                                    type="text" 
                                    value={roomNumber}
                                    onChange={e => setRoomNumber(e.target.value)}
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="404-A"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs text-muted font-medium ml-1">Age (อายุ) *</label>
                                <input 
                                    required
                                    type="number" 
                                    value={age}
                                    onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="##"
                                />
                            </div>
                            <div className="space-y-1">
                                <ModernSelect 
                                    label="Gender (เพศ)"
                                    value={gender === 'M' ? 'Male' : 'Female'}
                                    onChange={(v) => setGender(v === 'Male' ? 'M' : 'F')}
                                    options={['Male', 'Female']}
                                />
                            </div>
                         </div>
                         
                         <div className="space-y-1 relative">
                             <label className="text-xs text-muted font-medium ml-1 flex items-center gap-1"><CreditCard size={12}/> Insurance Scheme (สิทธิ)</label>
                             <div 
                                className="relative"
                                onClick={(e) => e.stopPropagation()}
                             >
                                 <button
                                    type="button"
                                    onClick={() => setIsInsuranceOpen(!isInsuranceOpen)}
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-left flex justify-between items-center font-thai text-sm"
                                 >
                                     <span className="truncate">{insuranceScheme}</span>
                                     <ChevronDown size={16} className="text-muted shrink-0" />
                                 </button>

                                 {isInsuranceOpen && (
                                     <div className="absolute bottom-full mb-2 w-full bg-white/95 dark:bg-slate-900/95 border border-glass-border rounded-xl shadow-xl backdrop-blur-3xl overflow-hidden z-50 flex flex-col max-h-[50vh] sm:max-h-64">
                                         <div className="p-2 border-b border-glass-border bg-glass-depth">
                                             <div className="flex items-center gap-2 px-2 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg border border-glass-border">
                                                 <Search size={14} className="text-muted" />
                                                 <input 
                                                    autoFocus
                                                    type="text" 
                                                    value={insuranceSearch}
                                                    onChange={(e) => setInsuranceSearch(e.target.value)}
                                                    placeholder="Search benefit scheme..."
                                                    className="w-full bg-transparent border-none outline-none text-xs text-main placeholder-muted"
                                                 />
                                             </div>
                                         </div>
                                         <div className="overflow-y-auto p-1 custom-scrollbar">
                                             {filteredInsuranceSchemes.length > 0 ? (
                                                 filteredInsuranceSchemes.map((scheme) => (
                                                     <button
                                                        key={scheme}
                                                        type="button"
                                                        onClick={() => {
                                                            setInsuranceScheme(scheme);
                                                            setIsInsuranceOpen(false);
                                                            setInsuranceSearch('');
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-thai transition-colors ${insuranceScheme === scheme ? 'bg-indigo-500 text-white' : 'text-main hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                     >
                                                         {scheme}
                                                     </button>
                                                 ))
                                             ) : (
                                                 <div className="p-3 text-xs text-muted text-center">No schemes found</div>
                                             )}
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                </div>

                {/* Clinical Details */}
                <div className="space-y-4 pt-4 border-t border-glass-border">
                     <h3 className="text-xs font-bold text-medical-teal uppercase tracking-wider flex items-center gap-2">
                        <Activity size={14}/> Clinical Profile
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                             <ModernSelect 
                                label="Acuity Level"
                                value={acuity}
                                onChange={(v) => setAcuity(v as Acuity)}
                                options={[Acuity.STABLE, Acuity.WATCH, Acuity.UNSTABLE]}
                             />
                         </div>
                         <div className="space-y-1">
                             <ModernSelect 
                                label="Isolation"
                                icon={<ShieldAlert size={12}/>}
                                value={isolation}
                                onChange={(v) => setIsolation(v as Isolation)}
                                options={[Isolation.NONE, Isolation.CONTACT, Isolation.DROPLET, Isolation.AIRBORNE]}
                             />
                         </div>
                    </div>
                    
                    {/* Advanced Care Plan Section */}
                    <div className="space-y-3 bg-glass-depth p-4 rounded-2xl border border-glass-border">
                         <label className="text-xs text-muted font-medium flex items-center gap-1">
                             <HeartPulse size={12} /> Advanced Care Plan (Code Status)
                         </label>
                         
                         {/* Main Categories */}
                         <div className="grid grid-cols-3 gap-2">
                             {['Full Code', 'Not Decided', 'Advanced Care Plan'].map(cat => (
                                 <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setAcpCategory(cat as any)}
                                    className={`
                                        py-2 px-2 rounded-lg text-[11px] font-bold transition-all border
                                        ${acpCategory === cat 
                                            ? 'bg-white text-black border-black/20 shadow-sm scale-105 dark:bg-slate-700 dark:text-white' 
                                            : 'bg-transparent border-transparent hover:bg-glass-border text-muted'}
                                    `}
                                 >
                                     {cat}
                                 </button>
                             ))}
                         </div>

                         {/* Checkboxes for ACP */}
                         {acpCategory === 'Advanced Care Plan' && (
                             <div className="animate-in fade-in slide-in-from-top-2 space-y-3 pt-2">
                                 <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-1">Select Limitations</div>
                                 <div className="grid grid-cols-2 gap-2">
                                     {[
                                         { k: 'noCPR', l: 'No CPR' },
                                         { k: 'noETT', l: 'No ETT (Intubation)' },
                                         { k: 'noInotropes', l: 'No Inotropes' },
                                         { k: 'noCVC', l: 'No Central Line' },
                                         { k: 'noHD', l: 'No Hemodialysis' }
                                     ].map(opt => (
                                         <label key={opt.k} className="flex items-center gap-2 p-2 rounded-lg border border-red-500/20 bg-red-500/5 cursor-pointer hover:bg-red-500/10 transition-colors">
                                             <div 
                                                 className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${limitations[opt.k as keyof ACPLimitations] ? 'bg-red-500 border-red-500 text-white' : 'border-red-400/50'}`}
                                                 onClick={() => toggleLimitation(opt.k as keyof ACPLimitations)}
                                             >
                                                 {limitations[opt.k as keyof ACPLimitations] && <CheckCircle2 size={10} />}
                                             </div>
                                             <span className="text-xs text-red-700 dark:text-red-300 font-medium">{opt.l}</span>
                                         </label>
                                     ))}
                                 </div>
                                 
                                 <div className="space-y-1 mt-2">
                                     <label className="text-[10px] text-muted font-medium">Others (Please Specify)</label>
                                     <input 
                                         type="text"
                                         value={otherDetails}
                                         onChange={e => setOtherDetails(e.target.value)}
                                         className="w-full bg-white/50 dark:bg-slate-800/50 border border-glass-border rounded-lg px-3 py-2 text-sm text-main focus:outline-none focus:border-red-500/50"
                                         placeholder="e.g., OK for NIV, OK for Pressors peripheral..."
                                     />
                                 </div>
                             </div>
                         )}

                         {acpCategory === 'Not Decided' && (
                             <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-yellow-700 dark:text-yellow-200 text-xs">
                                 <AlertTriangle size={14} />
                                 <span>Code status discussion pending. Treat as Full Code until decided.</span>
                             </div>
                         )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted font-medium ml-1">Primary Diagnosis</label>
                        <input 
                            required
                            type="text" 
                            value={diagnosis}
                            onChange={e => setDiagnosis(e.target.value)}
                            className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main focus:outline-none focus:ring-2 focus:ring-medical-teal/50"
                            placeholder="Ex. Acute Heart Failure"
                        />
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs text-muted font-medium ml-1">Underlying Conditions (PMH)</label>
                         <textarea 
                             value={underlyingConditions}
                             onChange={e => setUnderlyingConditions(e.target.value)}
                             className="w-full h-20 bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main focus:outline-none focus:ring-2 focus:ring-medical-teal/50 resize-none"
                             placeholder="Ex. HTN, DLP, T2DM, CKD..."
                         />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-muted font-medium ml-1 flex items-center gap-1"><FileText size={12}/> One-Liner (Summary)</label>
                        <textarea 
                            value={oneLiner}
                            onChange={e => setOneLiner(e.target.value)}
                            className="w-full h-20 bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main focus:outline-none focus:ring-2 focus:ring-medical-teal/50 resize-none"
                            placeholder="e.g., 65M w/ HFrEF admitted for volume overload..."
                        />
                    </div>
                </div>
            </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-glass-border flex gap-3 shrink-0">
            <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-glass-border text-muted hover:bg-glass-depth transition-colors font-medium"
            >
                Cancel
            </button>
            <button 
                type="submit"
                form="add-patient-form"
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30 transition-all"
            >
                Admit Patient
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddPatientModal;
