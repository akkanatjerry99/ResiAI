
import React, { useState, useEffect, useMemo } from 'react';
import { Medication } from '../types';
import { MEDICATION_DATABASE } from '../constants';
import { getRenalDoseSuggestion } from '../services/geminiService';
import { X, Search, Pill, Calculator, Weight, ArrowRightLeft, Droplet, AlertTriangle, CheckCircle2, Calendar, Syringe, Tablet, StopCircle, RotateCcw } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface MedicationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (med: Medication) => void;
  patientWeight?: number;
  patientCrCl?: number | null;
  medToEdit?: Medication | null;
}

const DRIP_MEDS = {
    'Norepinephrine': { unit: 'mcg/kg/min', defaultDose: 0.05, defaultConc: { amount: 4, unit: 'mg', vol: 250 } },
    'Levophed': { unit: 'mcg/kg/min', defaultDose: 0.05, defaultConc: { amount: 4, unit: 'mg', vol: 250 } }, 
    'Dopamine': { unit: 'mcg/kg/min', defaultDose: 5, defaultConc: { amount: 200, unit: 'mg', vol: 250 } },
    'Dobutamine': { unit: 'mcg/kg/min', defaultDose: 5, defaultConc: { amount: 250, unit: 'mg', vol: 250 } },
    'Epinephrine': { unit: 'mcg/kg/min', defaultDose: 0.05, defaultConc: { amount: 4, unit: 'mg', vol: 250 } },
    'Adrenalin': { unit: 'mcg/kg/min', defaultDose: 0.05, defaultConc: { amount: 4, unit: 'mg', vol: 250 } },
    'Milrinone': { unit: 'mcg/kg/min', defaultDose: 0.375, defaultConc: { amount: 10, unit: 'mg', vol: 100 } },
    'Vasopressin': { unit: 'unit/min', defaultDose: 0.03, weightBased: false, defaultConc: { amount: 20, unit: 'units', vol: 100 } },
    'Nicardipine': { unit: 'mg/hr', defaultDose: 5, weightBased: false, defaultConc: { amount: 25, unit: 'mg', vol: 250 } },
    'Nitroglycerin': { unit: 'mcg/min', defaultDose: 10, weightBased: false, defaultConc: { amount: 50, unit: 'mg', vol: 250 } },
    'Furosemide': { unit: 'mg/hr', defaultDose: 2, weightBased: false, defaultConc: { amount: 250, unit: 'mg', vol: 250 } },
    'Lasix': { unit: 'mg/hr', defaultDose: 2, weightBased: false, defaultConc: { amount: 250, unit: 'mg', vol: 250 } },
    'Fentanyl': { unit: 'mcg/hr', defaultDose: 25, weightBased: false, defaultConc: { amount: 500, unit: 'mcg', vol: 50 } }
};

// Strict routes for specific drugs to prevent errors
const FIXED_ROUTES: Record<string, string> = {
    'Vancomycin': 'IV',
    'Meropenem': 'IV',
    'Ceftriaxone': 'IV',
    'Piperacillin/Tazobactam': 'IV',
    'Azithromycin': 'PO', // Default, user can change if IV needed
    'Warfarin': 'PO',
    'Metformin': 'PO',
    'Insulin Glargine': 'SC',
    'Insulin Aspart': 'SC',
    'Enoxaparin': 'SC',
    'Pantoprazole': 'IV'
};

