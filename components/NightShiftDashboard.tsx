import React, { useState, useMemo, useEffect } from 'react';
import { Patient, TaskPriority, Acuity, TimelineEvent, Antibiotic } from '../types';
import { Moon, Search, CheckCircle2, AlertTriangle, ShieldAlert, LogOut, Clock, BedDouble, Phone, HeartPulse, MoreVertical, X, Filter, ChevronDown, ChevronUp, MapPin, Activity, Calendar, FileText, FlaskConical, Pill, Bug, Stethoscope, ArrowUp, ArrowDown, Minus, ClipboardList, PenLine, Save, CheckSquare, Sparkles, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatToBuddhistEra } from '../services/dateService';

interface NightShiftDashboardProps {
  patients: Patient[];
  onToggleTask: (patientId: string, taskId: string) => void;
  onUpdatePatient: (patient: Patient) => void;
  onLogout: () => void;
  isDarkMode: boolean; // Retained for prop compatibility
  toggleTheme: () => void; // Retained for prop compatibility
}

interface NightShiftPatientCardProps {
    patient: Patient;
    isCritical?: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdatePatient: (p: Patient) => void;
    onToggleTask?: (patientId: string, taskId: string) => void;
}

const NIGHT_QUOTES = [
    "The darker the night, the brighter the stars.",
    "While the world sleeps, we watch.",
    "Night shift: Because zombies need doctors too.",
    "Coffee: The most important meal of the night.",
    "You're doing great. The sun will rise again.",
    "Not all heroes wear capes, some wear scrubs at 3 AM.",
    "Quiet nights are a myth, but you got this.",
    "Stay sharp, stay safe, stay caffeinated.",
    "Saving lives while the city dreams.",
    "The night is long, but your coffee is strong.",
    "Guardians of the graveyard shift.",
    "Keep calm and survive the night shift.",
    "อดทนหน่อยนะ เดี๋ยวก็เช้าแล้ว (Hang in there, morning is coming)",
    "คุณทำหน้าที่ได้ดีที่สุดแล้ว (You are doing your best)",
    "คืนนี้ยาวนาน แต่ความตั้งใจเรายาวนานกว่า (The night is long, but our dedication is longer)",
    "สู้ๆ คุณหมอ (Fighting, Doctor!)"
];

