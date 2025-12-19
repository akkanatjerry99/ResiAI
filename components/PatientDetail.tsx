import React, { useState, useEffect, useMemo } from 'react';
import { Patient, Task, TaskPriority, LabValue, Consultation, Medication, ProblemEntry, ScannedDemographics, CultureResult, Antibiotic, TimelineEvent, EventType, ImagingStudy, MicroscopyResult, EKG, DailyRound, AdvancedCarePlan, ClinicalAdmissionNote, RawLabResult } from '../types';
import { ArrowLeft, Activity, FileText, FlaskConical, Users, CheckCircle2, AlertCircle, Plus, Pencil, Trash2, X, Bed, Undo2, Redo2, Search, Clock, Scan, HeartPulse, ToggleLeft, ToggleRight, ChevronRight, AlertTriangle, Bug, Pill, LayoutGrid, LineChart, BrainCircuit, Syringe, Image, Hourglass, AlertOctagon, Microscope, ClipboardList, Stethoscope, Sparkles, Calendar, PlayCircle, MapPin, Maximize2, Shield, CreditCard, Wind, Heart, Utensils, Droplet, Thermometer, LogOut, History, ShieldCheck, Loader2, ShieldAlert, Info } from 'lucide-react';
import { AreaChart, Area, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import AddTaskModal from './AddTaskModal';
import ClinicalScanModal from './ClinicalScanModal';
import ManualAdmissionModal from './ManualAdmissionModal';
import AddConsultModal from './AddConsultModal';
import ProblemScanModal from './ProblemScanModal';
import WarfarinManagerModal from './WarfarinManagerModal';
import MedicationSearchModal from './MedicationSearchModal';
import MicroScanModal from './MicroScanModal';
import AddAntibioticModal from './AddAntibioticModal';
import EditCultureModal from './EditCultureModal';
import AddEventModal from './AddEventModal';
import ABGAnalysisModal from './ABGAnalysisModal';
import ImagingImportModal from './ImagingImportModal';
import ImagePreviewModal from './ImagePreviewModal';
import AddPBSModal from './AddPBSModal';
import AddEKGModal from './AddEKGModal';
import RoundingModal from './RoundingModal'; 
import ManualProblemModal from './ManualProblemModal';
import ManualLabModal from './ManualLabModal';
import EditPatientModal from './EditPatientModal';
import DischargeModal from './DischargeModal';
import MedicationReconciliationModal from './MedicationReconciliationModal';
import MedicationScanModal from './MedicationScanModal';
import DrugInteractionModal from './DrugInteractionModal';
import { generateOneLiner } from '../services/geminiService';
import LabTableView from './LabTableView';
import { formatToBuddhistEra } from '../services/dateService';
// Thai detection helper
const isThai = (text: string | undefined | null) => /[\u0E00-\u0E7F]/.test((text || '').toString());
const thaiClass = (text: string | undefined | null) => isThai(text) ? 'font-thai' : '';

// --- Constants & Helpers ---
const HEM_KEYWORDS = ['platelet', 'plt', 'thrombocyte', 'rbc', 'nrbc', 'red blood', 'erythrocyte', 'wbc', 'leukocyte', 'white blood', 'hgb', 'hemoglobin', 'hct', 'hematocrit', 'pqv', 'mcv', 'mch', 'mchc', 'rdw', 'mpv', 'pdw', 'pct', 'p-lcr', 'neutro', 'neut', 'neu', 'anc', 'absolute neutrophil', 'seg', 'poly', 'pmr', 'lymph', 'lym', 'alc', 'absolute lymph', 'mono', 'monocyte', 'absolute mono', 'eo', 'eosin', 'absolute eo', 'baso', 'basophil', 'absolute baso', 'band', 'gran', 'myelo', 'meta', 'blast', 'promyelo', 'atypical', 'luc', 'ig', 'immature', 'retic', 'reticulocyte'];
const RENAL_KEYWORDS = ['creatinine', 'cr', 'bun', 'urea', 'gfr', 'egfr', 'sodium', 'na', 'potassium', 'k', 'chloride', 'cl', 'bicarb', 'co2'];

const getLabStatus = (name: string, value: number | string) => { 
    if (!name) return { level: 'normal', color: 'text-main', icon: null }; 
    const n = name.toLowerCase(); 
    if (typeof value === 'string') { 
        const lowerVal = value.toLowerCase(); 
        if (lowerVal.includes('positive') || lowerVal.includes('detected') || lowerVal.includes('critical') || lowerVal.includes('panic')) { 
            return { level: 'critical', color: 'text-red-600 dark:text-red-400', icon: <AlertOctagon size={14} className="text-red-600 dark:text-red-400 animate-pulse"/> }; 
        } 
        return { level: 'normal', color: 'text-main', icon: null }; 
    } 
    const numValue = value as number; 
    if (n.includes('creatinine') || n === 'cr') { if (numValue >= 3.0) return { level: 'critical', color: 'text-red-600 dark:text-red-400', icon: <AlertOctagon size={14}/> }; if (numValue > 1.3) return { level: 'abnormal', color: 'text-orange-500', icon: <AlertTriangle size={14}/> }; } 
    if (n.includes('potassium') || n === 'k') { if (numValue < 2.5 || numValue > 6.0) return { level: 'critical', color: 'text-red-600', icon: <AlertOctagon size={14}/> }; if (numValue < 3.5 || numValue > 5.0) return { level: 'abnormal', color: 'text-orange-500', icon: <AlertTriangle size={14}/> }; } 
    if (n.includes('wbc')) { if (numValue > 20 || numValue < 1) return { level: 'critical', color: 'text-red-600', icon: <AlertOctagon size={14}/> }; if (numValue > 11 || numValue < 4) return { level: 'abnormal', color: 'text-orange-500', icon: <AlertTriangle size={14}/> }; } 
    return { level: 'normal', color: 'text-main', icon: null }; 
};

const generateLabId = (name: string) => name ? `lab-${String(name).toLowerCase().replace(/[\(\)\/]/g, '').trim().replace(/\s+/g, '-')}` : 'lab-unknown';

const getColorForLab = (name: string): string => { 
    if (!name) return 'bg-cyan-500'; 
    const n = name.toLowerCase(); 
    if (n.includes('creatinine') || n === 'cr') return 'bg-blue-500'; 
    if (n.includes('wbc')) return 'bg-purple-500'; 
    if (n.includes('hgb') || n.includes('hemoglobin')) return 'bg-red-500'; 
    if (n.includes('potassium') || n === 'k') return 'bg-yellow-500'; 
    if (n.includes('sodium') || n === 'na') return 'bg-indigo-500'; 
    if (n.includes('platelet') || n === 'plt') return 'bg-pink-500'; 
    if (n.includes('inr') || n.includes('pt')) return 'bg-orange-500'; 
    if (n.includes('alt') || n.includes('ast') || n.includes('alp')) return 'bg-emerald-500'; 
    return 'bg-cyan-500'; 
};

const getProblemStatusColor = (status: string) => { 
    switch (status) { 
        case 'Active': return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300'; 
        case 'Improved': return 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300'; 
        case 'Stable': return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'; 
        case 'Worsening': return 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300'; 
        case 'Resolved': return 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'; 
        default: return 'bg-gray-100 text-gray-600'; 
    } 
};

const SYSTEMS_CONFIG: any = { 
    CNS: { icon: <BrainCircuit size={14}/>, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }, 
    CVS: { icon: <Heart size={14}/>, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20' }, 
    RS: { icon: <Wind size={14}/>, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }, 
    GI: { icon: <Utensils size={14}/>, color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }, 
    GU: { icon: <Droplet size={14}/>, color: 'text-yellow-600', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }, 
    FEN: { icon: <FlaskConical size={14}/>, color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/20' }, 
    Hemato: { icon: <Syringe size={14}/>, color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }, 
    ID: { icon: <Bug size={14}/>, color: 'text-lime-600', bg: 'bg-lime-500/10', border: 'border-lime-500/20' }, 
    Endocrine: { icon: <Thermometer size={14}/>, color: 'text-teal-600', bg: 'bg-teal-500/10', border: 'border-teal-500/20' } 
};

// --- Sub-Components ---

const AdmissionSection = ({ title, content }: { title: string, content: string }) => (
    <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted uppercase tracking-wider ml-1">{title}</h3>
        <div className="p-4 rounded-2xl bg-glass-panel border border-glass-border text-sm text-main whitespace-pre-wrap leading-relaxed shadow-sm">
            {content || <span className="text-muted italic">Not documented</span>}
        </div>
    </div>
);

const LabCard: React.FC<{ title: string, data: LabValue[], color: string, unit?: string, id: string }> = ({ title, data, color, unit, id }) => {
    const latest = data.length > 0 ? data[data.length - 1] : null;
    const { level, icon, color: statusColor } = latest ? getLabStatus(title, latest.value) : { level: 'normal', icon: null, color: 'text-main' };
    const chartColor = color.replace('bg-', '').replace('-500', ''); 
    const hexColor = (() => {
        switch(chartColor) {
            case 'blue': return '#3b82f6';
            case 'purple': return '#a855f7';
            case 'red': return '#ef4444';
            case 'yellow': return '#eab308';
            case 'indigo': return '#6366f1';
            case 'pink': return '#ec4899';
            case 'orange': return '#f97316';
            case 'teal': return '#14b8a6';
            case 'emerald': return '#10b981';
            case 'cyan': return '#06b6d4';
            default: return '#6366f1';
        }
    })();

    return (
        <div className={`p-4 rounded-2xl bg-glass-panel border border-glass-border shadow-sm flex flex-col justify-between h-40 relative overflow-hidden group ${level === 'critical' ? 'ring-2 ring-red-500/20' : ''}`}>
            <div className="flex justify-between items-start z-10">
                <div>
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider">{title}</h4>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className={`text-2xl font-bold ${statusColor}`}>{latest ? latest.value : '--'}</span>
                        <span className="text-xs text-muted">{unit}</span>
                    </div>
                    {latest && <div className="text-[10px] text-muted opacity-70 mt-0.5">{formatToBuddhistEra(latest.date)}</div>}
                </div>
                {icon && <div className="p-1.5 bg-glass-depth rounded-lg">{icon}</div>}
            </div>
            <div className="flex-1 w-full -mb-2 -ml-2 overflow-hidden">
                <ResponsiveContainer width="110%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={hexColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={hexColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-glass-panel)', borderColor: 'var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }}
                            itemStyle={{ padding: 0 }}
                            labelStyle={{ marginBottom: '4px', fontWeight: 700, color: 'var(--text-muted)' }}
                            formatter={(value: any) => [value, '']}
                            labelFormatter={(label: any) => {
                                try {
                                    const d = new Date(label);
                                    if (!isNaN(d.getTime())) {
                                        return formatToBuddhistEra(d, { hour: '2-digit', minute: '2-digit' });
                                    }
                                } catch {}
                                return label;
                            }}
                        />
                        <Area type="monotone" dataKey="value" stroke={hexColor} strokeWidth={2} fill={`url(#gradient-${id})`} dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const LabPanelSection: React.FC<{ title: string, labs: { name: string, data: LabValue[], unit?: string }[], color: string }> = ({ title, labs, color }) => (
    <div className={`rounded-2xl border bg-glass-panel overflow-hidden border-glass-border`}>
        <div className={`px-4 py-2 text-xs font-bold text-white uppercase tracking-wider ${color}`}>{title}</div>
        <div className="divide-y divide-glass-border">
            {labs.map((lab, i) => {
                const latest = lab.data.length > 0 ? lab.data[lab.data.length - 1] : null;
                const { color: valColor } = latest ? getLabStatus(lab.name, latest.value) : { color: 'text-main' };
                return (
                    <div key={i} className="flex justify-between items-center p-3 hover:bg-glass-depth transition-colors">
                        <span className="text-sm font-medium text-muted">{lab.name}</span>
                        <div className="text-right">
                            <div className={`font-bold ${valColor}`}>{latest ? latest.value : '--'} <span className="text-xs font-normal text-muted">{lab.unit}</span></div>
                            {latest && (
                              <div className="text-[10px] text-muted opacity-60">
                                {formatToBuddhistEra(latest.date, { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

const HospitalCourseTimeline = ({ events, onAdd, onDelete, onEdit }: { events: TimelineEvent[], onAdd: () => void, onDelete: (id: string) => void, onEdit: (evt: TimelineEvent) => void }) => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return (
        <div className="bg-glass-panel border border-glass-border rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><History size={20} className="text-blue-500"/> Timeline</h3>
                <button onClick={onAdd} className="text-xs bg-blue-500/10 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 font-bold flex items-center gap-1">+ Event</button>
            </div>
            <div className="relative pl-4 border-l-2 border-glass-border space-y-6">
                {sortedEvents.length === 0 ? <div className="text-sm text-muted italic">No timeline events recorded.</div> : sortedEvents.map((evt) => (
                    <div key={evt.id} className="relative group">
                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-glass-panel ${evt.type === 'Lab' ? 'bg-blue-500' : evt.type === 'Imaging' ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
                        <div className="bg-glass-depth p-3 rounded-xl border border-glass-border hover:bg-glass-panel transition-all cursor-pointer relative" onClick={() => onEdit(evt)}>
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-muted uppercase tracking-wider">{formatToBuddhistEra(evt.date)}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${evt.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{evt.status}</span>
                            </div>
                            <div className="font-bold text-main mt-1">{evt.title}</div>
                            {evt.notes && <div className="text-xs text-muted mt-1">{evt.notes}</div>}
                            <button onClick={(e) => {e.stopPropagation(); onDelete(evt.id)}} className="absolute top-2 right-2 p-1.5 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AntibioticCard: React.FC<{ abx: Antibiotic, onClick: () => void }> = ({ abx, onClick }) => {
    const start = new Date(abx.startDate);
    const now = new Date();
    const day = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Status Logic
    const endDate = abx.endDate ? new Date(abx.endDate) : null;
    const isDiscontinued = endDate && endDate < new Date(new Date().setHours(0,0,0,0));
    const plannedEnd = new Date(start);
    plannedEnd.setDate(start.getDate() + abx.plannedDuration);
    
    // Progress for Active
    let progress = 0;
    if (!isDiscontinued) {
        progress = Math.min((day / abx.plannedDuration) * 100, 100);
    } else {
        // If stopped, progress is 100% of the duration it ran for? Or just grayed out.
        progress = 100;
    }

    return (
        <div onClick={onClick} className="p-4 rounded-xl bg-glass-panel border border-glass-border hover:border-blue-500/30 transition-all cursor-pointer group relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="font-bold text-main">{abx.name.replace(/\s*\(.*?\)\s*/g, '').trim()}</div>
                    <div className="text-xs text-muted">{abx.dose} • {abx.indication}</div>
                </div>
                <div className="text-right">
                    {isDiscontinued ? (
                        <div className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Stopped</div>
                    ) : (
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Day {day}/{abx.plannedDuration}</div>
                    )}
                </div>
            </div>
            <div className="h-1.5 w-full bg-glass-depth rounded-full overflow-hidden mt-2">
                <div 
                    className={`h-full rounded-full ${isDiscontinued ? 'bg-slate-400' : 'bg-blue-500'}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted">
                <span>Start: {formatToBuddhistEra(start)}</span>
                <span>
                    {isDiscontinued 
                        ? `Stopped: ${endDate ? formatToBuddhistEra(endDate) : ''}` 
                        : `Plan End: ${formatToBuddhistEra(plannedEnd)}`}
                </span>
            </div>
        </div>
    );
};

const CultureCard: React.FC<{ culture: CultureResult, onClick: () => void }> = ({ culture, onClick }) => (
    <div onClick={onClick} className="p-4 rounded-xl bg-glass-panel border border-glass-border hover:border-orange-500/30 transition-all cursor-pointer group">
        <div className="flex justify-between items-start mb-2">
            <div>
                <div className="font-bold text-main">{culture.specimen}</div>
                <div className="text-xs text-muted">{formatToBuddhistEra(culture.collectionDate)}</div>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${culture.status === 'Final' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{culture.status}</span>
        </div>
        <div className="text-sm font-medium text-main mb-2">
            {culture.organism || <span className="italic text-muted">No organism identified yet</span>}
        </div>
        {culture.sensitivity && culture.sensitivity.length > 0 && (
            <div className="flex flex-wrap gap-1">
                {culture.sensitivity.map((s, i) => (
                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border ${s.interpretation === 'S' ? 'bg-green-500/5 border-green-500/20 text-green-600' : s.interpretation === 'R' ? 'bg-red-500/5 border-red-500/20 text-red-600' : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-600'}`}>
                        {s.antibiotic} ({s.interpretation})
                    </span>
                ))}
            </div>
        )}
    </div>
);

const ClinicalTimeline = ({ antibiotics, cultures, events, showEvents = false }: { antibiotics: Antibiotic[], cultures: CultureResult[], events: TimelineEvent[], showEvents: boolean }) => {
    // 15 Day Window: -10 days to +4 days relative to today
    const daysToShow = 15;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const timelineStart = new Date(today);
    timelineStart.setDate(today.getDate() - 10);
    
    const timelineDays = Array.from({ length: daysToShow }, (_, i) => {
        const d = new Date(timelineStart);
        d.setDate(timelineStart.getDate() + i);
        return d;
    });

    const cleanName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, '').trim();

    return (
        <div className="bg-glass-panel border border-glass-border rounded-2xl p-5 overflow-hidden flex flex-col shadow-sm">
            <h3 className="font-heading font-bold text-main mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Activity size={16} className="text-blue-500" /> Antibiotic Course
            </h3>
            
            <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="min-w-[800px]">
                    {/* Header: Dates */}
                    <div className="flex mb-2 border-b border-glass-border/50 pb-2">
                        <div className="w-40 shrink-0 text-[10px] font-bold text-muted uppercase tracking-wider self-end pb-1">Medication</div>
                        <div className="flex-1 flex">
                            {timelineDays.map(day => {
                                const isToday = day.getTime() === today.getTime();
                                return (
                                    <div key={day.toISOString()} className={`flex-1 text-center flex flex-col items-center gap-1 ${isToday ? 'opacity-100' : 'opacity-50'}`}>
                                        <span className={`text-[9px] font-bold ${isToday ? 'text-blue-600' : 'text-muted'}`}>
                                            {day.getDate()}
                                        </span>
                                        <span className={`text-[8px] uppercase ${isToday ? 'text-blue-600' : 'text-muted/70'}`}>
                                            {formatToBuddhistEra(day, { weekday: 'narrow' })}
                                        </span>
                                        {isToday && <div className="w-1 h-1 rounded-full bg-blue-500"></div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-3 relative">
                         {/* Grid Lines Background */}
                        <div className="absolute inset-0 flex pl-40 pointer-events-none">
                            {timelineDays.map((day, i) => {
                                const isToday = day.getTime() === today.getTime();
                                return (
                                    <div key={i} className={`flex-1 border-r ${isToday ? 'border-blue-500/20 bg-blue-500/5' : 'border-glass-border/30'} h-full`}></div>
                                );
                            })}
                        </div>

                        {antibiotics.length === 0 ? (
                            <div className="text-center text-xs text-muted py-6 italic">No antibiotics recorded</div>
                        ) : antibiotics.map((abx) => {
                            const startDate = new Date(abx.startDate);
                            startDate.setHours(0,0,0,0);
                            
                            // Determine actual active dates
                            // If endDate exists and is in the past, it's Stopped.
                            // If endDate exists and is >= today, it's Active (scheduled to stop).
                            // If no endDate, it's Active (using plannedDuration).
                            
                            let endDate = abx.endDate ? new Date(abx.endDate) : null;
                            if (endDate) endDate.setHours(0,0,0,0);
                            
                            // Check if truly discontinued (stopped in the past)
                            const isDiscontinued = endDate && endDate < today;
                            
                            // Visual End: 
                            // If discontinued: use Actual End Date.
                            // If active: use Planned End Date (Start + Duration)
                            let visualEnd: Date;
                            if (isDiscontinued) {
                                visualEnd = endDate!;
                            } else {
                                visualEnd = new Date(startDate);
                                visualEnd.setDate(startDate.getDate() + (abx.plannedDuration - 1));
                            }
                            
                            // Calculate positioning
                            const totalMs = daysToShow * 86400000;
                            const startOffset = startDate.getTime() - timelineStart.getTime();
                            const left = (startOffset / totalMs) * 100;
                            
                            // Visual bar width
                            const durationMs = (visualEnd.getTime() - startDate.getTime()) + 86400000;
                            const width = (durationMs / totalMs) * 100;
                            
                            // Skip if out of view completely
                            if (left > 100 || (left + width) < 0) return null; 

                            // Day Count for label
                            const currentDay = Math.floor((today.getTime() - startDate.getTime()) / 86400000) + 1;
                            const totalDays = abx.plannedDuration;
                            
                            // Info Text
                            let infoText = "";
                            if (isDiscontinued) infoText = "Stopped";
                            else if (currentDay > 0 && currentDay <= totalDays) infoText = `Day ${currentDay}/${totalDays}`;
                            else if (currentDay > totalDays) infoText = `Day ${currentDay} (Overdue)`;
                            else infoText = "Planned";

                            return (
                                <div key={abx.id} className="flex items-center relative z-10 group h-8">
                                    {/* Tooltip Overlay */}
                                    <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block w-64 bg-glass-panel border border-glass-border p-3 rounded-xl shadow-xl backdrop-blur-xl text-xs">
                                        <div className="font-bold text-main mb-1">{cleanName(abx.name)}</div>
                                        <div className="grid grid-cols-2 gap-y-1 text-muted">
                                            <span>Dose:</span> <span className="text-main text-right">{abx.dose}</span>
                                            <span>Indication:</span> <span className="text-main text-right truncate">{abx.indication}</span>
                                            <span>Start:</span> <span className="text-main text-right">{formatToBuddhistEra(startDate)}</span>
                                            <span>End:</span> <span className="text-main text-right">{formatToBuddhistEra(visualEnd)}</span>
                                        </div>
                                    </div>

                                    {/* Label */}
                                    <div className="w-40 shrink-0 pr-4 flex flex-col justify-center">
                                        <div className="text-xs font-bold text-main truncate" title={cleanName(abx.name)}>{cleanName(abx.name)}</div>
                                        <div className="text-[9px] text-muted truncate">{abx.dose}</div>
                                    </div>
                                    
                                    {/* Bar Container */}
                                    <div className="flex-1 relative h-full flex items-center">
                                        <div 
                                            className={`absolute h-6 rounded-md flex items-center overflow-hidden border shadow-sm transition-all cursor-help
                                                ${isDiscontinued 
                                                    ? 'bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-600' 
                                                    : 'bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'}
                                            `}
                                            style={{ 
                                                left: `${Math.max(0, left)}%`, 
                                                width: `${Math.min(100 - Math.max(0, left), width)}%` 
                                            }}
                                        >
                                            {/* Progress Fill (Solid) */}
                                            <div 
                                                className={`h-full ${isDiscontinued ? 'bg-slate-400 dark:bg-slate-600' : 'bg-blue-500'}`}
                                                style={{
                                                    width: (() => {
                                                        const progressEnd = isDiscontinued ? visualEnd : (visualEnd < today ? visualEnd : today);
                                                        const pMs = (progressEnd.getTime() - startDate.getTime()) + 86400000;
                                                        // Ensure minimum visible width if started today
                                                        const pPercent = (pMs / durationMs) * 100;
                                                        return `${Math.min(100, Math.max(0, pPercent))}%`;
                                                    })()
                                                }}
                                            ></div>
                                            
                                            {/* Text Label inside bar */}
                                            {width > 10 && (
                                                <div className="absolute inset-0 flex items-center justify-center px-1">
                                                    <span className={`text-[9px] font-bold whitespace-nowrap overflow-hidden text-ellipsis ${isDiscontinued ? 'text-slate-700 dark:text-slate-300' : 'text-blue-900 dark:text-blue-100 mix-blend-difference'}`}>
                                                        {infoText}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex gap-4 mt-4 pl-40 text-[9px] text-muted">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                            <span>Active (Elapsed)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-700 rounded-sm"></div>
                            <span>Planned (Future)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-slate-400 rounded-sm"></div>
                            <span>Stopped</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EditHandoffModal = ({ isOpen, onClose, patient, onSave }: any) => {
    const [summary, setSummary] = useState(patient.handoff.patientSummary);
    const [actions, setActions] = useState(patient.handoff.actionList);
    const [contingency, setContingency] = useState(patient.handoff.contingencies);

    const handleSave = () => {
        onSave({ ...patient, handoff: { ...patient.handoff, patientSummary: summary, actionList: actions, contingencies: contingency } });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-lg">
                <h3 className="text-lg font-bold text-main mb-4">Edit Handoff</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-muted uppercase">Summary</label>
                        <textarea value={summary} onChange={e => setSummary(e.target.value)} className="w-full h-24 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-muted uppercase">Action List</label>
                        <textarea value={actions} onChange={e => setActions(e.target.value)} className="w-full h-24 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-muted uppercase">Contingency</label>
                        <textarea value={contingency} onChange={e => setContingency(e.target.value)} className="w-full h-16 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main outline-none"/>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-glass-border text-muted">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold">Save</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
  onUpdatePatient: (patient: Patient) => void;
  isPresentationMode: boolean;
  initialTab?: string;
  onPrevPatient?: () => void;
  onNextPatient?: () => void;
}

const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack, onUpdatePatient, isPresentationMode, initialTab = 'overview', onPrevPatient, onNextPatient }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [labViewMode, setLabViewMode] = useState<'graph' | 'panel' | 'table'>('graph');
  const [labFilter, setLabFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'urgent'>('all');
  const [showRoundingModal, setShowRoundingModal] = useState(false); 
  const [roundToEdit, setRoundToEdit] = useState<DailyRound | null>(null);
  
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [showScanModal, setShowScanModal] = useState(false); 
  const [showProblemScanModal, setShowProblemScanModal] = useState(false);
  const [showLabScan, setShowLabScan] = useState(false);
  const [showMicroScan, setShowMicroScan] = useState(false);
  const [showAddAntibiotic, setShowAddAntibiotic] = useState(false);
  const [antibioticToEdit, setAntibioticToEdit] = useState<Antibiotic | null>(null);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultToEdit, setConsultToEdit] = useState<Consultation | null>(null);
  const [showMedSearch, setShowMedSearch] = useState(false);
  const [medToEdit, setMedToEdit] = useState<Medication | null>(null);
  const [showWarfarinModal, setShowWarfarinModal] = useState(false);
  const [showManualAdmission, setShowManualAdmission] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [mismatchData, setMismatchData] = useState<{scanned: ScannedDemographics} | null>(null);
  const [showImagingImport, setShowImagingImport] = useState(false);
  const [showEditCulture, setShowEditCulture] = useState(false);
  const [cultureToEdit, setCultureToEdit] = useState<CultureResult | null>(null);
  const [showLabInterpretation, setShowLabInterpretation] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<TimelineEvent | null>(null);
  const [showABGAnalysis, setShowABGAnalysis] = useState(false);
  const [abgInitialData, setAbgInitialData] = useState<any>(undefined);
  const [showAddPBS, setShowAddPBS] = useState(false);
  const [showAddEKG, setShowAddEKG] = useState(false);
  const [ekgToEdit, setEkgToEdit] = useState<EKG | null>(null);
  const [showManualProblemModal, setShowManualProblemModal] = useState(false);
  const [problemToEditIndex, setProblemToEditIndex] = useState<number | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [showManualLab, setShowManualLab] = useState(false);
  const [showACPModal, setShowACPModal] = useState(false);
  const [showMedScanModal, setShowMedScanModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [isGeneratingOneLiner, setIsGeneratingOneLiner] = useState(false);
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
  const [showEditHandoff, setShowEditHandoff] = useState(false); 

  // Edit States
  const [isEditingOneLiner, setIsEditingOneLiner] = useState(false);
  const [oneLinerDraft, setOneLinerDraft] = useState(patient.oneLiner);
  const [isEditingAllergies, setIsEditingAllergies] = useState(false);
  const [allergiesDraft, setAllergiesDraft] = useState(patient.allergies.join(', '));
  const [isEditingPMH, setIsEditingPMH] = useState(false);
  const [pmhDraft, setPmhDraft] = useState(patient.underlyingConditions);
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [diagnosisDraft, setDiagnosisDraft] = useState(patient.diagnosis);
  const [problemHistory, setProblemHistory] = useState<ProblemEntry[][]>([patient.admissionNote?.problemList || []]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [medFilter, setMedFilter] = useState<'active' | 'discontinued'>('active');

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  useEffect(() => {
      setOneLinerDraft(patient.oneLiner);
      setDiagnosisDraft(patient.diagnosis);
      setPmhDraft(patient.underlyingConditions);
      setAllergiesDraft(patient.allergies.join(', '));
      setProblemHistory([patient.admissionNote?.problemList || []]);
      setHistoryIndex(0);
  }, [patient.id]);

  // Data Memos
  const allLabsData = useMemo(() => { const data = [ { key: 'cr', title: 'Creatinine', data: patient.labs.creatinine, color: 'bg-blue-500', unit: 'mg/dL', group: 'Renal & Electrolytes' }, { key: 'wbc', title: 'WBC', data: patient.labs.wbc, color: 'bg-purple-500', unit: '10^3/uL', group: 'Hematology' }, { key: 'hgb', title: 'Hemoglobin', data: patient.labs.hgb, color: 'bg-red-500', unit: 'g/dL', group: 'Hematology' }, { key: 'k', title: 'Potassium', data: patient.labs.k, color: 'bg-yellow-500', unit: 'mmol/L', group: 'Renal & Electrolytes' }, { key: 'na', title: 'Sodium', data: patient.labs.sodium, color: 'bg-indigo-500', unit: 'mmol/L', group: 'Renal & Electrolytes' }, ]; if (patient.labs.inr && patient.labs.inr.length > 0) data.push({ key: 'inr', title: 'INR', data: patient.labs.inr, color: 'bg-orange-500', unit: '', group: 'Hematology' }); patient.labs.others.forEach(l => { if (!l.name) return; const lowerName = l.name.toLowerCase(); let group = 'Other Chemistry'; if (HEM_KEYWORDS.some(k => lowerName.includes(k))) group = 'Hematology'; else if (RENAL_KEYWORDS.some(k => lowerName.includes(k))) group = 'Renal & Electrolytes'; data.push({ key: l.name, title: l.name, data: l.values, unit: l.unit, color: getColorForLab(l.name), group }); }); return data; }, [patient.labs]);
  const latestCr = patient.labs.creatinine.length > 0 ? patient.labs.creatinine[patient.labs.creatinine.length - 1].value : null;
  const crCl = useMemo(() => { if (!patient.weight || !latestCr || !patient.age) return null; let val = 0; if(typeof latestCr === 'number'){ val = ((140 - patient.age) * patient.weight) / (72 * latestCr); if (patient.gender === 'F') val *= 0.85; } return Math.round(val); }, [patient.weight, latestCr, patient.age, patient.gender]);
  const filteredLabs = useMemo(() => { if (!labFilter) return allLabsData; return allLabsData.filter(l => l.title.toLowerCase().includes(labFilter.toLowerCase()) || l.group.toLowerCase().includes(labFilter.toLowerCase())); }, [allLabsData, labFilter]);
  const detectedABG = useMemo(() => { const abgLab = patient.labs.others.find(l => l.name === 'ABG' || l.name === 'Blood Gas'); if (abgLab && abgLab.values.length > 0) { const latest = abgLab.values[abgLab.values.length - 1]; if (latest.subResults) { const getVal = (name: string) => latest.subResults?.find(s => s.name.toLowerCase() === name.toLowerCase())?.value; const result: any = {}; const fields = ['pH', 'pCO2', 'HCO3', 'pO2', 'Na', 'Cl', 'Lactate']; fields.forEach(f => { const v = getVal(f); if (v) result[f] = v; }); if (Object.keys(result).length > 0) return result; } } return null; }, [patient.labs]);
  const currentProblemList = useMemo(() => problemHistory[historyIndex] || [], [problemHistory, historyIndex]);
  const activeProblems = useMemo(() => currentProblemList.filter(p => p.status === 'Active' || p.status === 'Worsening' || p.status === 'Improved'), [currentProblemList]);
  const inactiveProblems = useMemo(() => currentProblemList.filter(p => p.status === 'Stable' || p.status === 'Resolved'), [currentProblemList]);
  const isWarfarinPatient = useMemo(() => patient.medications.some(m => m.name.toLowerCase().includes('warfarin') || m.name.toLowerCase().includes('coumadin')), [patient.medications]);
  const visibleTasks = useMemo(() => { let tasks = patient.tasks; if (taskFilter === 'urgent') tasks = tasks.filter(t => t.priority === TaskPriority.URGENT || t.priority === TaskPriority.BEFORE_NOON); return tasks.sort((a,b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1)); }, [patient.tasks, taskFilter]);

  // Handlers
  const handleUpdateACP = (acp: AdvancedCarePlan) => { onUpdatePatient({ ...patient, advancedCarePlan: acp }); };
  const handleEventSave = (eventOrEvents: TimelineEvent | TimelineEvent[]) => { const eventsToAdd = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents]; let newTimeline = [...patient.timeline]; if (eventToEdit) { newTimeline = newTimeline.map(e => e.id === eventToEdit.id ? eventsToAdd[0] : e); } else { newTimeline = [...newTimeline, ...eventsToAdd]; } onUpdatePatient({ ...patient, timeline: newTimeline }); setShowAddEventModal(false); }; 
  const handleSaveEKG = (ekg: EKG) => { let newEkgs = patient.ekgs ? [...patient.ekgs] : []; if (ekgToEdit) { newEkgs = newEkgs.map(e => e.id === ekg.id ? ekg : e); } else { newEkgs.unshift(ekg); } onUpdatePatient({ ...patient, ekgs: newEkgs }); setShowAddEKG(false); }; 
  
  const handleSaveRound = (round: DailyRound, newTasks: Task[], newResults?: any) => { 
      let updatedRounds = patient.rounds ? [...patient.rounds] : [];
      if (roundToEdit) {
          updatedRounds = updatedRounds.map(r => r.id === round.id ? round : r);
      } else {
          updatedRounds = [round, ...updatedRounds];
      }
      onUpdatePatient({ 
          ...patient, 
          rounds: updatedRounds, 
          tasks: [...patient.tasks, ...newTasks], 
          ...newResults 
      }); 
      setShowRoundingModal(false); 
      setRoundToEdit(null);
  };

  const updateProblemList = (newList: ProblemEntry[]) => { const newHistory = [...problemHistory.slice(0, historyIndex + 1), newList]; setProblemHistory(newHistory); setHistoryIndex(newHistory.length - 1); if (patient.admissionNote) { onUpdatePatient({ ...patient, admissionNote: { ...patient.admissionNote, problemList: newList } }); } };
  const undoProblemChange = () => { if (historyIndex > 0) setHistoryIndex(historyIndex - 1); };
  const redoProblemChange = () => { if (historyIndex < problemHistory.length - 1) setHistoryIndex(historyIndex + 1); };
  const handleDeleteProblem = (index: number) => { const newList = currentProblemList.filter((_, i) => i !== index); updateProblemList(newList); };
  const handleSaveManualProblem = (problem: ProblemEntry) => { let newList = [...currentProblemList]; if (problemToEditIndex !== null) { newList[problemToEditIndex] = problem; } else { newList.push(problem); } updateProblemList(newList); setShowManualProblemModal(false); setProblemToEditIndex(null); };
  const handleSaveManualLab = (result: RawLabResult) => { let updates: Partial<Patient> = {}; const labs = { ...patient.labs }; const normalizedName = result.testName.toLowerCase(); const newEntry: LabValue = { date: result.dateTime || new Date().toISOString(), value: result.value, subResults: result.subResults }; if (normalizedName.includes('creatinine') || normalizedName === 'cr') labs.creatinine = [...labs.creatinine, newEntry]; else if (normalizedName.includes('sodium') || normalizedName === 'na') labs.sodium = [...labs.sodium, newEntry]; else if (normalizedName.includes('potassium') || normalizedName === 'k') labs.k = [...labs.k, newEntry]; else if (normalizedName.includes('wbc')) labs.wbc = [...labs.wbc, newEntry]; else if (normalizedName.includes('hgb') || normalizedName.includes('hemoglobin')) labs.hgb = [...labs.hgb, newEntry]; else if (normalizedName.includes('inr')) labs.inr = [...labs.inr, newEntry]; else { const existingCustom = labs.others.find(l => l.name.toLowerCase() === normalizedName); if (existingCustom) { existingCustom.values.push(newEntry); } else { labs.others.push({ name: result.testName, unit: result.unit, values: [newEntry] }); } } updates.labs = labs; onUpdatePatient({ ...patient, ...updates }); setShowManualLab(false); };
  const handleSaveLabResults = (results: RawLabResult[], pbsFindings?: string) => {
    const updatedPatient = JSON.parse(JSON.stringify(patient));
    const labs = updatedPatient.labs;

    results.forEach(res => {
        if (!res.testName) return;
        const normalizedName = res.testName.toLowerCase();
        const newEntry: LabValue = { 
            date: res.dateTime || new Date().toISOString(), 
            value: res.value, 
            subResults: res.subResults 
        };

        let found = false;
        for (const key in labs) {
            if (key === 'others' || key === 'pbs') continue;
            if (normalizedName.includes(key) || (key === 'cr' && normalizedName.includes('creatinine'))) {
                if (Array.isArray(labs[key])) {
                    labs[key].push(newEntry);
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            const existingCustom = labs.others.find(l => l.name.toLowerCase() === normalizedName);
            if (existingCustom) {
                existingCustom.values.push(newEntry);
            } else {
                labs.others.push({ name: res.testName, unit: res.unit, values: [newEntry] });
            }
        }
    });

    if (pbsFindings) {
        const pbsEntry: MicroscopyResult = { 
            id: Date.now().toString(), 
            date: new Date().toISOString(), 
            others: pbsFindings 
        };
        if (!labs.pbs) labs.pbs = [];
        labs.pbs.push(pbsEntry);
    }
    
    onUpdatePatient(updatedPatient);
    setShowLabScan(false);
};
  const handleAdmissionNoteScanComplete = (note: ClinicalAdmissionNote) => { onUpdatePatient({ ...patient, admissionNote: note }); setProblemHistory([note.problemList || []]); setHistoryIndex(0); setShowScanModal(false); };
  const handleMicroScanComplete = (results: CultureResult[]) => { onUpdatePatient({ ...patient, microbiology: [...(patient.microbiology || []), ...results] }); setShowMicroScan(false); };
  const handleSaveCulture = (culture: CultureResult) => { let newMicro = patient.microbiology ? [...patient.microbiology] : []; if (cultureToEdit) { newMicro = newMicro.map(c => c.id === culture.id ? culture : c); } else { newMicro.push(culture); } onUpdatePatient({ ...patient, microbiology: newMicro }); setShowEditCulture(false); setCultureToEdit(null); };
  const handleMedAdd = (med: Medication) => { if (medToEdit) { onUpdatePatient({ ...patient, medications: patient.medications.map(m => m.id === med.id ? med : m) }); } else { onUpdatePatient({ ...patient, medications: [...patient.medications, med] }); } setShowMedSearch(false); setMedToEdit(null); };
  const handleAbxAdd = (abx: Antibiotic) => { if (antibioticToEdit) { onUpdatePatient({ ...patient, antibiotics: patient.antibiotics.map(a => a.id === abx.id ? abx : a) }); } else { onUpdatePatient({ ...patient, antibiotics: [...patient.antibiotics, abx] }); } setShowAddAntibiotic(false); setAntibioticToEdit(null); };
  const handleConfirmDemographicsUpdate = (p: Patient) => { onUpdatePatient(p); setMismatchData(null); };
  const handleImagingImport = (study: ImagingStudy) => { onUpdatePatient({ ...patient, imaging: [study, ...(patient.imaging || [])] }); setShowImagingImport(false); };
  const handleSavePBS = (pbs: MicroscopyResult) => { const newLabs = { ...patient.labs, pbs: [...(patient.labs.pbs || []), pbs] }; onUpdatePatient({ ...patient, labs: newLabs }); setShowAddPBS(false); };
  const handleDeleteEvent = (id: string) => { onUpdatePatient({ ...patient, timeline: patient.timeline.filter(e => e.id !== id) }); };
  const handleDeleteTask = (id: string) => { onUpdatePatient({ ...patient, tasks: patient.tasks.filter(t => t.id !== id) }); };
  const handleToggleTask = (id: string) => { onUpdatePatient({ ...patient, tasks: patient.tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t) }); };
  const handleToggleSubtask = (taskId: string, subtaskId: string) => { onUpdatePatient({ ...patient, tasks: patient.tasks.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s) } : t) }); };
  const handleMedToggle = (med: Medication) => { const updatedMeds = patient.medications.map(m => m.id === med.id ? { ...m, isActive: !m.isActive } : m); onUpdatePatient({ ...patient, medications: updatedMeds }); };
  const handleDeleteAdmissionNote = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); setShowDeleteNoteConfirm(true); };
  const confirmDeleteNote = () => { const updatedPatient = { ...patient, admissionNote: undefined }; onUpdatePatient(updatedPatient); setProblemHistory([[]]); setHistoryIndex(0); setShowDeleteNoteConfirm(false); };
  const handleDischargePatient = (updatedPatient: Patient) => { onUpdatePatient(updatedPatient); onBack(); };
  const handleMedicationScan = (scannedMeds: Medication[]) => { const currentPreMeds = patient.preAdmissionMedications || []; const newPreMeds = [...currentPreMeds, ...scannedMeds]; onUpdatePatient({ ...patient, preAdmissionMedications: newPreMeds }); };
  const handleGenerateOneLiner = async () => { setIsGeneratingOneLiner(true); const summary = await generateOneLiner(patient); if (summary) { onUpdatePatient({ ...patient, oneLiner: summary }); setOneLinerDraft(summary); } setIsGeneratingOneLiner(false); };

  const getTabIcon = (tab: string) => { switch (tab) { case 'overview': return <Activity size={16} />; case 'rounds': return <ClipboardList size={16} />; case 'workflow': return <CheckCircle2 size={16} />; case 'labs': return <FlaskConical size={16} />; case 'ekg': return <HeartPulse size={16} />; case 'imaging': return <Image size={16} />; case 'infection': return <Bug size={16} />; case 'admission': return <FileText size={16} />; case 'problems': return <AlertCircle size={16} />; case 'consults': return <Users size={16} />; case 'meds': return <Pill size={16} />; default: return <Activity size={16} />; } };
  const getTabLabel = (tab: string) => { if (tab === 'ekg') return 'EKG'; return tab; };
  const getTabBadge = (tab: string) => { switch (tab) { case 'workflow': const pendingTasks = patient.tasks.filter(t => !t.isCompleted).length; return pendingTasks > 0 ? pendingTasks : null; case 'infection': const pendingMicro = (patient.microbiology || []).filter(c => c.status === 'Pending').length; return pendingMicro > 0 ? pendingMicro : null; case 'consults': const activeConsults = patient.consults.filter(c => c.status !== 'Completed').length; return activeConsults > 0 ? activeConsults : null; default: return null; } };

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto relative animate-in slide-in-from-bottom-4 duration-500">
       <DischargeModal isOpen={showDischargeModal} onClose={() => setShowDischargeModal(false)} patient={patient} onDischarge={handleDischargePatient} />
       <AddTaskModal isOpen={showAddTaskModal} onClose={() => { setShowAddTaskModal(false); setTaskToEdit(null); }} onAdd={(taskData) => { if (taskToEdit) onUpdatePatient({ ...patient, tasks: patient.tasks.map(t => t.id === taskToEdit.id ? { ...t, ...taskData } : t) }); else onUpdatePatient({ ...patient, tasks: [...patient.tasks, { id: Date.now().toString(), isCompleted: false, ...taskData }] }); setShowAddTaskModal(false); setTaskToEdit(null); }} taskToEdit={taskToEdit} />
       <AddEventModal isOpen={showAddEventModal} onClose={() => { setShowAddEventModal(false); setEventToEdit(null); }} onAdd={handleEventSave} eventToEdit={eventToEdit} />
       <AddEKGModal isOpen={showAddEKG} onClose={() => { setShowAddEKG(false); setEkgToEdit(null); }} onSave={handleSaveEKG} previousEKG={patient.ekgs && patient.ekgs.length > 0 ? patient.ekgs[0] : undefined} ekgToEdit={ekgToEdit || undefined} />
       <RoundingModal isOpen={showRoundingModal} onClose={() => { setShowRoundingModal(false); setRoundToEdit(null); }} patient={patient} onSave={handleSaveRound} initialData={roundToEdit || undefined} />
       <ClinicalScanModal isOpen={showScanModal} onClose={() => setShowScanModal(false)} onScanComplete={handleAdmissionNoteScanComplete} />
       <ProblemScanModal isOpen={showProblemScanModal} onClose={() => setShowProblemScanModal(false)} onScanComplete={(list) => { updateProblemList([...currentProblemList, ...list]); setShowProblemScanModal(false); }} />
       <ManualProblemModal isOpen={showManualProblemModal} onClose={() => { setShowManualProblemModal(false); setProblemToEditIndex(null); }} onSave={handleSaveManualProblem} initialData={problemToEditIndex !== null ? currentProblemList[problemToEditIndex] : undefined} />
       <ManualLabModal isOpen={showManualLab} onClose={() => setShowManualLab(false)} onSave={handleSaveManualLab} />
      <MicroScanModal isOpen={showMicroScan} onClose={() => setShowMicroScan(false)} onScanComplete={handleMicroScanComplete} />
       <EditCultureModal isOpen={showEditCulture} onClose={() => { setShowEditCulture(false); setCultureToEdit(null); }} onSave={handleSaveCulture} initialData={cultureToEdit || undefined} />
       <ManualAdmissionModal isOpen={showManualAdmission} onClose={() => setShowManualAdmission(false)} onSave={(note) => { onUpdatePatient({ ...patient, admissionNote: note }); setProblemHistory([note.problemList || []]); setHistoryIndex(0); }} initialData={patient.admissionNote} />
       <EditPatientModal isOpen={showEditPatient} onClose={() => setShowEditPatient(false)} patient={patient} onSave={(updated) => onUpdatePatient(updated)} />
       <MedicationSearchModal isOpen={showMedSearch} onClose={() => { setShowMedSearch(false); setMedToEdit(null); }} onAdd={handleMedAdd} medToEdit={medToEdit} patientWeight={patient.weight} patientCrCl={crCl || undefined} />
       <WarfarinManagerModal isOpen={showWarfarinModal} onClose={() => setShowWarfarinModal(false)} patient={patient} onUpdate={(profile, newInr, nextLabEvent) => { let updates: Partial<Patient> = { anticoagulation: profile }; if (newInr) { const newLabs = { ...patient.labs, inr: [...patient.labs.inr, newInr].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) }; updates.labs = newLabs; } if (nextLabEvent) { updates.timeline = [...patient.timeline, nextLabEvent]; } onUpdatePatient({ ...patient, ...updates }); }} />
       <AddConsultModal isOpen={showConsultModal} onClose={() => { setShowConsultModal(false); setConsultToEdit(null); }} onAdd={(consult) => { if (consultToEdit) onUpdatePatient({ ...patient, consults: patient.consults.map(c => c.id === consultToEdit.id ? consult : c) }); else onUpdatePatient({ ...patient, consults: [...patient.consults, consult] }); setConsultToEdit(null); }} consultToEdit={consultToEdit} />
       <AddAntibioticModal isOpen={showAddAntibiotic} onClose={() => { setShowAddAntibiotic(false); setAntibioticToEdit(null); }} onAdd={handleAbxAdd} antibioticToEdit={antibioticToEdit} />
      {/* LabInterpretationModal removed */}
       <ABGAnalysisModal isOpen={showABGAnalysis} onClose={() => { setShowABGAnalysis(false); setAbgInitialData(undefined); }} initialValues={abgInitialData} />
       <ImagingImportModal isOpen={showImagingImport} onClose={() => setShowImagingImport(false)} onScanComplete={handleImagingImport} />
       <AddPBSModal isOpen={showAddPBS} onClose={() => setShowAddPBS(false)} onAdd={handleSavePBS} />
       <ImagePreviewModal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} images={previewImages} title={previewTitle} />
       <MedicationScanModal isOpen={showMedScanModal} onClose={() => setShowMedScanModal(false)} onScanComplete={handleMedicationScan} />
       <MedicationReconciliationModal isOpen={showReconcileModal} onClose={() => setShowReconcileModal(false)} patient={patient} onUpdate={(updated) => onUpdatePatient(updated)} />
       <DrugInteractionModal isOpen={showInteractionModal} onClose={() => setShowInteractionModal(false)} activeMedications={patient.medications.filter(m => m.isActive)} />
       
       <EditHandoffModal isOpen={showEditHandoff} onClose={() => setShowEditHandoff(false)} patient={patient} onSave={onUpdatePatient} />

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <button onClick={onBack} className="p-2 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors shrink-0"><ArrowLeft size={24} /></button>
             <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-heading font-bold text-main tracking-tight truncate max-w-[200px] sm:max-w-xs">{patient.name}</h1>
                    <button onClick={() => setShowEditPatient(true)} className="p-1.5 rounded-lg hover:bg-glass-depth text-muted hover:text-indigo-500 transition-colors shrink-0"><Pencil size={14} /></button>
                    {patient.hn && <span className="text-xs sm:text-sm font-mono text-muted bg-glass-depth px-2 py-1 rounded border border-glass-border whitespace-nowrap">HN: {patient.hn}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted mt-1 truncate">
                    <Bed size={14} /> {patient.roomNumber} • {patient.age}{patient.gender} • {patient.insuranceScheme}
                    <span className="hidden sm:flex items-center gap-1 before:content-['•'] before:mr-2">
                        <Calendar size={14}/> Admitted: {formatToBuddhistEra(patient.admissionDate)}
                    </span>
                </div>
             </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <button onClick={() => setShowDischargeModal(true)} className="flex-1 md:flex-none justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-2 text-sm">
                 <LogOut size={16}/> Discharge
             </button>
             <button onClick={() => { setRoundToEdit(null); setShowRoundingModal(true); }} className="flex-1 md:flex-none justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2 text-sm">
                 <Stethoscope size={16}/> <span className="hidden sm:inline">Start</span> Round
             </button>
             <button onClick={() => { setTaskToEdit(null); setShowAddTaskModal(true); }} className="flex-1 md:flex-none justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 text-sm"><CheckCircle2 size={16} /> Add Task</button>
          </div>
       </div>

       <div className="relative sticky top-0 z-20 bg-glass-panel/95 backdrop-blur-xl -mx-4 md:mx-0 border-b border-glass-border">
           <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/80 dark:from-slate-900/80 to-transparent pointer-events-none z-10 md:hidden"></div>
           <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 dark:from-slate-900/80 to-transparent pointer-events-none z-10 md:hidden"></div>
           
           <div className="flex gap-2 overflow-x-auto scrollbar-none px-6 py-3 md:rounded-t-2xl mask-scroller-x">
                {['overview', 'rounds', 'workflow', 'labs', 'ekg', 'imaging', 'infection', 'admission', 'problems', 'consults', 'meds'].map(tabId => (
                    <button 
                        key={tabId} 
                        onClick={() => setActiveTab(tabId)} 
                        className={`
                            relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 border 
                            ${activeTab === tabId ? 'text-white border-transparent shadow-md shadow-blue-500/30 transform scale-105 z-10' : 'bg-glass-depth text-muted border-glass-border hover:text-main hover:bg-glass-panel'}
                        `}
                    >
                        {activeTab === tabId && (
                            <motion.div 
                                layoutId="activeTabBackground"
                                className="absolute inset-0 bg-blue-600 rounded-full"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2 font-heading tracking-tight">
                            {getTabIcon(tabId)} <span className={`capitalize ${thaiClass(getTabLabel(tabId))}`}>{getTabLabel(tabId)}</span>
                            {getTabBadge(tabId) && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tabId ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'}`}>
                                    {getTabBadge(tabId)}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
           </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-20 pt-6 px-1 md:px-0">
           {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="md:col-span-2 space-y-6">
                      <div className="p-6 rounded-3xl bg-glass-panel border border-glass-border shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><Activity size={20} className="text-medical-teal"/> Clinical Snapshot</h3>
                              <div className="flex gap-2 items-center">
                                  <button onClick={handleGenerateOneLiner} disabled={isGeneratingOneLiner} className="text-xs text-violet-600 bg-violet-500/10 hover:bg-violet-500/20 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors border border-violet-500/20">
                                      {isGeneratingOneLiner ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} AI One-Liner
                                  </button>
                                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => setIsEditingOneLiner(!isEditingOneLiner)} className="text-xs text-indigo-500 font-bold hover:text-indigo-600">{isEditingOneLiner ? 'Done' : 'Edit'}</button>
                              </div>
                          </div>
                          {isEditingOneLiner ? (
                              <textarea value={oneLinerDraft} onChange={(e) => setOneLinerDraft(e.target.value)} onBlur={() => { onUpdatePatient({...patient, oneLiner: oneLinerDraft}); setIsEditingOneLiner(false); }} className="w-full h-24 bg-glass-depth border border-glass-border rounded-xl p-3 text-sm text-main text-lg font-medium outline-none" autoFocus />
                          ) : (
                              <div className="text-lg md:text-xl font-medium text-main leading-relaxed mb-4">{patient.oneLiner}</div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                              <div className="p-3 rounded-xl bg-glass-depth border border-glass-border relative group">
                                  <div className="flex justify-between items-center mb-1">
                                      <div className="text-xs font-bold text-muted uppercase">Primary Diagnosis</div>
                                      <button onMouseDown={(e) => e.preventDefault()} onClick={() => setIsEditingDiagnosis(true)} className="text-[10px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                                  </div>
                                  {isEditingDiagnosis ? (
                                      <input value={diagnosisDraft} onChange={(e) => setDiagnosisDraft(e.target.value)} onBlur={() => { onUpdatePatient({...patient, diagnosis: diagnosisDraft}); setIsEditingDiagnosis(false); }} className="w-full bg-glass-panel border border-glass-border rounded-lg p-1 text-main font-bold outline-none" autoFocus />
                                  ) : (
                                      <div className="font-bold text-main cursor-pointer" onClick={() => setIsEditingDiagnosis(true)}>{patient.diagnosis}</div>
                                  )}
                              </div>
                              <div className="p-3 rounded-xl bg-glass-depth border border-glass-border relative group cursor-pointer hover:bg-glass-panel transition-colors" onClick={() => setShowACPModal(true)}>
                                  <div className="flex justify-between items-center mb-1">
                                      <div className="text-xs font-bold text-muted uppercase">Code Status</div>
                                      <Pencil size={12} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <div className="font-bold text-main">{patient.advancedCarePlan.category}</div>
                                  {patient.advancedCarePlan.category === 'Advanced Care Plan' && <div className="text-xs text-red-500 mt-1">See Limitations</div>}
                              </div>
                          </div>
                          <div className="mt-4 p-3 rounded-xl bg-glass-depth border border-glass-border relative group">
                              <div className="flex justify-between items-center mb-1">
                                  <div className="text-xs font-bold text-muted uppercase">Underlying Conditions (PMH)</div>
                                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => setIsEditingPMH(!isEditingPMH)} className="text-[10px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                              </div>
                              {isEditingPMH ? (
                                  <textarea value={pmhDraft} onChange={(e) => setPmhDraft(e.target.value)} onBlur={() => { onUpdatePatient({...patient, underlyingConditions: pmhDraft}); setIsEditingPMH(false); }} className="w-full h-20 bg-glass-depth border border-glass-border rounded-lg p-2 text-sm text-main outline-none" autoFocus />
                              ) : (
                                  <div className="text-sm text-main leading-relaxed">{patient.underlyingConditions || 'None documented'}</div>
                              )}
                          </div>
                      </div>
                      <HospitalCourseTimeline events={patient.timeline || []} onAdd={() => { setEventToEdit(null); setShowAddEventModal(true); }} onDelete={handleDeleteEvent} onEdit={(evt) => { setEventToEdit(evt); setShowAddEventModal(true); }} />
                      {activeProblems.length > 0 && (
                          <div className="p-6 rounded-3xl bg-glass-panel border border-glass-border shadow-sm">
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2">
                                      <AlertCircle size={20} className="text-red-500"/> Active Problems
                                  </h3>
                                  <button onClick={() => setActiveTab('problems')} className="text-xs text-blue-500 font-bold hover:text-blue-600 flex items-center gap-1">
                                      View All <ChevronRight size={12}/>
                                  </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {activeProblems.slice(0, 6).map((p, i) => (
                                      <div key={i} className="p-3 bg-glass-depth border border-glass-border rounded-xl flex flex-col gap-1 hover:bg-glass-panel transition-colors">
                                          <div className="flex justify-between items-start gap-2">
                                              <span className="font-bold text-main text-sm leading-snug">{p.problem}</span>
                                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${getProblemStatusColor(p.status || 'Active')}`}>
                                                  {p.status || 'Active'}
                                              </span>
                                          </div>
                                          {p.plan && (
                                              <div className="text-xs text-muted truncate opacity-80" title={p.plan}>
                                                  {p.plan}
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                      <div className="p-6 rounded-3xl bg-glass-panel border border-glass-border shadow-sm relative group">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><FileText size={20} className="text-indigo-500"/> Shift Handoff (I-PASS)</h3>
                              <button onClick={() => setShowEditHandoff(true)} className="text-xs text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-lg hover:bg-indigo-500/20 font-bold">Edit Content</button>
                          </div>
                          <div className="space-y-3 text-sm">
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                  <span className="font-bold text-muted w-24 shrink-0">Summary:</span>
                                  <span className="text-main">{patient.handoff.patientSummary}</span>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                  <span className="font-bold text-green-600 w-24 shrink-0">Action List:</span>
                                  <span className="text-main whitespace-pre-wrap">{patient.handoff.actionList}</span>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                  <span className="font-bold text-red-500 dark:text-red-400 w-24 shrink-0">Contingency:</span>
                                  <span className="text-red-500 dark:text-red-400 font-medium">{patient.handoff.contingencies}</span>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div className="p-6 rounded-3xl bg-glass-panel border border-glass-border shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                              <h3 className="font-heading font-bold text-main">Medications</h3>
                              <div className="flex gap-2">
                                  {isWarfarinPatient && (
                                      <button onClick={() => setShowWarfarinModal(true)} className="text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded-lg border border-red-500/20">INR Manager</button>
                                  )}
                                  <button onClick={() => setShowMedSearch(true)} className="text-xs text-indigo-500 font-bold hover:text-indigo-600">+ Add</button>
                              </div>
                          </div>
                          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                              {patient.medications.length > 0 ? (
                                  patient.medications.map(med => (
                                      <div key={med.id} className={`p-3 rounded-xl border flex flex-col group transition-all ${med.isActive ? 'bg-glass-depth border-glass-border' : 'bg-glass-panel border-transparent opacity-60 grayscale'}`}>
                                          <div className="flex justify-between items-center w-full">
                                              <div className="flex items-center gap-3">
                                                  <button onClick={() => handleMedToggle(med)} className={`transition-colors ${med.isActive ? 'text-green-500' : 'text-muted'}`} title={med.isActive ? 'Active' : 'On Hold'}>
                                                      {med.isActive ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                                                  </button>
                                                  <div>
                                                      <div className="text-sm font-bold text-main flex items-center gap-2">{med.name}{med.specificSchedule && <Clock size={12} className="text-blue-500" />}</div>
                                                      <div className="text-xs text-muted">{med.dose} • {med.route} • {med.frequency}</div>
                                                  </div>
                                              </div>
                                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => { setMedToEdit(med); setShowMedSearch(true); }} className="p-1.5 text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg"><Pencil size={14} /></button>
                                                  <button onClick={() => { const newMeds = patient.medications.filter(m => m.id !== med.id); onUpdatePatient({...patient, medications: newMeds}); }} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                                              </div>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="text-center text-muted text-sm py-8 border-2 border-dashed border-glass-border rounded-xl">No meds listed</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
           )}
           {activeTab === 'rounds' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><ClipboardList size={20} className="text-green-500"/> Daily Rounds</h3>
                  <button onClick={() => { setRoundToEdit(null); setShowRoundingModal(true); }} className="px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg text-xs font-bold hover:bg-green-500/20 flex items-center gap-2">
                    <Plus size={14}/> New Round
                  </button>
                </div>
                <div className="space-y-4">
                  {(patient.rounds && patient.rounds.length > 0) ? patient.rounds.map(round => (
                    <div key={round.id} className="p-5 bg-glass-panel border border-glass-border rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-main text-lg">Round - {formatToBuddhistEra(round.date)}</div>
                        </div>
                        <button onClick={() => { setRoundToEdit(round); setShowRoundingModal(true); }} className="p-1.5 rounded bg-glass-depth text-muted hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14}/></button>
                      </div>

                      {round.summary && (
                        <div className="mb-4 p-3 bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border border-violet-500/20 rounded-xl">
                          <div className="text-[10px] font-bold text-violet-600 uppercase mb-1 flex items-center gap-1">
                            <Sparkles size={12}/> AI Summary
                          </div>
                          <p className="text-sm text-main whitespace-pre-wrap">{round.summary}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {round.subjective && (
                          <div className="bg-glass-depth p-3 rounded-xl border border-glass-border/50">
                            <div className="text-[10px] font-bold text-muted uppercase mb-1">Subjective</div>
                            <p className="text-sm text-main whitespace-pre-wrap">{round.subjective}</p>
                          </div>
                        )}

                        {(round.physicalExam || round.vitalTrends || round.vitalGraphImage) && (
                          <div className="bg-glass-depth p-3 rounded-xl border border-glass-border/50">
                            <div className="text-[10px] font-bold text-muted uppercase mb-1">Objective</div>
                            {round.vitalGraphImage && (
                              <img src={round.vitalGraphImage} alt="Vitals" className="w-full rounded-lg mb-2 border border-glass-border"/>
                            )}
                            {round.physicalExam && (
                              <p className="text-sm text-main whitespace-pre-wrap mb-2">{round.physicalExam}</p>
                            )}
                            {round.vitalTrends && (
                              <p className="text-xs text-muted whitespace-pre-wrap">{round.vitalTrends}</p>
                            )}
                            {(round.intake !== undefined || round.output !== undefined) && (
                              <div className="text-xs text-muted mt-2">
                                I/O: {round.intake || 0}/{round.output || 0} (Net: {round.netBalance || 0} ml)
                              </div>
                            )}
                          </div>
                        )}

                        {round.systemsReview ? (
                          <div className="bg-glass-depth p-3 rounded-xl border border-glass-border/50">
                            <div className="text-[10px] font-bold text-muted uppercase mb-2">Assessment & Plan (Systems Review)</div>
                            <div className="space-y-2">
                              {Object.entries(round.systemsReview).filter(([_, v]) => v.trim().length > 0).map(([system, plan], index) => (
                                <div key={index} className="flex items-start gap-2">
                                  <span className="text-indigo-500 font-bold text-sm">{system}:</span>
                                  <p className="text-sm text-main flex-1">{plan}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            {round.assessment && (
                              <div className="bg-glass-depth p-3 rounded-xl border border-glass-border/50">
                                <div className="text-[10px] font-bold text-muted uppercase mb-1">Assessment</div>
                                <p className="text-sm text-main whitespace-pre-wrap">{round.assessment}</p>
                              </div>
                            )}
                            {round.plan && (
                              <div className="bg-glass-depth p-3 rounded-xl border border-glass-border/50">
                                <div className="text-[10px] font-bold text-muted uppercase mb-1">Plan</div>
                                <p className="text-sm text-main whitespace-pre-wrap">{round.plan}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )) : <div className="text-center py-12 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No rounds recorded.</div>}
                </div>
              </div>
           )}
           {activeTab === 'workflow' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><CheckCircle2 size={20} className="text-blue-500"/> Workflow & Tasks</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border">
                      <button onClick={() => setTaskFilter('all')} className={`px-3 py-1 rounded-lg text-xs font-bold ${taskFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-muted'}`}>All</button>
                      <button onClick={() => setTaskFilter('urgent')} className={`px-3 py-1 rounded-lg text-xs font-bold ${taskFilter === 'urgent' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-muted'}`}>Urgent</button>
                    </div>
                    <button onClick={() => { setTaskToEdit(null); setShowAddTaskModal(true); }} className="px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500/20 flex items-center gap-2">
                      <Plus size={14}/> Add Task
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {visibleTasks.length > 0 ? visibleTasks.map(task => (
                    <div key={task.id} className={`p-4 rounded-xl transition-all group ${task.isCompleted ? 'bg-glass-panel opacity-60' : 'bg-glass-panel border border-glass-border shadow-sm'}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => handleToggleTask(task.id)} className={`mt-1 ${task.isCompleted ? 'text-green-500' : 'text-muted hover:text-green-500'}`}>
                          <CheckCircle2 size={20} fill={task.isCompleted ? 'currentColor' : 'none'}/>
                        </button>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <span className={`font-medium text-main ${task.isCompleted ? 'line-through' : ''}`}>{task.description}</span>
                            <div className="flex items-center gap-2">
                              {task.priority === TaskPriority.URGENT && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">Urgent</span>}
                              {task.priority === TaskPriority.BEFORE_NOON && <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold">AM</span>}
                              <button onClick={() => { setTaskToEdit(task); setShowAddTaskModal(true); }} className="p-1 text-muted hover:text-blue-500 opacity-0 group-hover:opacity-100"><Pencil size={14}/></button>
                              <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </div>
                          </div>
                          {task.dueDate && <div className="text-xs text-muted mt-1">Due: {new Date(task.dueDate).toLocaleString()}</div>}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-2 space-y-1 pl-4 border-l-2 border-glass-border">
                              {task.subtasks.map(sub => (
                                <div key={sub.id} className="flex items-center gap-2">
                                  <button onClick={() => handleToggleSubtask(task.id, sub.id)} className={sub.isCompleted ? 'text-green-500' : 'text-muted hover:text-green-500'}>
                                    <CheckCircle2 size={16} fill={sub.isCompleted ? 'currentColor' : 'none'}/>
                                  </button>
                                  <span className={`text-sm ${sub.isCompleted ? 'line-through text-muted' : 'text-main'}`}>{sub.description}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : <div className="text-center py-12 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No tasks for this patient.</div>}
                </div>
              </div>
           )}
           {activeTab === 'labs' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><FlaskConical size={20} className="text-cyan-500"/> Lab Results</h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/>
                      <input type="text" placeholder="Filter labs..." value={labFilter} onChange={e => setLabFilter(e.target.value)} className="w-full sm:w-48 bg-glass-depth border border-glass-border rounded-lg pl-9 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                    </div>
                    <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border">
                      <button onClick={() => setLabViewMode('graph')} className={`px-3 py-1 rounded-lg text-xs font-bold ${labViewMode === 'graph' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600' : 'text-muted'}`}><LineChart size={14}/></button>
                      <button onClick={() => setLabViewMode('panel')} className={`px-3 py-1 rounded-lg text-xs font-bold ${labViewMode === 'panel' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600' : 'text-muted'}`}><LayoutGrid size={14}/></button>
                      <button onClick={() => setLabViewMode('table')} className={`px-3 py-1 rounded-lg text-xs font-bold ${labViewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600' : 'text-muted'}`}><LayoutGrid size={14}/></button>
                    </div>
                    <button onClick={() => setShowManualLab(true)} className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20"><Plus size={16}/></button>
                  </div>
                </div>
                {labViewMode === 'graph' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredLabs.map(lab => <LabCard key={lab.key} id={generateLabId(lab.key)} title={lab.title} data={lab.data} color={lab.color} unit={lab.unit} />)}
                  </div>
                )}
                {labViewMode === 'panel' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <LabPanelSection title="Renal & Electrolytes" labs={filteredLabs.filter(l => l.group === 'Renal & Electrolytes')} color="bg-blue-500" />
                    <LabPanelSection title="Hematology" labs={filteredLabs.filter(l => l.group === 'Hematology')} color="bg-red-500" />
                    <LabPanelSection title="Other Chemistry" labs={filteredLabs.filter(l => l.group === 'Other Chemistry')} color="bg-teal-500" />
                  </div>
                )}
                {labViewMode === 'table' && (
                  <LabTableView rawLabs={patient.labs} />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detectedABG && (
                    <div className="p-4 bg-glass-panel border border-glass-border rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-main">Latest Arterial Blood Gas</h4>
                        <button onClick={() => { setAbgInitialData(detectedABG); setShowABGAnalysis(true); }} className="text-xs font-bold text-violet-500 bg-violet-500/10 px-2 py-1 rounded-lg hover:bg-violet-500/20">Analyze</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {Object.entries(detectedABG).map(([key, value]) => (
                          <div key={key} className="bg-glass-depth p-2 rounded-lg">
                            <div className="text-xs text-muted">{key}</div>
                            <div className="font-bold text-main">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(patient.labs.pbs && patient.labs.pbs.length > 0) && (
                    <div className="p-4 bg-glass-panel border border-glass-border rounded-2xl">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-main">Peripheral Blood Smear</h4>
                        <button onClick={() => setShowAddPBS(true)} className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded-lg hover:bg-purple-500/20">+ Add</button>
                      </div>
                      <div className="space-y-2">
                        {patient.labs.pbs.map(pbs => (
                          <div key={pbs.id} className="bg-glass-depth p-2 rounded-lg text-sm">
                            <div className="text-xs text-muted">{formatToBuddhistEra(pbs.date)}</div>
                            <p className="text-main">{pbs.rbc && `RBC: ${pbs.rbc}`} {pbs.wbc && `WBC: ${pbs.wbc}`} {pbs.platelets && `Platelets: ${pbs.platelets}`} {pbs.others && pbs.others}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
           )}
           {activeTab === 'ekg' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><HeartPulse size={20} className="text-red-500"/> EKG</h3>
                  <button onClick={() => { setEkgToEdit(null); setShowAddEKG(true); }} className="px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold hover:bg-red-500/20 flex items-center gap-2">
                    <Plus size={14}/> Add EKG
                  </button>
                </div>
                <div className="space-y-4">
                  {(patient.ekgs && patient.ekgs.length > 0) ? patient.ekgs.map(ekg => (
                    <div key={ekg.id} className="p-5 bg-glass-panel border border-glass-border rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-main text-lg">EKG - {new Date(ekg.date).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${ekg.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>{ekg.status}</span>
                          <button onClick={() => { setEkgToEdit(ekg); setShowAddEKG(true); }} className="p-1.5 rounded bg-glass-depth text-muted hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14}/></button>
                        </div>
                      </div>
                      <div className="text-sm text-main whitespace-pre-wrap">{ekg.interpretation}</div>
                      {ekg.imageUrl && (
                        <div className="mt-3">
                          <img src={ekg.imageUrl} alt="EKG image" className="rounded-lg max-h-64 cursor-pointer" onClick={() => { setPreviewImages([ekg.imageUrl!]); setPreviewTitle(`EKG - ${formatToBuddhistEra(ekg.date, { timeStyle: 'short' })}`); setShowPreviewModal(true); }}/>
                        </div>
                      )}
                    </div>
                  )) : <div className="text-center py-12 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No EKGs recorded.</div>}
                </div>
              </div>
           )}
           {activeTab === 'imaging' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><Image size={20} className="text-purple-500"/> Imaging</h3>
                  <button onClick={() => setShowImagingImport(true)} className="px-3 py-1.5 bg-purple-500/10 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-500/20 flex items-center gap-2">
                    <Plus size={14}/> Add Study
                  </button>
                </div>
                <div className="space-y-4">
                  {(patient.imaging && patient.imaging.length > 0) ? patient.imaging.map(study => (
                    <div key={study.id} className="p-5 bg-glass-panel border border-glass-border rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-main text-lg">{study.modality}: {study.bodyPart}</div>
                          <div className="text-xs text-muted">{formatToBuddhistEra(study.date)}</div>
                        </div>
                        {study.isCritical && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">Critical Finding</span>}
                      </div>
                      <div className="space-y-3">
                        <div className="bg-glass-depth p-3 rounded-xl border border-glass-border/50">
                          <div className="text-[10px] font-bold text-muted uppercase mb-1">Indication</div>
                          <p className="text-sm text-main">{study.indication}</p>
                        </div>
                        <div className="bg-glass-depth p-3 rounded-xl border border-glass-border/50">
                          <div className="text-[10px] font-bold text-muted uppercase mb-1">Findings</div>
                          <p className="text-sm text-main whitespace-pre-wrap">{study.findings}</p>
                        </div>
                        <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                          <div className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Impression</div>
                          <p className="text-sm text-main whitespace-pre-wrap">{study.impression}</p>
                        </div>
                      </div>
                      {study.images && study.images.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-bold text-muted uppercase mb-2">Images</div>
                          <div className="flex gap-2 overflow-x-auto">
                            {study.images.map((img, idx) => (
                              <img key={idx} src={img} alt={`${study.modality} ${idx+1}`} className="h-24 w-24 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => { setPreviewImages(study.images!); setPreviewTitle(`${study.modality}: ${study.bodyPart}`); setShowPreviewModal(true); }}/>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )) : <div className="text-center py-12 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No imaging studies available.</div>}
                </div>
              </div>
           )}
           {activeTab === 'infection' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><Bug size={20} className="text-lime-500"/> Infection Control</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowMicroScan(true)} className="px-3 py-1.5 bg-lime-500/10 text-lime-600 rounded-lg text-xs font-bold hover:bg-lime-500/20 flex items-center gap-2">
                      {/* Scan Report button removed */}
                    </button>
                    <button onClick={() => setShowAddAntibiotic(true)} className="px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500/20 flex items-center gap-2">
                      <Plus size={14}/> Add Antibiotic
                    </button>
                  </div>
                </div>
                
                <ClinicalTimeline antibiotics={patient.antibiotics || []} cultures={patient.microbiology || []} events={patient.timeline || []} showEvents={false} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-main flex items-center gap-2"><Syringe size={16} className="text-blue-500"/> Antibiotics</h4>
                    {(patient.antibiotics && patient.antibiotics.length > 0) ? patient.antibiotics.map(abx => (
                      <AntibioticCard key={abx.id} abx={abx} onClick={() => { setAntibioticToEdit(abx); setShowAddAntibiotic(true); }} />
                    )) : <div className="text-center py-8 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No antibiotics prescribed.</div>}
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-main flex items-center gap-2"><Microscope size={16} className="text-orange-500"/> Cultures</h4>
                    {(patient.microbiology && patient.microbiology.length > 0) ? patient.microbiology.map(c => (
                      <CultureCard key={c.id} culture={c} onClick={() => { setCultureToEdit(c); setShowEditCulture(true); }} />
                    )) : <div className="text-center py-8 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No cultures collected.</div>}
                  </div>
                </div>
              </div>
           )}
           {activeTab === 'admission' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><FileText size={20} className="text-gray-500"/> Admission Note</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowScanModal(true)} className="px-3 py-1.5 bg-gray-500/10 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-500/20 flex items-center gap-2">
                      {/* Scan Note button removed */}
                    </button>
                    <button onClick={() => setShowManualAdmission(true)} className="px-3 py-1.5 bg-gray-500/10 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-500/20 flex items-center gap-2">
                      <Pencil size={14}/> Manual Entry
                    </button>
                  </div>
                </div>
                {patient.admissionNote ? (
                  <div className="p-6 bg-glass-panel border border-glass-border rounded-2xl shadow-sm relative group/note">
                    <button onClick={handleDeleteAdmissionNote} className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-600 opacity-0 group-hover/note:opacity-100 transition-opacity z-10"><Trash2 size={14}/></button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <AdmissionSection title="Chief Complaint" content={patient.admissionNote.chiefComplaint} />
                      <AdmissionSection title="History of Present Illness" content={patient.admissionNote.hpi} />
                      <AdmissionSection title="Past Medical History" content={patient.admissionNote.pmh} />
                      <AdmissionSection title="Physical Exam" content={patient.admissionNote.physicalExam} />
                      <div className="md:col-span-2">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-wider ml-1 mb-2">Problem List & Plan</h3>
                        <div className="space-y-3">
                          {patient.admissionNote.problemList.map((p, i) => (
                            <div key={i} className="p-4 rounded-xl bg-glass-depth border border-glass-border/50">
                              <div className="font-bold text-main">{i+1}. {p.problem}</div>
                              <p className="text-sm text-muted mt-1 pl-4">{p.plan}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : <div className="text-center py-12 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No admission note available.</div>}
              </div>
           )}
           {activeTab === 'problems' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><AlertCircle size={20} className="text-red-500"/> Problem List</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={undoProblemChange} disabled={historyIndex === 0} className="p-2 rounded-lg bg-gray-500/10 text-gray-600 disabled:opacity-50"><Undo2 size={14}/></button>
                    <button onClick={redoProblemChange} disabled={historyIndex === problemHistory.length - 1} className="p-2 rounded-lg bg-gray-500/10 text-gray-600 disabled:opacity-50"><Redo2 size={14}/></button>
                    <button onClick={() => setShowProblemScanModal(true)} className="px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold hover:bg-red-500/20 flex items-center gap-2">
                      {/* Scan List button removed */}
                    </button>
                    <button onClick={() => { setProblemToEditIndex(null); setShowManualProblemModal(true); }} className="px-3 py-1.5 bg-red-500/10 text-red-600 rounded-lg text-xs font-bold hover:bg-red-500/20 flex items-center gap-2">
                      <Plus size={14}/> Add Problem
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <div className="space-y-3">
                    <h4 className="font-bold text-main">Active Problems</h4>
                    {activeProblems.length > 0 ? activeProblems.map((p, i) => {
                      const originalIndex = currentProblemList.findIndex(item => item === p);
                      const systemConfig = SYSTEMS_CONFIG[p.system || ''] || { icon: <div className="w-3.5 h-3.5"></div>, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
                      return (
                        <div key={originalIndex} className={`p-4 rounded-2xl bg-glass-panel border ${systemConfig.border} shadow-sm group`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${systemConfig.bg} ${systemConfig.color}`}>{systemConfig.icon}</div>
                              <div>
                                <div className="font-bold text-main">{p.problem}</div>
                                <div className={`text-xs font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${getProblemStatusColor(p.status || 'Active')}`}>{p.status || 'Active'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setProblemToEditIndex(originalIndex); setShowManualProblemModal(true); }} className="p-1.5 text-muted hover:text-blue-500"><Pencil size={14}/></button>
                              <button onClick={() => handleDeleteProblem(originalIndex)} className="p-1.5 text-muted hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                          </div>
                          <div className="mt-3 pl-11">
                            <div className="text-xs font-bold text-muted uppercase mb-1">Plan</div>
                            <p className="text-sm text-main whitespace-pre-wrap">{p.plan}</p>
                          </div>
                        </div>
                      );
                    }) : <div className="text-center py-12 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No active problems.</div>}
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-bold text-main">Inactive / Resolved</h4>
                    {inactiveProblems.length > 0 ? inactiveProblems.map((p, i) => {
                      const originalIndex = currentProblemList.findIndex(item => item === p);
                      return (
                        <div key={originalIndex} className="p-3 rounded-xl bg-glass-panel border border-glass-border opacity-70 hover:opacity-100 transition-opacity group">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-main">{p.problem}</div>
                              <div className={`text-xs font-bold px-1.5 py-0.5 rounded inline-block mt-1 ${getProblemStatusColor(p.status || 'Resolved')}`}>{p.status || 'Resolved'}</div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setProblemToEditIndex(originalIndex); setShowManualProblemModal(true); }} className="p-1.5 text-muted hover:text-blue-500"><Pencil size={14}/></button>
                              <button onClick={() => handleDeleteProblem(originalIndex)} className="p-1.5 text-muted hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                          </div>
                        </div>
                      );
                    }) : <div className="text-center py-12 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No inactive problems.</div>}
                  </div>
                </div>
              </div>
           )}
           {activeTab === 'consults' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><Users size={20} className="text-teal-500"/> Consultations</h3>
                  <button onClick={() => { setConsultToEdit(null); setShowConsultModal(true); }} className="px-3 py-1.5 bg-teal-500/10 text-teal-600 rounded-lg text-xs font-bold hover:bg-teal-500/20 flex items-center gap-2">
                    <Plus size={14}/> Add Consult
                  </button>
                </div>
                <div className="space-y-4">
                  {(patient.consults && patient.consults.length > 0) ? patient.consults.map(c => (
                    <div key={c.id} className="p-5 bg-glass-panel border border-glass-border rounded-2xl shadow-sm group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-main">{c.specialty}</div>
                          <div className="text-xs text-muted">{formatToBuddhistEra(c.date)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${c.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>{c.status}</span>
                          <button onClick={() => { setConsultToEdit(c); setShowConsultModal(true); }} className="p-1.5 rounded bg-glass-depth text-muted hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14}/></button>
                        </div>
                      </div>
                      <div className="text-sm text-main whitespace-pre-wrap">{c.recommendations}</div>
                    </div>
                  )) : <div className="text-center py-12 text-muted italic border-2 border-dashed border-glass-border rounded-2xl">No consultations recorded.</div>}
                </div>
              </div>
           )}
           {activeTab === 'meds' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading font-bold text-lg text-main flex items-center gap-2"><Pill size={20} className="text-rose-500"/> Medications</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border">
                      <button onClick={() => setMedFilter('active')} className={`px-3 py-1 rounded-lg text-xs font-bold ${medFilter === 'active' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-muted'}`}>Active</button>
                      <button onClick={() => setMedFilter('discontinued')} className={`px-3 py-1 rounded-lg text-xs font-bold ${medFilter === 'discontinued' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-muted'}`}>Discontinued</button>
                    </div>
                    <button onClick={() => setShowInteractionModal(true)} className="p-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20" title="Check Interactions"><ShieldAlert size={16}/></button>
                    <button onClick={() => setShowReconcileModal(true)} className="p-2 rounded-lg bg-teal-500/10 text-teal-500 hover:bg-teal-500/20" title="Reconcile Pre-admission Meds"><History size={16}/></button>
                    <button onClick={() => { setMedToEdit(null); setShowMedSearch(true); }} className="px-3 py-1.5 bg-rose-500/10 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-500/20 flex items-center gap-2">
                      <Plus size={14}/> Add Med
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Inpatient Meds */}
                  <div className="p-4 bg-glass-panel border border-glass-border rounded-2xl">
                    <h4 className="font-bold text-main mb-3">Inpatient Medications</h4>
                    <div className="space-y-2">
                      {patient.medications.filter(m => medFilter === 'active' ? m.isActive : !m.isActive).map(med => (
                        <div key={med.id} className={`p-3 rounded-xl border flex flex-col group transition-all ${med.isActive ? 'bg-glass-depth border-glass-border' : 'bg-glass-panel border-transparent opacity-60 grayscale'}`}>
                          <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-3">
                              <button onClick={() => handleMedToggle(med)} className={`transition-colors ${med.isActive ? 'text-green-500' : 'text-muted'}`} title={med.isActive ? 'Active' : 'On Hold'}>
                                {med.isActive ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                              </button>
                              <div>
                                <div className="text-sm font-bold text-main flex items-center gap-2">{med.name}{med.specificSchedule && <Clock size={12} className="text-blue-500" />}</div>
                                <div className="text-xs text-muted">{med.dose} • {med.route} • {med.frequency}</div>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setMedToEdit(med); setShowMedSearch(true); }} className="p-1.5 text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg"><Pencil size={14} /></button>
                              <button onClick={() => { const newMeds = patient.medications.filter(m => m.id !== med.id); onUpdatePatient({...patient, medications: newMeds}); }} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Pre-admission Meds */}
                  <div className="p-4 bg-glass-panel border border-glass-border rounded-2xl">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-main">Pre-Admission Medications</h4>
                      {/* Scan List button removed */}
                    </div>
                    <div className="space-y-2">
                      {(patient.preAdmissionMedications && patient.preAdmissionMedications.length > 0) ? patient.preAdmissionMedications.map((med, i) => (
                        <div key={i} className="p-3 rounded-xl bg-glass-depth border-glass-border">
                          <div className="text-sm font-bold text-main">{med.name}</div>
                          <div className="text-xs text-muted">{med.dose} • {med.route} • {med.frequency}</div>
                        </div>
                      )) : <div className="text-center text-muted text-sm py-8 border-2 border-dashed border-glass-border rounded-xl">No pre-admission meds listed.</div>}
                    </div>
                  </div>
                </div>
              </div>
           )}
        </div>
    </div>
  );
};

export default PatientDetail;