const COMMON_UNITS = ['mg', 'g', 'mcg', 'mL', 'unit', 'puff', 'tab', 'cap'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const FREQUENCY_SHORTCUTS: Record<string, string> = {
    'od': 'Daily',
    'qd': 'Daily',
    'daily': 'Daily',
    'bid': 'BID (Twice daily)',
    'tid': 'TID (Three times daily)',
    'qid': 'QID (Four times daily)',
    'hs': 'HS (Bedtime)',
    'prn': 'PRN (As needed)',
    'ac': 'AC (Before meals)',
    'pc': 'PC (After meals)',
    'q4h': 'q4h',
    'q6h': 'q6h',
    'q8h': 'q8h',
    'q12h': 'q12h',
    'stat': 'STAT (Immediately)',
    'mk': 'MK (Morning & Evening)'
};

const MedicationSearchModal: React.FC<MedicationSearchModalProps> = ({ isOpen, onClose, onAdd, patientWeight, patientCrCl, medToEdit }) => {
    const [search, setSearch] = useState('');
    const [selectedMed, setSelectedMed] = useState('');
    
    // Standard Mode
    const [dose, setDose] = useState('');
    const [unit, setUnit] = useState('mg');
    const [route, setRoute] = useState('PO');
    const [freq, setFreq] = useState('Daily');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');

    // Drip Mode
    const [isDripMode, setIsDripMode] = useState(false);
    const [calcMode, setCalcMode] = useState<'dose' | 'rate'>('dose'); // 'dose' = user enters Dose, 'rate' = user enters ml/hr
    
    const [dripRate, setDripRate] = useState(''); // Holds either dose value OR ml/hr value depending on mode
    const [dripUnit, setDripUnit] = useState('mcg/kg/min');
    const [weight, setWeight] = useState(patientWeight?.toString() || '');

    // Concentration State
    const [concAmount, setConcAmount] = useState('4');
    const [concMeasure, setConcMeasure] = useState('mg');
    const [concVol, setConcVol] = useState('250');

    // Advanced Scheduling
    const [showSchedule, setShowSchedule] = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedTimes, setSelectedTimes] = useState<string[]>(['08:00']);

    // Renal Dose Check
    const [renalSuggestion, setRenalSuggestion] = useState<{adjustment: string, reasoning: string} | null>(null);
    const [checkingRenal, setCheckingRenal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (medToEdit) {
                setSearch(medToEdit.name);
                setSelectedMed(medToEdit.name);
                
                // Smarter dose parsing: splits number from unit even without space
                const doseMatch = medToEdit.dose.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z\/]+)?/);
                if (doseMatch) {
                    setDose(doseMatch[1]);
                    setUnit(doseMatch[2] || 'mg');
                } else {
                    // Fallback to simple split if regex fails (complex strings)
                    const doseParts = medToEdit.dose.split(' ');
                    if (doseParts.length > 1) {
                        setDose(doseParts[0]);
                        setUnit(doseParts.slice(1).join(' ')); 
                    } else {
                        setDose(medToEdit.dose);
                    }
                }
                
                setRoute(medToEdit.route);
                setFreq(medToEdit.frequency);
                setStartDate(medToEdit.startDate || new Date().toISOString().split('T')[0]);
                setEndDate(medToEdit.endDate || '');
                setIsDripMode(medToEdit.route.includes('Drip'));
                
                if (medToEdit.route.includes('Drip')) {
                    // Re-parse for drip specific if needed, usually dose string is enough
                    const doseParts = medToEdit.dose.split(' ');
                    setDripRate(doseParts[0]);
                    setDripUnit(doseParts.slice(1).join(' ') || 'mcg/kg/min');
                }

                if (medToEdit.specificSchedule) {
                    setShowSchedule(true);
                    setSelectedDays(medToEdit.specificSchedule.days);
                    setSelectedTimes(medToEdit.specificSchedule.times);
                } else {
                    setShowSchedule(false); // Reset if editing standard med
                }
                // Don't auto-switch mode when editing, respect the existing route
            } else {
                setSearch(''); setSelectedMed(''); 
                setDose(''); setUnit('mg'); setRoute('PO'); setFreq('Daily');
                setStartDate(new Date().toISOString().split('T')[0]);
                setEndDate('');
                setIsDripMode(false);
                setCalcMode('dose');
                setWeight(patientWeight?.toString() || '');
                setShowSchedule(false);
                setSelectedDays([]);
                setSelectedTimes(['08:00']);
                setRenalSuggestion(null);
            }
        }
    }, [isOpen, patientWeight, medToEdit]);

    // Reset renal suggestion when drug changes
    useEffect(() => {
        setRenalSuggestion(null);
        
        // Auto-show schedule for Warfarin
        if (search.toLowerCase().includes('warfarin') || search.toLowerCase().includes('coumadin')) {
            setShowSchedule(true);
            if (selectedDays.length === 0 && !medToEdit) {
                // If it's a new warfarin order, default to all days (Daily) until user changes
                setSelectedDays(DAYS);
            }
        }
    }, [search]);

    const filteredMeds = MEDICATION_DATABASE.filter(m => m.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

    const checkSmartDrug = (medName: string) => {
        if (medToEdit) return; // Don't override mode if editing

        const lowerName = medName.toLowerCase();
        
        // Check for Drip Config
        const dripKey = Object.keys(DRIP_MEDS).find(k => lowerName.includes(k.toLowerCase()));
        
        if (dripKey) {
            const config = DRIP_MEDS[dripKey as keyof typeof DRIP_MEDS];
            setDripUnit(config.unit);
            setDripRate(config.defaultDose.toString());
            if (config.defaultConc) {
                setConcAmount(config.defaultConc.amount.toString());
                setConcMeasure(config.defaultConc.unit);
                setConcVol(config.defaultConc.vol.toString());
            }

            // EXCEPTION: Lasix/Furosemide defaults to Standard Mode (mg) but pre-fills Drip config for easy toggle
            if (dripKey === 'Furosemide' || dripKey === 'Lasix') {
                setIsDripMode(false);
                setRoute('IV'); // Default to IV for Lasix
            } else {
                setIsDripMode(true);
                setRoute('IV Drip');
                setFreq('Continuous');
                return; // Skip standard route check
            }
        } else {
            setIsDripMode(false);
        }

        // Check Fixed Routes (only if we didn't force Drip Mode)
        const routeKey = Object.keys(FIXED_ROUTES).find(k => lowerName.includes(k.toLowerCase()));
        if (routeKey) {
            setRoute(FIXED_ROUTES[routeKey]);
        }
    };

    const handleFrequencyChange = (val: string) => {
        setFreq(val);
        const lower = val.toLowerCase().trim();
        if (FREQUENCY_SHORTCUTS[lower]) {
            setFreq(FREQUENCY_SHORTCUTS[lower]);
        }
    };

    const handleRenalCheck = async () => {
        if (!patientCrCl) return;
        setCheckingRenal(true);
        
        let currentDoseStr = '';
        if (isDripMode) {
             currentDoseStr = `${dripRate} ${dripUnit} (IV Drip)`;
        } else {
             currentDoseStr = `${dose}${unit} ${freq}`;
        }

        const res = await getRenalDoseSuggestion(selectedMed || search, patientCrCl, currentDoseStr);
        setRenalSuggestion(res);
        setCheckingRenal(false);
    };

    // Memo: Calculate Standard Dose from Flow Rate (ml/hr -> Dose)
    const calculatedStandardDose = useMemo(() => {
        if (calcMode !== 'rate' || !dripRate || !concAmount || !concVol) return null;
        
        const rateMlHr = parseFloat(dripRate);
        const amount = parseFloat(concAmount);
        const vol = parseFloat(concVol);
        const ptWeight = parseFloat(weight);

        if (isNaN(rateMlHr) || isNaN(amount) || isNaN(vol)) return null;
        if (dripUnit.includes('kg') && (!ptWeight || ptWeight === 0)) return null;

        let res = 0;
        
        if (dripUnit === 'mcg/kg/min') {
            const amountMcg = concMeasure === 'mg' ? amount * 1000 : amount;
            const concMcgMl = amountMcg / vol;
            res = (rateMlHr * concMcgMl) / 60 / ptWeight;
        }
        else if (dripUnit === 'mcg/kg/hr') {
            const amountMcg = concMeasure === 'mg' ? amount * 1000 : amount;
            const concMcgMl = amountMcg / vol;
            res = (rateMlHr * concMcgMl) / ptWeight;
        }
        else if (dripUnit === 'mg/hr') {
            const amountMg = concMeasure === 'g' ? amount * 1000 : amount;
            const concMgMl = amountMg / vol;
            res = rateMlHr * concMgMl;
        }
        else if (dripUnit === 'unit/min') {
            const concUnitMl = amount / vol;
            res = (rateMlHr * concUnitMl) / 60;
        }
        else if (dripUnit === 'mcg/min') {
            const amountMcg = concMeasure === 'mg' ? amount * 1000 : amount;
            const concMcgMl = amountMcg / vol;
            res = (rateMlHr * concMcgMl) / 60;
        }

        if (res < 0.1) return res.toFixed(3);
        if (res < 1) return res.toFixed(2);
        return res.toFixed(1);

    }, [calcMode, dripRate, weight, concAmount, concMeasure, concVol, dripUnit]);

    // Memo: Calculate Flow Rate from Dose (Dose -> ml/hr)
    const calculatedFlowRate = useMemo(() => {
        if (calcMode !== 'dose' || !dripRate || !concAmount || !concVol) return null;

        const doseVal = parseFloat(dripRate);
        const amount = parseFloat(concAmount);
        const vol = parseFloat(concVol);
        const ptWeight = parseFloat(weight);

        if (isNaN(doseVal) || isNaN(amount) || isNaN(vol)) return null;
        if (dripUnit.includes('kg') && (!ptWeight || ptWeight === 0)) return null;

        let res = 0;

        if (dripUnit === 'mcg/kg/min') {
             const amountMcg = concMeasure === 'mg' ? amount * 1000 : (concMeasure === 'g' ? amount * 1000000 : amount);
             const concMcgMl = amountMcg / vol;
             // Rate = (Dose * Wt * 60) / Conc
             res = (doseVal * ptWeight * 60) / concMcgMl;
        }
        else if (dripUnit === 'mcg/kg/hr') {
             const amountMcg = concMeasure === 'mg' ? amount * 1000 : (concMeasure === 'g' ? amount * 1000000 : amount);
             const concMcgMl = amountMcg / vol;
             // Rate = (Dose * Wt) / Conc
             res = (doseVal * ptWeight) / concMcgMl;
        }
        else if (dripUnit === 'mg/hr') {
             const amountMg = concMeasure === 'g' ? amount * 1000 : amount;
             const concMgMl = amountMg / vol;
             res = doseVal / concMgMl;
        }
        else if (dripUnit === 'mcg/min') {
             const amountMcg = concMeasure === 'mg' ? amount * 1000 : amount;
             const concMcgMl = amountMcg / vol;
             res = (doseVal * 60) / concMcgMl;
        }
        else if (dripUnit === 'unit/min') {
             const concUnitMl = amount / vol;
             res = (doseVal * 60) / concUnitMl;
        }

        if (res < 0.1) return res.toFixed(2);
        return res.toFixed(1);
    }, [calcMode, dripRate, weight, concAmount, concMeasure, concVol, dripUnit]);

    const handleSelectMed = (med: string) => {
        setSelectedMed(med);
        setSearch(med);
        checkSmartDrug(med);
    };

    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) setSelectedDays(prev => prev.filter(d => d !== day));
        else setSelectedDays(prev => [...prev, day]);
    };

    const handleAdd = () => {
        const nameToUse = selectedMed || search;
        if (!nameToUse) return;
        
        let finalDose = '';
        if (isDripMode) {
             if (calcMode === 'rate' && calculatedStandardDose) {
                 // User entered Rate -> save Dose
                 finalDose = `${calculatedStandardDose} ${dripUnit}`;
             } else {
                 // User entered Dose directly
                 finalDose = `${dripRate} ${dripUnit}`;
             }
        } else {
             // For standard mode, ensure we don't duplicate unit if already in dose
             if (dose.toLowerCase().endsWith(unit.toLowerCase())) {
                 finalDose = dose;
             } else {
                 finalDose = `${dose}${unit}`;
             }
        }

        onAdd({
            id: medToEdit ? medToEdit.id : Date.now().toString(),
            name: nameToUse,
            dose: finalDose,
            route: isDripMode ? 'IV Drip' : route,
            frequency: isDripMode ? 'Continuous' : freq,
            isActive: medToEdit ? medToEdit.isActive : true,
            specificSchedule: showSchedule ? { days: selectedDays, times: selectedTimes } : undefined,
            startDate,
            endDate: endDate || undefined
        });
        onClose();
    };

    const handleDiscontinue = () => {
        if (!medToEdit) return;
        const today = new Date().toISOString().split('T')[0];
        
        onAdd({
            ...medToEdit,
            isActive: false,
            endDate: today
        });
        onClose();
    };

    const handleRestart = () => {
        const nameToUse = selectedMed || search;
        if (!nameToUse) return;
        
        let finalDose = '';
        if (isDripMode) {
             if (calcMode === 'rate' && calculatedStandardDose) {
                 finalDose = `${calculatedStandardDose} ${dripUnit}`;
             } else {
                 finalDose = `${dripRate} ${dripUnit}`;
             }
        } else {
             if (dose.toLowerCase().endsWith(unit.toLowerCase())) {
                 finalDose = dose;
             } else {
                 finalDose = `${dose}${unit}`;
             }
        }

        const today = new Date().toISOString().split('T')[0];

        onAdd({
            id: medToEdit ? medToEdit.id : Date.now().toString(),
            name: nameToUse,
            dose: finalDose,
            route: isDripMode ? 'IV Drip' : route,
            frequency: isDripMode ? 'Continuous' : freq,
            isActive: true, // Reactivating
            specificSchedule: showSchedule ? { days: selectedDays, times: selectedTimes } : undefined,
            startDate: today,
            endDate: undefined
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-md shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                 <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Pill size={20}/></div>
                        <h3 className="text-lg font-bold text-main">{medToEdit ? 'Edit Medication' : 'Add Medication'}</h3>
                     </div>
                     <button onClick={onClose}><X size={20} className="text-muted hover:text-main"/></button>
                 </div>
                 
                 <div className="space-y-5">
                     {patientCrCl && (
                         <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-300 font-bold">
                                 <Calculator size={14}/> CrCl: {patientCrCl} mL/min
                             </div>
                             {(selectedMed || search) && (
                                 <button 
                                    onClick={handleRenalCheck}
                                    disabled={checkingRenal}
                                    className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold transition-colors flex items-center gap-1"
                                 >
                                     {checkingRenal ? 'Checking...' : 'Check Renal Dose'}
                                 </button>
                             )}
                         </div>
                     )}

                     {renalSuggestion && (
                         <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 animate-in fade-in">
                             <div className="flex items-start gap-2">
                                 <CheckCircle2 size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                                 <div>
                                     <div className="text-xs font-bold text-indigo-600 dark:text-indigo-300 mb-1">{renalSuggestion.adjustment}</div>
                                     <div className="text-[10px] text-indigo-800 dark:text-indigo-200 leading-tight">{renalSuggestion.reasoning}</div>
                                 </div>
                             </div>
                         </div>
                     )}

                     <div className="relative">
                         <label className="text-xs font-bold text-muted uppercase ml-1 mb-1 block">Drug Name</label>
                         <div className="relative">
                             <Search size={16} className="absolute left-3 top-3.5 text-muted" />
                             <input 
                                 value={search}
                                 onChange={(e) => { 
                                     setSearch(e.target.value); 
                                     setSelectedMed(''); 
                                 }}
                                 className="w-full bg-glass-depth border border-glass-border rounded-xl pl-10 pr-3 py-3 text-sm text-main focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                 placeholder="Search database (e.g. Norepi, Lasix)..."
                                 autoFocus={!medToEdit}
                             />
                         </div>
                         {search && !selectedMed && (
                             <div className="absolute top-full left-0 w-full bg-white/95 dark:bg-slate-900/95 border border-glass-border rounded-xl mt-1 shadow-xl z-10 overflow-hidden max-h-40 overflow-y-auto backdrop-blur-xl">
                                 {filteredMeds.map(med => (
                                     <button 
                                        key={med}
                                        onClick={() => handleSelectMed(med)}
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-glass-border/30 last:border-0 text-main"
                                     >
                                         {med}
                                     </button>
                                 ))}
                                 <button 
                                     onClick={() => handleSelectMed(search)}
                                     className="w-full text-left px-4 py-2.5 text-sm text-blue-500 font-bold bg-blue-500/5 hover:bg-blue-500/10"
                                 >
                                     + Use custom "{search}"
                                 </button>
                             </div>
                         )}
                     </div>

                     {/* Mode Toggles */}
                     <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border mb-2">
                        <button 
                            type="button"
                            onClick={() => setIsDripMode(false)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!isDripMode ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-muted hover:text-main'}`}
                        >
                            <Tablet size={14}/> Standard Dosing
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsDripMode(true)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isDripMode ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-muted hover:text-main'}`}
                        >
                            <Syringe size={14}/> IV Drip / Infusion
                        </button>
                     </div>

                     {isDripMode ? (
                         <div className="animate-in slide-in-from-top-2 bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 space-y-3">
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-wider">
                                    <Calculator size={14} /> IV Drip Calculator
                                </div>
                                <div className="flex bg-glass-depth rounded-lg p-0.5 border border-glass-border">
                                    <button 
                                        onClick={() => setCalcMode('dose')}
                                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${calcMode === 'dose' ? 'bg-blue-500 text-white shadow-sm' : 'text-muted hover:text-main'}`}
                                    >
                                        Dose Input
                                    </button>
                                    <button 
                                        onClick={() => setCalcMode('rate')}
                                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${calcMode === 'rate' ? 'bg-blue-500 text-white shadow-sm' : 'text-muted hover:text-main'}`}
                                    >
                                        Rate Input (ml/hr)
                                    </button>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-[10px] font-bold text-muted uppercase">{calcMode === 'rate' ? 'Flow Rate (ml/hr)' : 'Target Dose'}</label>
                                     <input 
                                        value={dripRate} 
                                        onChange={e => setDripRate(e.target.value)} 
                                        className="w-full bg-glass-panel border border-glass-border rounded-lg p-2 text-sm text-main font-bold" 
                                        placeholder={calcMode === 'rate' ? 'e.g. 10' : 'e.g. 0.05'} 
                                     />
                                 </div>
                                 <div>
                                     {calcMode === 'rate' ? (
                                         <div className="space-y-1">
                                             <label className="text-[10px] font-bold text-muted uppercase">Target Unit</label>
                                             <ModernSelect 
                                                value={dripUnit}
                                                onChange={setDripUnit}
                                                options={['mcg/kg/min', 'mcg/kg/hr', 'mcg/min', 'mg/hr', 'unit/min', 'unit/hr', 'mcg/hr']}
                                             />
                                         </div>
                                     ) : (
                                         <ModernSelect 
                                            value={dripUnit}
                                            onChange={setDripUnit}
                                            options={['mcg/kg/min', 'mcg/kg/hr', 'mcg/min', 'mg/hr', 'unit/min', 'unit/hr', 'mcg/hr']}
                                            label="Dose Unit"
                                         />
                                     )}
                                 </div>
                             </div>

                             <div className="animate-in fade-in slide-in-from-top-1 pt-2 border-t border-blue-500/10 mt-2">
                                 <label className="text-[10px] font-bold text-blue-500 uppercase mb-2 block">Concentration</label>
                                 <div className="flex items-end gap-2">
                                     <div className="flex-1">
                                         <label className="text-[9px] text-muted">Amount</label>
                                         <div className="flex">
                                             <input 
                                                value={concAmount}
                                                onChange={e => setConcAmount(e.target.value)}
                                                className="w-full bg-glass-panel border-y border-l border-glass-border rounded-l-lg p-1.5 text-xs text-main"
                                             />
                                             <select 
                                                value={concMeasure}
                                                onChange={e => setConcMeasure(e.target.value)}
                                                className="bg-glass-depth border border-glass-border px-1 text-[10px] text-muted outline-none rounded-r-lg"
                                             >
                                                 <option value="mg">mg</option>
                                                 <option value="mcg">mcg</option>
                                                 <option value="units">units</option>
                                                 <option value="g">g</option>
                                             </select>
                                         </div>
                                     </div>
                                     <div className="text-muted pb-2">/</div>
                                     <div className="flex-1">
                                         <label className="text-[9px] text-muted">Vol (ml)</label>
                                         <input 
                                            value={concVol}
                                            onChange={e => setConcVol(e.target.value)}
                                            className="w-full bg-glass-panel border border-glass-border rounded-lg p-1.5 text-xs text-main"
                                            placeholder="250"
                                         />
                                     </div>
                                 </div>
                             </div>

                             {/* Weight Check */}
                             {(dripUnit.includes('kg')) && (
                                 <div className="pt-1">
                                     <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1"><Weight size={10}/> Patient Weight (kg)</label>
                                     <input 
                                        value={weight} 
                                        onChange={e => setWeight(e.target.value)} 
                                        className={`w-full bg-glass-panel border rounded-lg p-2 text-sm text-main ${!weight ? 'border-red-400/50' : 'border-glass-border'}`}
                                        placeholder="Required for calculation"
                                     />
                                     {!weight && <span className="text-[10px] text-red-400">Weight required for dosing</span>}
                                 </div>
                             )}

                             {/* Result Display */}
                             <div className="text-xs bg-glass-depth p-3 rounded-lg border border-glass-border text-center mt-2 flex flex-col items-center gap-1">
                                 {calcMode === 'rate' ? (
                                     <>
                                        <div className="text-muted text-[10px] uppercase tracking-wider">Calculated Dose</div>
                                        {calculatedStandardDose ? (
                                            <div className="text-blue-600 dark:text-blue-300 font-bold text-lg flex items-center justify-center gap-2">
                                                {calculatedStandardDose} <span className="text-xs font-medium text-muted">{dripUnit}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted italic">Enter rate & concentration...</span>
                                        )}
                                     </>
                                 ) : (
                                     <>
                                        <div className="text-muted text-[10px] uppercase tracking-wider">Required Flow Rate</div>
                                        {calculatedFlowRate ? (
                                            <div className="text-blue-600 dark:text-blue-300 font-bold text-lg flex items-center justify-center gap-2">
                                                {calculatedFlowRate} <span className="text-xs font-medium text-muted">ml/hr</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted italic">Enter dose & concentration...</span>
                                        )}
                                     </>
                                 )}
                             </div>
                         </div>
                     ) : (
                         <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                             <div className="col-span-1">
                                 <label className="text-xs font-bold text-muted uppercase ml-1 mb-1 block">Dose</label>
                                 <div className="flex items-center gap-2">
                                     <input value={dose} onChange={e => setDose(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl p-2.5 text-sm text-main focus:outline-none focus:ring-1 focus:ring-blue-500/30" placeholder="500" />
                                     <div className="w-24">
                                         <ModernSelect 
                                            value={unit}
                                            onChange={setUnit}
                                            options={COMMON_UNITS}
                                         />
                                     </div>
                                 </div>
                             </div>
                             <div>
                                 <ModernSelect 
                                    value={route}
                                    onChange={setRoute}
                                    options={['PO', 'IV', 'IM', 'SC', 'SL', 'PR', 'Inhaled', 'Topical']}
                                    label="Route"
                                 />
                             </div>
                             <div className="col-span-2">
                                 <label className="text-xs font-bold text-muted uppercase ml-1 mb-1 block">Frequency</label>
                                 <input 
                                    value={freq} 
                                    onChange={e => handleFrequencyChange(e.target.value)} 
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl p-2.5 text-sm text-main focus:outline-none focus:ring-1 focus:ring-blue-500/30" 
                                    placeholder="e.g. BID, Q6H, Daily" 
                                 />
                                 <div className="text-[10px] text-muted mt-1 ml-1">Try: "od", "bid", "hs", "prn"</div>
                             </div>
                         </div>
                     )}

                     {/* Date & Schedule */}
                     <div className="pt-2 border-t border-glass-border">
                         <div className="grid grid-cols-2 gap-3 mb-2">
                             <div>
                                 <label className="text-[10px] font-bold text-muted uppercase ml-1 block">Start Date</label>
                                 <input 
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-xs text-main outline-none"
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-muted uppercase ml-1 block">End Date (Optional)</label>
                                 <input 
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-xs text-main outline-none"
                                 />
                             </div>
                         </div>

                         <button 
                            type="button"
                            onClick={() => setShowSchedule(!showSchedule)}
                            className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:text-blue-600 mt-2"
                         >
                             {showSchedule ? 'Hide Schedule' : '+ Advanced Schedule (Days/Time)'}
                         </button>
                         
                         {showSchedule && (
                             <div className="mt-3 p-3 bg-glass-depth rounded-xl border border-glass-border animate-in slide-in-from-top-2">
                                 <label className="text-[10px] font-bold text-muted uppercase mb-2 block">Specific Days</label>
                                 <div className="flex justify-between mb-3">
                                     {DAYS.map(day => (
                                         <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`
                                                w-8 h-8 rounded-full text-[10px] font-bold transition-all flex items-center justify-center
                                                ${selectedDays.includes(day) ? 'bg-blue-500 text-white' : 'bg-glass-panel text-muted hover:bg-blue-500/10'}
                                            `}
                                         >
                                             {day.substring(0, 1)}
                                         </button>
                                     ))}
                                 </div>
                                 
                                 <label className="text-[10px] font-bold text-muted uppercase mb-2 block">Admin Times</label>
                                 <div className="flex flex-wrap gap-2">
                                     {selectedTimes.map((time, idx) => (
                                         <div key={idx} className="flex items-center gap-1 bg-glass-panel px-2 py-1 rounded-lg border border-glass-border">
                                             <input 
                                                type="time" 
                                                value={time}
                                                onChange={(e) => {
                                                    const newTimes = [...selectedTimes];
                                                    newTimes[idx] = e.target.value;
                                                    setSelectedTimes(newTimes);
                                                }}
                                                className="bg-transparent text-xs text-main outline-none"
                                             />
                                             <button 
                                                onClick={() => setSelectedTimes(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-red-400 hover:text-red-600"
                                             >
                                                 <X size={12} />
                                             </button>
                                         </div>
                                     ))}
                                     <button 
                                        onClick={() => setSelectedTimes(prev => [...prev, '08:00'])}
                                        className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-lg border border-blue-500/20 hover:bg-blue-500/20"
                                     >
                                         + Time
                                     </button>
                                 </div>
                             </div>
                         )}
                     </div>

                     <div className="flex gap-3">
                        {medToEdit && medToEdit.isActive && (
                             <button 
                                onClick={handleDiscontinue}
                                className="px-4 py-3 rounded-xl border border-red-500/30 text-red-500 font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                             >
                                 <StopCircle size={18} /> Stop
                             </button>
                        )}
                        
                        {medToEdit && !medToEdit.isActive ? (
                             <button 
                                onClick={handleRestart}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-500/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={18} /> Restart Medication
                            </button>
                        ) : (
                            <button 
                                onClick={handleAdd}
                                disabled={(!search && !selectedMed) || (isDripMode && dripUnit.includes('kg') && !weight)}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                            >
                                {medToEdit ? 'Update Medication' : 'Add Medication'}
                            </button>
                        )}
                     </div>
                 </div>
             </div>
        </div>
    );
};

export default MedicationSearchModal;