const MiniTimeline = ({ antibiotics }: { antibiotics: Antibiotic[] }) => {
    const days = 7; 
    const today = new Date();
    today.setHours(23,59,59,999);
    
    // Generate dates (Today and 6 days back)
    const dates = Array.from({length: days}, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (days - 1) + i);
        return d;
    });

    return (
        <div className="overflow-x-auto w-full">
            <div className="flex justify-end mb-1 px-1 gap-1">
                {dates.map((d, i) => (
                    <div key={i} className={`text-[8px] font-mono text-center w-6 ${d.getDate() === new Date().getDate() ? 'text-blue-400 font-bold' : 'text-muted/50'}`}>
                        {d.getDate()}/{d.getMonth()+1}
                    </div>
                ))}
            </div>
            <div className="space-y-1.5">
                {antibiotics.map(abx => {
                    const start = new Date(abx.startDate);
                    start.setHours(0,0,0,0);
                    const end = abx.endDate ? new Date(abx.endDate) : new Date(today.getTime() + 86400000 * 365);
                    end.setHours(23,59,59,999);

                    return (
                        <div key={abx.id} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 text-[9px] text-slate-300 truncate text-right pr-2" title={abx.name}>{abx.name}</div>
                            <div className="flex gap-1">
                                {dates.map((d, i) => {
                                    const dStart = new Date(d); dStart.setHours(0,0,0,0);
                                    const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
                                    
                                    const isActive = dEnd >= start && dStart <= end;
                                    const isCurrent = d.getDate() === new Date().getDate();
                                    
                                    return (
                                        <div key={i} className={`w-6 h-3 rounded-sm ${isActive ? (isCurrent ? 'bg-green-500' : 'bg-blue-500/60') : 'bg-white/5'}`}></div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
};

const NightShiftPatientCard: React.FC<NightShiftPatientCardProps> = ({ 
    patient, 
    isCritical, 
    isExpanded, 
    onToggleExpand, 
    onUpdatePatient 
}) => {
    const [activeTab, setActiveTab] = useState<'handoff' | 'clinical' | 'labs' | 'meds' | 'micro'>('handoff');
    const [expandedLab, setExpandedLab] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);
    
    // Checklist State
    const [actionItems, setActionItems] = useState<{text: string, done: boolean}[]>([]);
    const [newItemText, setNewItemText] = useState('');

    // Initialize Checklist from Text
    useEffect(() => {
        if (patient.handoff.actionList) {
            const lines = patient.handoff.actionList.split('\n').filter(l => l.trim().length > 0);
            const items = lines.map(line => {
                const isDone = line.startsWith('✅ ') || line.startsWith('[x] ');
                const cleanText = line.replace(/^✅\s*|^\[x\]\s*|^\[\s*\]\s*/, '');
                return { text: cleanText, done: isDone };
            });
            setActionItems(items);
        } else {
            setActionItems([]);
        }
    }, [patient.handoff.actionList]);

    const updateActionList = (newItems: {text: string, done: boolean}[]) => {
        // Save back to text format
        const newText = newItems.map(item => `${item.done ? '✅ ' : ''}${item.text}`).join('\n');
        onUpdatePatient({
            ...patient,
            handoff: {
                ...patient.handoff,
                actionList: newText
            }
        });
    };

    const handleToggleActionItem = (index: number) => {
        const newItems = [...actionItems];
        newItems[index].done = !newItems[index].done;
        updateActionList(newItems);
    };

    const handleAddActionItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemText.trim()) return;
        const newItems = [...actionItems, { text: newItemText.trim(), done: false }];
        updateActionList(newItems);
        setNewItemText('');
    };

    const handleRemoveActionItem = (index: number) => {
        const newItems = actionItems.filter((_, i) => i !== index);
        updateActionList(newItems);
    };

    const handleSaveNote = () => {
        if (!noteDraft.trim()) return;
        
        const newEvent: TimelineEvent = {
            id: Date.now().toString(),
            title: 'Night Shift Note',
            date: new Date().toISOString(),
            type: 'Other',
            notes: noteDraft,
            status: 'Completed'
        };
        
        onUpdatePatient({
            ...patient,
            timeline: [...(patient.timeline || []), newEvent]
        });
        
        setNoteDraft('');
        setIsAddingNote(false);
    };

    // Helper to get lab data including history
    const getLabData = (type: 'creatinine' | 'wbc' | 'hgb' | 'k' | 'na') => {
        const arr = patient.labs[type];
        if (!arr || arr.length === 0) return { current: '--', prev: null, trend: 'flat', history: [] };
        
        const current = arr[arr.length - 1];
        const prev = arr.length > 1 ? arr[arr.length - 2] : null;
        
        let trend = 'flat';
        if (prev) {
            const currVal = parseFloat(String(current.value));
            const prevVal = parseFloat(String(prev.value));
            if (!isNaN(currVal) && !isNaN(prevVal)) {
                if (currVal > prevVal) trend = 'up';
                else if (currVal < prevVal) trend = 'down';
            }
        }
        
        return {
            current: current.value,
            prev: prev ? prev.value : null,
            trend,
            history: arr.slice().reverse().slice(0, 5) // Last 5, reversed (newest first)
        };
    };

    const renderLabBox = (label: string, type: 'creatinine' | 'wbc' | 'hgb' | 'k' | 'na') => {
        const data = getLabData(type);
        const isExpanded = expandedLab === type;
        
        // Critical Value Coloring
        let colorClass = 'text-blue-400';
        const numVal = parseFloat(String(data.current));
        
        if (!isNaN(numVal)) {
            if (type === 'creatinine' && numVal > 1.5) colorClass = 'text-red-400';
            else if (type === 'k' && (numVal < 3.5 || numVal > 5.5)) colorClass = 'text-red-400';
            else if (type === 'hgb' && numVal < 8) colorClass = 'text-red-400';
            else if (type === 'wbc' && (numVal > 12 || numVal < 4)) colorClass = 'text-red-400';
            else if (type === 'na' && (numVal < 130 || numVal > 150)) colorClass = 'text-red-400';
        }

        return (
            <div 
                className={`
                    p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center
                    ${isExpanded ? 'bg-glass-panel border-indigo-500 ring-1 ring-indigo-500/50 z-10' : 'bg-glass-depth border-glass-border hover:bg-glass-panel'}
                `}
                onClick={() => setExpandedLab(isExpanded ? null : type)}
            >
                <span className="text-[10px] text-muted uppercase font-bold">{label}</span>
                <div className="flex items-center gap-1">
                    <span className={`text-xl font-bold ${colorClass}`}>{data.current}</span>
                    {data.trend === 'up' && <ArrowUp size={12} className="text-muted"/>}
                    {data.trend === 'down' && <ArrowDown size={12} className="text-muted"/>}
                </div>
                {data.prev && !isExpanded && (
                    <span className="text-[9px] text-muted/60 font-mono">Prev: {data.prev}</span>
                )}
                
                {isExpanded && data.history.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-glass-border w-full animate-in slide-in-from-top-1 fade-in duration-200">
                        <div className="space-y-1">
                            {data.history.map((h: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-[10px]">
                                    <span className="text-muted">{new Date(h.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                    <span className="text-main font-mono">{h.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const activeAbx = patient.antibiotics.filter(a => !a.endDate || new Date(a.endDate) >= new Date(new Date().setHours(0,0,0,0)));
    const prevAbx = patient.antibiotics.filter(a => a.endDate && new Date(a.endDate) < new Date(new Date().setHours(0,0,0,0)));

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative overflow-hidden rounded-2xl border transition-all duration-300 backdrop-blur-xl
                ${isCritical 
                    ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.1)]' 
                    : 'bg-glass-panel border-glass-border hover:border-indigo-500/30'}
                ${isExpanded ? 'ring-1 ring-indigo-500/30 bg-glass-panel' : ''}
            `}
        >
            {/* Critical Indicator Strip */}
            {isCritical && patient.acuity === Acuity.UNSTABLE && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
            )}
            {isCritical && patient.acuity === Acuity.WATCH && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
            )}

            <div className="p-4 sm:p-5 cursor-pointer" onClick={onToggleExpand}>
                <div className="flex justify-between items-start gap-3">
                    
                    {/* Bed Label - Redesigned for Night Shift */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`
                            relative min-w-[4rem] h-16 px-3 rounded-2xl shrink-0 flex items-center justify-center border-2 overflow-hidden transition-all duration-300 group
                            ${isCritical 
                                ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_25px_rgba(220,38,38,0.25)]' 
                                : 'bg-slate-900/40 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]'}
                        `}>
                            {/* Inner Glass Layer */}
                            <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${isCritical ? 'from-red-500 to-transparent' : 'from-indigo-500 to-transparent'}`}></div>
                            
                            {/* Number */}
                            <span className={`relative z-10 text-2xl font-mono font-bold tracking-tighter whitespace-nowrap ${isCritical ? 'text-red-50 drop-shadow-[0_2px_4px_rgba(220,38,38,0.5)]' : 'text-white drop-shadow-[0_2px_4px_rgba(99,102,241,0.5)]'}`}>
                                {patient.roomNumber}
                            </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-main truncate text-lg tracking-tight">{patient.name}</h3>
                                {patient.isolation !== 'None' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase font-bold tracking-wider">
                                        {patient.isolation}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-muted truncate flex items-center gap-2 mt-1">
                                <span className="bg-glass-depth px-2 py-0.5 rounded text-main border border-glass-border font-mono">{patient.age}{patient.gender}</span>
                                <span className="truncate opacity-80">{patient.diagnosis}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Icons */}
                    <div className="flex flex-col items-end gap-1">
                        {actionItems.some(i => !i.done) && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                                <Clock size={12}/> Handoff Action
                            </div>
                        )}
                    </div>
                </div>

                {/* Minimized Context - Show One Liner if critical or expanded */}
                {(isCritical || isExpanded) && (
                    <div className="mt-4 text-sm text-main bg-glass-depth p-3 rounded-xl border border-glass-border leading-relaxed font-medium">
                        {patient.oneLiner}
                    </div>
                )}
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-glass-border bg-glass-depth/30"
                    >
                        {/* Internal Tabs */}
                        <div className="flex border-b border-glass-border overflow-x-auto scrollbar-none">
                            {[
                                { id: 'handoff', label: 'Handoff', icon: <Clock size={14}/> },
                                { id: 'clinical', label: 'Clinical', icon: <FileText size={14}/> },
                                { id: 'labs', label: 'Labs', icon: <FlaskConical size={14}/> },
                                { id: 'meds', label: 'Meds', icon: <Pill size={14}/> },
                                { id: 'micro', label: 'Infection', icon: <Bug size={14}/> },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2
                                        ${activeTab === tab.id 
                                            ? 'text-indigo-400 border-indigo-500 bg-glass-depth' 
                                            : 'text-muted border-transparent hover:text-main hover:bg-glass-depth'}
                                    `}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 min-h-[200px]">
                            {/* HANDOFF TAB */}
                            {activeTab === 'handoff' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between bg-glass-depth p-3 rounded-xl border border-glass-border">
                                            <span className="text-xs font-bold text-muted uppercase">Code Status</span>
                                            <div className={`text-sm font-bold ${patient.advancedCarePlan.category === 'Full Code' ? 'text-green-400' : 'text-red-400'}`}>
                                                {patient.advancedCarePlan.category === 'Advanced Care Plan' ? 'DNR / DNI' : patient.advancedCarePlan.category}
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                            <div className="text-xs font-bold text-red-400 uppercase mb-1 flex items-center gap-1">
                                                <ShieldAlert size={12}/> If Status Worsens (Contingency)
                                            </div>
                                            <p className="text-sm text-red-200/90">
                                                {patient.handoff.contingencies || "No specific contingency. Standard ACLS/Protocol."}
                                            </p>
                                        </div>

                                        {patient.handoff.situationAwareness && (
                                            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                                <div className="text-xs font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                                                    <Activity size={12}/> Situation Awareness
                                                </div>
                                                <p className="text-sm text-indigo-200/90">
                                                    {patient.handoff.situationAwareness}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {/* Add Note Button */}
                                        {!isAddingNote ? (
                                            <button 
                                                onClick={() => setIsAddingNote(true)}
                                                className="w-full py-2 rounded-xl border border-dashed border-glass-border text-muted hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-xs font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <PenLine size={14}/> Add Night Note
                                            </button>
                                        ) : (
                                            <div className="bg-glass-depth rounded-xl p-3 border border-glass-border animate-in fade-in">
                                                <div className="text-xs font-bold text-main mb-2">New Note</div>
                                                <textarea
                                                    value={noteDraft}
                                                    onChange={e => setNoteDraft(e.target.value)}
                                                    placeholder="Enter brief update..."
                                                    className="w-full bg-glass-panel border border-glass-border rounded-lg p-2 text-sm text-main outline-none focus:border-indigo-500 mb-2 h-20 resize-none placeholder-muted"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setIsAddingNote(false)} className="flex-1 py-1.5 rounded-lg border border-glass-border text-muted text-xs hover:bg-glass-panel">Cancel</button>
                                                    <button onClick={handleSaveNote} disabled={!noteDraft.trim()} className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-50">Save Note</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {/* Action List Checklist */}
                                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 shadow-sm flex flex-col h-full">
                                            <div className="text-sm font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                                                <CheckSquare size={16}/> Handover Checklist (ฝากเวร)
                                            </div>
                                            
                                            <div className="flex-1 space-y-2 mb-3">
                                                {actionItems.length > 0 ? (
                                                    actionItems.map((item, idx) => (
                                                        <div 
                                                            key={idx}
                                                            className={`
                                                                flex items-center gap-3 p-2 rounded-lg transition-all border group relative
                                                                ${item.done 
                                                                    ? 'bg-green-500/10 border-green-500/20 opacity-70' 
                                                                    : 'bg-glass-panel border-glass-border hover:bg-glass-depth hover:border-white/20'}
                                                            `}
                                                        >
                                                            <div 
                                                                onClick={() => handleToggleActionItem(idx)}
                                                                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${item.done ? 'bg-green-500 border-green-500' : 'border-muted hover:border-white'}`}
                                                            >
                                                                {item.done && <CheckCircle2 size={12} className="text-white"/>}
                                                            </div>
                                                            <span 
                                                                onClick={() => handleToggleActionItem(idx)}
                                                                className={`text-sm flex-1 cursor-pointer select-none ${item.done ? 'text-muted line-through' : 'text-main'}`}
                                                            >
                                                                {item.text}
                                                            </span>
                                                            <button 
                                                                onClick={() => handleRemoveActionItem(idx)}
                                                                className="text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                            >
                                                                <X size={14}/>
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-4 text-muted text-sm italic border-2 border-dashed border-glass-border rounded-lg">
                                                        No specific actions listed.
                                                    </div>
                                                )}
                                            </div>

                                            <form onSubmit={handleAddActionItem} className="flex gap-2 mt-auto">
                                                <input 
                                                    type="text" 
                                                    value={newItemText}
                                                    onChange={(e) => setNewItemText(e.target.value)}
                                                    placeholder="Add quick task..."
                                                    className="flex-1 bg-glass-depth border border-glass-border rounded-lg px-3 py-1.5 text-sm text-main outline-none focus:ring-1 focus:ring-blue-500/50 placeholder-muted/60"
                                                />
                                                <button 
                                                    type="submit" 
                                                    disabled={!newItemText.trim()}
                                                    className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg disabled:opacity-50 transition-colors"
                                                >
                                                    <Plus size={18}/>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CLINICAL TAB */}
                            {activeTab === 'clinical' && (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs font-bold text-muted uppercase mb-1">Diagnosis</div>
                                                <div className="text-sm text-main bg-glass-depth p-3 rounded-xl border border-glass-border">
                                                    {patient.diagnosis}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-muted uppercase mb-1">Underlying Conditions</div>
                                                <div className="text-sm text-main bg-glass-depth p-3 rounded-xl border border-glass-border">
                                                    {patient.underlyingConditions || 'None documented'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs font-bold text-muted uppercase mb-1">Admission Note (HPI)</div>
                                                <div className="text-sm text-main bg-glass-depth p-3 rounded-xl border border-glass-border max-h-40 overflow-y-auto custom-scrollbar">
                                                    {patient.admissionNote?.presentIllness || 'No admission HPI recorded.'}
                                                </div>
                                            </div>
                                            {patient.ekgs && patient.ekgs.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-bold text-red-400 uppercase mb-1 flex items-center gap-1">
                                                        <HeartPulse size={12}/> Recent EKG
                                                    </div>
                                                    <div className="text-xs text-red-200 bg-red-900/10 p-3 rounded-xl border border-red-500/20">
                                                        <div className="font-bold">{formatToBuddhistEra(patient.ekgs[0].date)}: {patient.ekgs[0].impression}</div>
                                                        <div className="mt-1 opacity-80">{patient.ekgs[0].rate} bpm, {patient.ekgs[0].rhythm}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LABS TAB */}
                            {activeTab === 'labs' && (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                        {renderLabBox('Creatinine', 'creatinine')}
                                        {renderLabBox('Potassium', 'k')}
                                        {renderLabBox('Sodium', 'na')}
                                        {renderLabBox('WBC', 'wbc')}
                                        {renderLabBox('Hgb', 'hgb')}
                                    </div>
                                    
                                    {patient.labs.others.length > 0 && (
                                        <div>
                                            <div className="text-xs font-bold text-muted uppercase mb-2">Other Labs</div>
                                            <div className="flex flex-wrap gap-2">
                                                {patient.labs.others.map((lab, i) => {
                                                    const history = lab.values.slice().reverse().slice(0, 5);
                                                    const latest = history[0];
                                                    const isExpanded = expandedLab === lab.name;
                                                    
                                                    return (
                                                        <div 
                                                            key={i} 
                                                            onClick={() => setExpandedLab(isExpanded ? null : lab.name)}
                                                            className={`
                                                                px-3 py-1.5 rounded-lg border text-xs text-main cursor-pointer transition-all
                                                                ${isExpanded ? 'bg-glass-panel border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-glass-depth border-glass-border hover:bg-glass-panel'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-muted">{lab.name}:</span> 
                                                                <span>{latest ? latest.value : '--'} {lab.unit}</span>
                                                                {isExpanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                                                            </div>
                                                            
                                                            {isExpanded && history.length > 0 && (
                                                                <div className="mt-2 pt-1 border-t border-glass-border/50 space-y-1">
                                                                    {history.map((h, idx) => (
                                                                        <div key={idx} className="flex justify-between text-[10px] text-muted">
                                                                            <span>{formatToBuddhistEra(h.date, { month: 'short', day: 'numeric' })}</span>
                                                                            <span className="font-mono text-main">{h.value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MEDS TAB */}
                            {activeTab === 'meds' && (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1">
                                                <Pill size={12}/> IV / Drips (Active)
                                            </div>
                                            <div className="space-y-2">
                                                {patient.medications.filter(m => m.isActive && (m.route.includes('IV') || m.route.includes('Drip'))).map(m => (
                                                    <div key={m.id} className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                                                        <div className="font-bold text-blue-100">{m.name}</div>
                                                        <div className="text-xs text-blue-300">{m.dose} • {m.frequency}</div>
                                                    </div>
                                                ))}
                                                {patient.medications.filter(m => m.isActive && (m.route.includes('IV') || m.route.includes('Drip'))).length === 0 && (
                                                    <div className="text-xs text-muted italic">No active IV meds.</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                                                <Pill size={12}/> Oral / Other
                                            </div>
                                            <div className="space-y-2">
                                                {patient.medications.filter(m => m.isActive && !m.route.includes('IV') && !m.route.includes('Drip')).map(m => (
                                                    <div key={m.id} className="p-3 rounded-xl bg-glass-depth border border-glass-border text-sm">
                                                        <div className="font-bold text-main">{m.name}</div>
                                                        <div className="text-xs text-muted">{m.dose} • {m.frequency}</div>
                                                    </div>
                                                ))}
                                                {patient.medications.filter(m => m.isActive && !m.route.includes('IV') && !m.route.includes('Drip')).length === 0 && (
                                                    <div className="text-xs text-muted italic">No oral meds.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* MICRO TAB */}
                            {activeTab === 'micro' && (
                                <div className="space-y-4 animate-in fade-in">
                                    {/* Timeline */}
                                    {(patient.antibiotics.length > 0) && (
                                         <div className="bg-black/20 p-3 rounded-xl border border-white/5 mb-2">
                                             <div className="text-[10px] font-bold text-muted uppercase mb-2">7-Day Antibiotic Timeline</div>
                                             <MiniTimeline antibiotics={patient.antibiotics} />
                                         </div>
                                    )}

                                    {/* Active ABX */}
                                    <div>
                                        <div className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            Current Antibiotics
                                        </div>
                                        {activeAbx.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {activeAbx.map(abx => {
                                                    const days = Math.floor((new Date().getTime() - new Date(abx.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                                    return (
                                                        <div key={abx.id} className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex justify-between items-center">
                                                            <div>
                                                                <div className="font-bold text-green-200 text-sm">{abx.name}</div>
                                                                <div className="text-xs text-green-400">{abx.dose} • {abx.indication}</div>
                                                            </div>
                                                            <div className="text-xs font-bold text-green-300 bg-green-500/20 px-2 py-1 rounded">Day {days}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-muted italic">No active antibiotics.</div>
                                        )}
                                    </div>

                                    {/* Previous ABX */}
                                    {prevAbx.length > 0 && (
                                        <div>
                                            <div className="text-xs font-bold text-muted uppercase mb-2 mt-2">Previous Antibiotics</div>
                                            <div className="space-y-1">
                                                {prevAbx.map(abx => (
                                                    <div key={abx.id} className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/10 text-xs text-muted">
                                                        <div><span className="text-slate-300">{abx.name}</span> <span className="opacity-50">({abx.indication})</span></div>
                                                        <div className="font-mono text-[10px]">{formatToBuddhistEra(abx.startDate, { month: 'short', day: 'numeric' })} - {abx.endDate ? formatToBuddhistEra(abx.endDate, { month: 'short', day: 'numeric' }) : 'Present'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cultures */}
                                    <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                                        <div className="text-xs font-bold text-orange-400 uppercase">Cultures & Sensitivities</div>
                                        {patient.microbiology && patient.microbiology.length > 0 ? patient.microbiology.map((c, idx) => (
                                            <div key={c.id} className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-bold text-orange-200">{c.specimen}</span>
                                                    <span className="text-[10px] text-orange-300 bg-orange-500/20 px-1.5 py-0.5 rounded">{c.status}</span>
                                                </div>
                                                <div className="text-xs text-orange-100/80 mb-2 font-medium">
                                                    {c.organism || 'No growth / Pending'}
                                                </div>
                                                {c.sensitivity && c.sensitivity.length > 0 && (
                                                    <div className="bg-black/20 rounded-lg p-2 text-[10px]">
                                                        <div className="grid grid-cols-3 gap-1 opacity-70 mb-1 font-bold border-b border-white/10 pb-1">
                                                            <span>Drug</span><span className="text-center">MIC</span><span className="text-right">Res</span>
                                                        </div>
                                                        {c.sensitivity.map((s, i) => (
                                                            <div key={i} className="grid grid-cols-3 gap-1 py-0.5">
                                                                <span className="truncate">{s.antibiotic}</span>
                                                                <span className="text-center font-mono text-muted">{s.mic || '-'}</span>
                                                                <span className={`text-right font-bold ${s.interpretation === 'S' ? 'text-green-400' : s.interpretation === 'R' ? 'text-red-400' : 'text-yellow-400'}`}>{s.interpretation}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <div className="text-xs text-muted italic">No culture data.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const NightShiftDashboard: React.FC<NightShiftDashboardProps> = ({ patients, onToggleTask, onUpdatePatient, onLogout, isDarkMode, toggleTheme }) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'handoffs'>('all');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote, setQuote] = useState('');

  // Clock Update & Quote Setup
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setQuote(NIGHT_QUOTES[Math.floor(Math.random() * NIGHT_QUOTES.length)]);
    return () => clearInterval(timer);
  }, []);

  const filteredPatients = useMemo(() => {
    let result = patients.filter(p => p.status !== 'Discharged');
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.roomNumber.toLowerCase().includes(q));
    }

    if (filterMode === 'handoffs') {
      result = result.filter(p => p.handoff.actionList && p.handoff.actionList.trim().length > 0);
    }

    return result;
  }, [patients, search, filterMode]);

  // Group by Acuity
  const criticalPatients = filteredPatients.filter(p => p.acuity === Acuity.UNSTABLE || p.acuity === Acuity.WATCH);
  const stablePatients = filteredPatients.filter(p => p.acuity === Acuity.STABLE);

  // Stats
  const activeHandoffsCount = patients.reduce((acc, p) => acc + (p.handoff.actionList && p.handoff.actionList.trim().length > 0 ? 1 : 0), 0);
  const criticalCount = patients.filter(p => p.acuity === Acuity.UNSTABLE).length;

  return (
    <div className="dark min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-slate-200 font-sans font-thai selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* Ambient Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px]"></div>
        </div>
        
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 h-20 bg-glass-panel border-b border-glass-border backdrop-blur-xl z-50 px-4 md:px-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                    <Moon size={24} className="fill-indigo-300 text-indigo-100" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-main tracking-tight">Night Mode</h1>
                    <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Stats Pills */}
                <div className="hidden md:flex items-center gap-3 mr-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertTriangle size={14} className="text-red-500" />
                        <span className="text-xs font-bold text-red-400">{criticalCount} Critical</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <Clock size={14} className="text-blue-500" />
                        <span className="text-xs font-bold text-blue-400">{activeHandoffsCount} Active Handoffs</span>
                    </div>
                </div>

                <button onClick={onLogout} className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
                    <LogOut size={20} />
                </button>
            </div>
        </header>

        {/* Floating Filter Bar (Sticky) */}
        <div className="fixed top-24 left-0 right-0 z-40 px-4 md:px-8 pointer-events-none">
            <div className="max-w-4xl mx-auto flex gap-3 pointer-events-auto">
                <div className="flex-1 relative shadow-lg">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Room, Name, Diagnosis..." 
                        className="w-full bg-glass-depth border border-glass-border rounded-xl pl-10 pr-4 py-3 text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-md transition-all"
                    />
                </div>
                <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border backdrop-blur-md shadow-lg">
                    <button 
                        onClick={() => setFilterMode('all')} 
                        className={`px-4 rounded-lg text-xs font-bold transition-all ${filterMode === 'all' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted hover:text-main'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilterMode('handoffs')} 
                        className={`px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${filterMode === 'handoffs' ? 'bg-blue-600 text-white shadow-md' : 'text-muted hover:text-main'}`}
                    >
                        With Actions
                    </button>
                </div>
            </div>
        </div>

        {/* Main Feed */}
        <main className="pt-44 pb-20 px-4 md:px-8 max-w-4xl mx-auto space-y-8">
            
            {/* Critical Section */}
            {criticalPatients.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                        <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider">Critical / Watch ({criticalPatients.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {criticalPatients.map(p => (
                            <NightShiftPatientCard 
                                key={p.id} 
                                patient={p} 
                                isCritical={true} 
                                isExpanded={expandedPatientId === p.id}
                                onToggleExpand={() => setExpandedPatientId(expandedPatientId === p.id ? null : p.id)}
                                onToggleTask={onToggleTask}
                                onUpdatePatient={onUpdatePatient}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Stable Section */}
            {stablePatients.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Stable / Floor ({stablePatients.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {stablePatients.map(p => (
                            <NightShiftPatientCard 
                                key={p.id} 
                                patient={p} 
                                isExpanded={expandedPatientId === p.id}
                                onToggleExpand={() => setExpandedPatientId(expandedPatientId === p.id ? null : p.id)}
                                onToggleTask={onToggleTask}
                                onUpdatePatient={onUpdatePatient}
                            />
                        ))}
                    </div>
                </section>
            )}

            {filteredPatients.length === 0 && (
                <div className="text-center py-20 text-muted">
                    <p className="text-lg">No patients found.</p>
                    <p className="text-sm opacity-60 mt-1">Try adjusting your filters.</p>
                </div>
            )}

            {/* Motivational Quote Footer */}
            <div className="mt-12 mb-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-glass-depth border border-glass-border text-indigo-300/60 text-xs font-medium italic backdrop-blur-md">
                    <Sparkles size={12} className="text-indigo-400" />
                    "{quote}"
                </div>
            </div>
        </main>
    </div>
  );
};

export default NightShiftDashboard;
