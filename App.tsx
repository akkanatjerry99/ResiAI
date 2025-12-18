import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './components/Layout';
import PatientCard from './components/PatientCard';
import PatientDetail from './components/PatientDetail';
import AddTaskModal from './components/AddTaskModal';
import AddPatientModal from './components/AddPatientModal';
import EditPatientModal from './components/EditPatientModal';
import ClinicalScanModal from './components/ClinicalScanModal';
import SettingsView from './components/SettingsView';
import ProfileModal from './components/ProfileModal';
import AdminPanel from './components/AdminPanel';
import HandoffExportModal from './components/HandoffExportModal';
import NightShiftDashboard from './components/NightShiftDashboard';
import DirectoryEditModal, { DirectoryItem } from './components/DirectoryEditModal';
import DirectoryView from './components/DirectoryView';
import { MOCK_PATIENTS } from './constants'; 
import { Patient, ViewMode, TaskPriority, ClinicalAdmissionNote, User, UserRole, UserStatus, Task, Medication, Handoff, Acuity } from './types';
import { ScanFace, Lock, Activity, Phone, UserPlus, FileText, CheckCircle2, TrendingUp, Users, AlertTriangle, X, ShieldCheck, Database, RotateCcw, Mail, ArrowRight, Sun, Moon, Loader2, Hourglass, Zap, ClipboardList, BedDouble, CheckSquare, PieChart, LayoutGrid, Search, CalendarCheck, Filter, ListTodo, Layers, List, HeartPulse, Shield, Scan, FlaskConical, Droplet, Pill, Monitor, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown, Save, UserMinus, Plus, LogOut, Sparkles, FileOutput, Stethoscope, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, ReferenceLine, LineChart, Line } from 'recharts';
import { secureDB } from './services/secureDatabase';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { formatToBuddhistEra } from './services/dateService';

// Thai detection helper
const isThai = (text: string | undefined | null) => /[\u0E00-\u0E7F]/.test((text || '').toString());
const thaiClass = (text: string | undefined | null) => isThai(text) ? 'font-thai' : '';
import { anonymizePatientContext } from './services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import ModernSelect from './components/ui/ModernSelect';
import MedicationScanModal from './components/MedicationScanModal';
import PatientList from './components/PatientList';
import DrugInteractionModal from './components/DrugInteractionModal';



// Mock Data for Chart - Enhanced
const chartData = [
  { name: 'Mon', total: 12, unstable: 2 },
  { name: 'Tue', total: 14, unstable: 3 },
  { name: 'Wed', total: 13, unstable: 2 },
  { name: 'Thu', total: 16, unstable: 4 },
  { name: 'Fri', total: 15, unstable: 3 },
  { name: 'Sat', total: 12, unstable: 1 },
  { name: 'Sun', total: 12, unstable: 1 },
];

const acuityTrendData = [
  { name: 'Mon', stable: 8, watch: 2, unstable: 2 },
  { name: 'Tue', stable: 7, watch: 4, unstable: 3 },
  { name: 'Wed', stable: 8, watch: 3, unstable: 2 },
  { name: 'Thu', stable: 6, watch: 5, unstable: 5 },
  { name: 'Fri', stable: 9, watch: 3, unstable: 3 },
  { name: 'Sat', stable: 10, watch: 2, unstable: 0 },
  { name: 'Sun', stable: 11, watch: 1, unstable: 0 },
];

const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Dr. Sarah Lin', email: 'sarah.lin@hospital.com', role: 'Attending', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=1', lastActive: '2 mins ago' },
    { id: 'u2', name: 'Dr. Mike Ross', email: 'mike.ross@hospital.com', role: 'Resident', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=2', lastActive: '1 hour ago' },
    { id: 'u3', name: 'Jane Doe', email: 'jane.doe@hospital.com', role: 'Nurse', status: 'On Leave', avatar: 'https://i.pravatar.cc/150?u=3', lastActive: '2 days ago' },
    { id: 'u4', name: 'Admin User', email: 'admin@hospital.com', role: 'Admin', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=admin', lastActive: 'Just now' },
    { id: 'u5', name: 'Night Float', email: 'night.shift@hospital.com', role: 'Night Shift', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=night', lastActive: 'Never' },
];

const INITIAL_DIRECTORY: DirectoryItem[] = [
    { id: 'd1', name: 'Code Blue Team', ext: '1111', category: 'Emergency', icon: <HeartPulse size={20}/>, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
    { id: 'd2', name: 'Security', ext: '1911', category: 'Emergency', icon: <Shield size={20}/>, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
    { id: 'd3', name: 'Operator', ext: '0', category: 'Services', icon: <Phone size={20}/>, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { id: 'd4', name: 'Radiology Reading Room', ext: '2340', category: 'Services', icon: <Scan size={20}/>, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
    { id: 'd5', name: 'Central Lab', ext: '2400', category: 'Services', icon: <FlaskConical size={20}/>, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
    { id: 'd6', name: 'Blood Bank', ext: '2200', category: 'Services', icon: <Droplet size={20}/>, color: 'text-red-600 bg-red-600/10 border-red-600/20' },
    { id: 'd7', name: 'Pharmacy Main', ext: '2500', category: 'Services', icon: <Pill size={20}/>, color: 'text-green-500 bg-green-500/10 border-green-500/20' },
    { id: 'd8', name: 'IT Support', ext: '9999', category: 'Services', icon: <Monitor size={20}/>, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
    { id: 'd9', name: 'Ward 4 (Internal Med)', ext: '4000', category: 'Wards', icon: <BedDouble size={20}/>, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' },
    { id: 'd10', name: 'ICU 1', ext: '5000', category: 'Wards', icon: <Activity size={20}/>, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
];

// Simple XOR encryption for prototype security (wraps Master PIN with Night PIN)
const xorEncrypt = (text: string, key: string) => {
    let result = '';
    for(let i=0; i<text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
}

const xorDecrypt = (encoded: string, key: string) => {
    try {
        const text = atob(encoded);
        let result = '';
        for(let i=0; i<text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    } catch (e) {
        return null;
    }
}

// ... (AnimatedCounter, ManageTeamModal, DashboardRightPanel, ConfirmModal, StatCard - KEEP SAME)
const AnimatedCounter = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;
        const duration = 1000;
        const startTime = performance.now();
        const update = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * ease);
            setDisplayValue(current);
            if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }, [value]); 
    return <span>{displayValue}</span>;
};

const ManageTeamModal = ({ isOpen, onClose, users, onUpdate }: { isOpen: boolean, onClose: () => void, users: User[], onUpdate: (users: User[]) => void }) => {
    const [team, setTeam] = useState<User[]>(users);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('Resident');
    useEffect(() => { if(isOpen) setTeam(users); }, [isOpen, users]);
    const moveUser = (index: number, direction: -1 | 1) => { const newTeam = [...team]; if (index + direction < 0 || index + direction >= newTeam.length) return; const temp = newTeam[index]; newTeam[index] = newTeam[index + direction]; newTeam[index + direction] = temp; setTeam(newTeam); };
    const removeUser = (id: string) => { setTeam(prev => prev.filter(u => u.id !== id)); };
    const addUser = () => { if (!newName) return; const newUser: User = { id: Date.now().toString(), name: newName, email: '', role: newRole, status: 'Active', avatar: `https://i.pravatar.cc/150?u=${Date.now()}` }; setTeam(prev => [...prev, newUser]); setNewName(''); };
    const handleSave = () => { onUpdate(team); onClose(); };
    if (!isOpen) return null;
    return ( <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"> <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-md shadow-2xl relative backdrop-blur-xl"> <div className="flex justify-between items-center mb-4"> <h3 className="font-bold text-lg text-main">Manage Team Members</h3> <button onClick={onClose}><X size={20} className="text-muted hover:text-main"/></button> </div> <div className="space-y-4 mb-6"> <div className="flex gap-2"> <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add Member Name..." className="flex-1 bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm outline-none" /> <div className="w-32"> <ModernSelect value={newRole} onChange={v => setNewRole(v as UserRole)} options={['Attending', 'Resident', 'Intern', 'Nurse', 'Night Shift']} /> </div> <button onClick={addUser} className="p-2 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20"><Plus size={20}/></button> </div> <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar"> {team.map((user, idx) => ( <div key={user.id} className="flex items-center gap-2 p-2 bg-glass-depth rounded-xl border border-glass-border"> <span className="text-xs font-bold text-muted w-4">{idx + 1}</span> <img src={user.avatar} className="w-8 h-8 rounded-full border border-glass-border" /> <div className="flex-1 min-w-0"> <div className="text-sm font-bold text-main truncate">{user.name}</div> <div className="text-[10px] text-muted">{user.role}</div> </div> <div className="flex gap-1"> <button onClick={() => moveUser(idx, -1)} className="p-1 hover:bg-white/10 rounded"><ArrowUp size={14}/></button> <button onClick={() => moveUser(idx, 1)} className="p-1 hover:bg-white/10 rounded"><ArrowDown size={14}/></button> <button onClick={() => removeUser(user.id)} className="p-1 hover:bg-red-500/10 text-red-500 rounded"><UserMinus size={14}/></button> </div> </div> ))} </div> </div> <button onClick={handleSave} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"> <Save size={18}/> Save Order & Members </button> </div> </div> );
};

const DashboardRightPanel = ({ patients, users, onPatientClick, onMovePatient, onUpdateTeam, onUnassignPatient, onEditPatient }: any) => {
    // ... Simplified for brevity, same logic as before ...
    const [isEditingCensus, setIsEditingCensus] = useState(false); const [isEditingTeam, setIsEditingTeam] = useState(false); const [bedLayout, setBedLayout] = useState<string[]>([]);
    useEffect(() => { const savedLayout = localStorage.getItem('ResiFlow_BedLayout'); if (savedLayout) { setBedLayout(JSON.parse(savedLayout)); } else { setBedLayout(Array.from({ length: 20 }, (_, i) => (401 + i).toString())); } }, []);
    const saveLayout = (layout: string[]) => { setBedLayout(layout); localStorage.setItem('ResiFlow_BedLayout', JSON.stringify(layout)); };
    const handleAddBed = () => { const lastBed = bedLayout[bedLayout.length - 1]; const nextNum = parseInt(lastBed) + 1 || bedLayout.length + 1; saveLayout([...bedLayout, nextNum.toString()]); };
    const handleRemoveBed = (index: number) => { const newLayout = bedLayout.filter((_, i) => i !== index); saveLayout(newLayout); };
    const handleRenameBed = (index: number, newName: string) => { const newLayout = [...bedLayout]; newLayout[index] = newName; saveLayout(newLayout); };
    const bedGrid = bedLayout.map(bedStr => { const patientInBed = patients.find((p:any) => p.roomNumber === bedStr && p.status !== 'Discharged'); let status = 'vacant'; if (patientInBed) { status = 'occupied'; if (patientInBed.isolation !== 'None') status = 'isolation'; if (patientInBed.tasks.some((t:any) => t.description.toLowerCase().includes('discharge'))) status = 'discharge'; } return { id: bedStr, status, patient: patientInBed }; });
    const handleDragStart = (e: React.DragEvent, patientId: string) => { e.dataTransfer.setData("patientId", patientId); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
    const handleDrop = (e: React.DragEvent, targetBedId: string, targetPatientId?: string) => { e.preventDefault(); const draggedPatientId = e.dataTransfer.getData("patientId"); if (!draggedPatientId || draggedPatientId === targetPatientId) return; onMovePatient(draggedPatientId, targetBedId, targetPatientId); };
    return ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}> <ManageTeamModal isOpen={isEditingTeam} onClose={() => setIsEditingTeam(false)} users={users} onUpdate={onUpdateTeam} /> <div> <div className="flex justify-between items-center mb-4"> <h3 className="font-bold text-main text-lg">Team Members</h3> <button onClick={() => setIsEditingTeam(true)} className="text-xs text-blue-400 font-bold hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-lg"><Pencil size={12}/> Manage</button> </div> <div className="space-y-4"> {users.slice(0, 4).map((member:any, i:number) => ( <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl bg-glass-panel border border-glass-border hover:bg-glass-depth transition-colors cursor-pointer group shadow-sm"> <div className="relative"> <div className="w-10 h-10 rounded-full overflow-hidden border border-glass-border group-hover:border-blue-500 transition-colors"><img src={member.avatar} alt={member.name} className="w-full h-full object-cover" /></div> <div className="absolute -top-1 -left-1 bg-glass-panel rounded-full border border-glass-border w-4 h-4 flex items-center justify-center text-[8px] font-bold text-muted">{i + 1}</div> </div> <div className="flex-1 min-w-0"><div className="text-sm font-bold text-main truncate">{member.name}</div><div className="text-xs text-muted truncate">{member.role}</div></div> <div className={`w-2 h-2 rounded-full ${member.status === 'Active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-500'}`}></div> </div> ))} </div> </div> <div className="mt-6"> <div className="flex justify-between items-center mb-4"> <h3 className="font-bold text-main text-lg flex items-center gap-2"><BedDouble size={20} className="text-blue-500"/> Unit Census</h3> <button onClick={() => setIsEditingCensus(!isEditingCensus)} className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${isEditingCensus ? 'bg-green-500 text-white shadow-lg' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}>{isEditingCensus ? <CheckCircle2 size={12}/> : <Pencil size={12}/>}{isEditingCensus ? 'Done' : 'Edit Map'}</button> </div> <div className={`p-5 rounded-3xl bg-glass-panel border border-glass-border shadow-sm backdrop-blur-md transition-all ${isEditingCensus ? 'ring-2 ring-blue-500/30' : ''}`}> <div className="flex justify-between items-end mb-4"> <div><div className="text-3xl font-bold text-main">{patients.length}<span className="text-lg text-muted font-medium">/{bedLayout.length}</span></div><div className="text-xs text-muted font-bold uppercase tracking-wider">Occupancy</div></div> {!isEditingCensus && (<div className="flex flex-col items-end gap-1"><div className="flex items-center gap-1.5 text-[10px] text-muted"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Active</div><div className="flex items-center gap-1.5 text-[10px] text-muted"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Iso</div></div>)} {isEditingCensus && <div className="text-[10px] font-bold text-blue-500 animate-pulse">Drag & Drop to Move</div>} </div> <div className="grid grid-cols-4 gap-3 mb-2"> {bedGrid.map((bed, idx) => ( <div key={`${bed.id}-${idx}`} onDragOver={isEditingCensus ? handleDragOver : undefined} onDrop={isEditingCensus ? (e) => handleDrop(e, bed.id, bed.patient?.id) : undefined} className="relative group"> <motion.div whileHover={{ scale: 1.05 }} draggable={isEditingCensus && !!bed.patient} onDragStart={(e: any) => bed.patient && handleDragStart(e, bed.patient.id)} className={`aspect-square rounded-xl flex items-center justify-center text-[10px] font-bold transition-all relative border overflow-hidden ${isEditingCensus ? 'cursor-move border-dashed' : 'cursor-pointer'} ${bed.status === 'vacant' ? `bg-glass-depth ${isEditingCensus ? 'border-blue-400/50 bg-blue-500/5' : 'border-glass-border text-muted/30 hover:bg-glass-border'}` : ''} ${bed.status === 'occupied' ? 'bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20' : ''} ${bed.status === 'isolation' ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20' : ''} ${bed.status === 'discharge' ? 'bg-green-500 text-white border-green-600 shadow-md shadow-green-500/20' : ''}`} onClick={() => { if (!isEditingCensus && bed.patient) { onPatientClick(bed.patient); } }}> {isEditingCensus ? (<input value={bed.id} onChange={(e) => handleRenameBed(idx, e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full h-full bg-transparent text-center outline-none"/>) : (bed.id)} {isEditingCensus && (<div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">{bed.patient ? (<><button onClick={(e) => { e.stopPropagation(); onUnassignPatient(bed.patient!); }} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600" title="Unassign Patient"><Trash2 size={12}/></button><button onClick={(e) => { e.stopPropagation(); onEditPatient(bed.patient!); }} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600" title="Edit Patient Details"><Pencil size={12}/></button></>) : (<button onClick={(e) => { e.stopPropagation(); handleRemoveBed(idx); }} className="p-1.5 bg-red-500/80 text-white rounded hover:bg-red-600" title="Delete Bed Slot"><X size={12}/></button>)}</div>)} {bed.patient && !isEditingCensus && (<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl transition-opacity"><div className="font-bold">{bed.patient.name}</div><div className="text-[9px] opacity-70 font-normal">{bed.patient.diagnosis.substring(0, 20)}...</div></div>)} </motion.div> </div> ))} {isEditingCensus && (<button onClick={handleAddBed} className="aspect-square rounded-xl border-2 border-dashed border-glass-border flex items-center justify-center text-muted hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"><Plus size={20}/></button>)} </div> </div> </div> </motion.div> );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => { if (!isOpen) return null; return (<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"><div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-sm shadow-2xl relative backdrop-blur-xl m-4"><h3 className="text-lg font-bold text-main mb-2">{title}</h3><p className="text-sm text-muted mb-6">{message}</p><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-2 rounded-xl border border-glass-border text-muted font-bold hover:bg-glass-depth">Cancel</button><button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg">Confirm</button></div></div></div>); };
const StatCard = ({ label, value, icon, trend, color, alert }: { label: string, value: string, icon: React.ReactNode, trend: string, color: string, alert?: boolean }) => (<div className={`p-5 rounded-2xl bg-glass-panel border border-glass-border shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:bg-glass-depth transition-all ${alert ? 'border-red-500/30 bg-red-500/5' : ''}`}><div className="flex justify-between items-start z-10"><div className={`p-2.5 rounded-xl text-white ${color} shadow-lg`}>{icon}</div><span className={`text-xs font-bold px-2 py-1 rounded-full border ${alert ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-glass-depth text-muted border-glass-border'}`}>{trend}</span></div><div className="z-10"><div className="text-2xl font-bold text-main">{value}</div><div className="text-xs text-muted font-medium uppercase tracking-wider">{label}</div></div><div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 blur-2xl ${color}`}></div></div>);

// ... (Main App Component)
const App = () => {
  // ... (State declarations same as original)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState(''); 
  const [confirmPin, setConfirmPin] = useState(''); 
  const [isDarkMode, setIsDarkMode] = useState(true); 
  const [activeTab, setActiveTab] = useState('list');
  const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');
  const [patients, setPatients] = useState<Patient[]>([]); 
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetailTab, setPatientDetailTab] = useState<string>('overview'); 
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [userProfile, setUserProfile] = useState<User>(MOCK_USERS[3]); 
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskTargetPatientId, setTaskTargetPatientId] = useState<string | null>(null);
  const [editingTaskData, setEditingTaskData] = useState<{ patientId: string, task: Task } | null>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanTargetPatientId, setScanTargetPatientId] = useState<string | null>(null);
  const [showHandoffExportModal, setShowHandoffExportModal] = useState(false);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<{ patientId: string, taskId: string } | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
    const [dashboardTaskFilter, setDashboardTaskFilter] = useState<'all' | 'urgent' | 'pending'>('all');
    const [dashboardTaskCategory, setDashboardTaskCategory] = useState<'all' | 'meds' | 'labs' | 'consults' | 'imaging' | 'other'>('all');
  const [dashboardTaskView, setDashboardTaskView] = useState<'flat' | 'grouped'>('flat');
  const [showMedScanModal, setShowMedScanModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  
  // Directory State
  const [directoryItems, setDirectoryItems] = useState<DirectoryItem[]>(INITIAL_DIRECTORY);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [directoryItemToEdit, setDirectoryItemToEdit] = useState<DirectoryItem | null>(null);
  const [directoryDeleteId, setDirectoryDeleteId] = useState<string | null>(null);

  // Night Shift Mode Logic
  const [isNightLogin, setIsNightLogin] = useState(false);

  // Check URL params for Night Shift Mode
  useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('login') === 'night') {
          setIsNightLogin(true);
          // Pre-set for Night Shift
          const nightUser = MOCK_USERS.find(u => u.role === 'Night Shift') || MOCK_USERS.find(u => u.email === 'night.shift@hospital.com');
          if (nightUser) {
              setEmail(nightUser.email);
          } else {
              setEmail('night.shift@hospital.com'); 
          }
          setIsDarkMode(true); // Default to Dark for Night Shift
          setAuthMode('signin');
      }
  }, []);

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;

  // ... (Filtered Patients and Load Profile Effects remain the same) ...
  const filteredPatients = useMemo(() => {
      let result = patients.filter(p => p.status !== 'Discharged' || !!searchQuery); 
      if (searchQuery) {
          const lowerQ = (searchQuery || '').toLowerCase();
          result = result.filter(p => 
              (p.name || '').toLowerCase().includes(lowerQ) || 
              (p.hn || '').toLowerCase().includes(lowerQ) ||
              (p.diagnosis || '').toLowerCase().includes(lowerQ) || 
              (p.roomNumber || '').toLowerCase().includes(lowerQ)
          );
      }
      return result.sort((a, b) => 
          a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [patients, searchQuery]);

  useEffect(() => {
      const storedName = localStorage.getItem('ResiFlow_Name');
      const storedAvatar = localStorage.getItem('ResiFlow_Avatar');
      const storedEmail = localStorage.getItem('ResiFlow_Email');
      if(storedName || storedAvatar || storedEmail) {
          setUserProfile(prev => ({
              ...prev,
              name: storedName || prev.name,
              avatar: storedAvatar || prev.avatar,
              email: storedEmail || prev.email
          }));
      }
  }, []);

  // Directory Helper
  const getCategoryIconAndColor = (category: string) => {
      switch(category) {
          case 'Emergency': return { icon: <HeartPulse size={20}/>, color: 'text-red-500 bg-red-500/10 border-red-500/20' };
          case 'Wards': return { icon: <BedDouble size={20}/>, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' };
          case 'Services': return { icon: <Stethoscope size={20}/>, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
          default: return { icon: <Phone size={20}/>, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
      }
  };

  // ... (All existing handlers remain the same) ...
  const handleUpdateProfile = (updates: Partial<User>) => { setUserProfile(prev => ({ ...prev, ...updates })); setUsers(prev => prev.map(u => u.id === userProfile.id ? { ...u, ...updates } : u)); if (updates.name) localStorage.setItem('ResiFlow_Name', updates.name); if (updates.avatar) localStorage.setItem('ResiFlow_Avatar', updates.avatar); if (updates.email) localStorage.setItem('ResiFlow_Email', updates.email); };
  const handleAddUser = (newUser: Omit<User, 'id'>) => { const u: User = { ...newUser, id: Date.now().toString() }; setUsers(prev => [...prev, u]); };
  const handleUpdateUser = (id: string, updates: Partial<User>) => { setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u)); if (id === userProfile.id) { setUserProfile(prev => ({ ...prev, ...updates })); } };
  const handleDeleteUser = (id: string) => { setUsers(prev => prev.filter(u => u.id !== id)); };
  const handleUpdateTeam = (newTeam: User[]) => { setUsers(newTeam); };
  const handleMovePatient = (patientId: string, newRoomNumber: string, swapWithPatientId?: string) => { const patientA = patients.find(p => p.id === patientId); if (!patientA) return; const oldRoom = patientA.roomNumber; let newPatients = [...patients]; if (swapWithPatientId) { const patientB = newPatients.find(p => p.id === swapWithPatientId); if (patientB) { patientB.roomNumber = oldRoom; patientA.roomNumber = newRoomNumber; persistPatient(patientB); } } else { patientA.roomNumber = newRoomNumber; } persistPatient(patientA); };
  const handleUnassignPatient = (patient: Patient) => { const updated = { ...patient, roomNumber: 'Unassigned' }; persistPatient(updated); };
  const handleEditPatientModal = (patient: Patient) => { setPatientToEdit(patient); setShowEditPatientModal(true); };
  const handleTabChange = (tab: string) => { setActiveTab(tab); setViewMode('DASHBOARD'); setSelectedPatientId(null); };
  const handleSaveDirectoryItem = (itemData: Omit<DirectoryItem, 'icon' | 'color'> & { id?: string }) => { const styles = getCategoryIconAndColor(itemData.category); if (itemData.id) { setDirectoryItems(prev => prev.map(item => item.id === itemData.id ? { ...item, ...itemData, ...styles } : item)); } else { const newItem: DirectoryItem = { id: Date.now().toString(), ...itemData, ...styles }; setDirectoryItems(prev => [...prev, newItem]); } setShowDirectoryModal(false); setDirectoryItemToEdit(null); };
  const handleRequestDeleteDirectory = (id: string) => { setDirectoryDeleteId(id); };
  const handleConfirmDeleteDirectory = () => { if (directoryDeleteId) { setDirectoryItems(prev => prev.filter(item => item.id !== directoryDeleteId)); setDirectoryDeleteId(null); } };
  
  // Handlers for Configure Night Mode
  const handleConfigureNightMode = (nightPin: string) => {
      // In a real app, you'd verify the current Master PIN first.
      // Since we are logged in, we assume 'pin' state holds the Master PIN.
      if (!pin) {
          alert("Error: Master PIN not found in session.");
          return;
      }
      
      try {
          const encryptedMasterPin = xorEncrypt(pin, nightPin);
          localStorage.setItem('ResiFlow_NightKey', encryptedMasterPin);
          // Store a simple hash of night pin to verify it without decrypting
          localStorage.setItem('ResiFlow_NightHash', btoa(nightPin));
          alert("Night Shift Access Configured Successfully.");
      } catch (e) {
          console.error("Encryption failed", e);
          alert("Failed to secure night mode.");
      }
  };

  // ... (Notifications Memo remains same) ...
  const notifications = useMemo(() => {
    const notifs = [];
    patients.forEach(p => { if (p.status === 'Discharged') return; p.tasks.forEach(t => { if (!t.isCompleted && (t.priority === TaskPriority.URGENT || t.priority === TaskPriority.BEFORE_NOON)) { notifs.push({ id: `task-${t.id}`, title: t.priority === TaskPriority.URGENT ? 'Urgent Task' : 'Task Due Soon', desc: `${p.name}: ${t.description}`, time: 'Pending', type: 'alert', patientId: p.id, targetTab: 'workflow' }); } }); });
    patients.forEach(p => { if (p.status === 'Discharged') return; const pendingLabs = p.timeline?.filter(e => e.status === 'Pending Result'); if (pendingLabs && pendingLabs.length > 0) { pendingLabs.forEach(lab => { notifs.push({ id: `lab-${lab.id}`, title: 'Result Pending', desc: `${p.name}: ${lab.title}`, time: 'Check Status', type: 'info', patientId: p.id, targetTab: 'labs' }); }); } });
    return notifs.filter(n => !readNotificationIds.has(n.id));
  }, [patients, readNotificationIds]);

  const handleNotificationClick = (n: any) => { if (n.patientId) { const targetP = patients.find(p => p.id === n.patientId); if (targetP) { setSelectedPatientId(targetP.id); if (n.targetTab) setPatientDetailTab(n.targetTab); setViewMode('PATIENT_DETAIL'); setActiveTab('list'); } } };
  const handleMarkAllRead = () => { const newReadSet = new Set(readNotificationIds); notifications.forEach(n => newReadSet.add(n.id)); setReadNotificationIds(newReadSet); };
  
  // MODIFIED LOGIN HANDLER
  const handleLogin = async (e?: React.FormEvent) => { 
      if(e) e.preventDefault(); 
      
      // Night Mode Logic
      if (isNightLogin) {
          if (!pin) { setLoginError("Please enter the Night Passcode."); return; }
          const encryptedMasterKey = localStorage.getItem('ResiFlow_NightKey');
          if (!encryptedMasterKey) {
              setLoginError("Night Access not configured by Admin.");
              return;
          }
          
          const decryptedMasterPin = xorDecrypt(encryptedMasterKey, pin);
          if (!decryptedMasterPin) {
              setLoginError("Invalid Passcode.");
              return;
          }

          // Try to initialize DB with the decrypted master PIN
          setIsAuthenticating(true);
          setLoginError('');
          try {
              const success = await secureDB.initialize(decryptedMasterPin);
              if (success) {
                  try {
                      const data = await secureDB.getAllPatients();
                      setPatients(data);
                      const nightUser = users.find(u => u.role === 'Night Shift') || MOCK_USERS.find(u => u.role === 'Night Shift');
                      if (nightUser) setUserProfile(nightUser);
                      setIsAuthenticated(true);
                      // Force night dashboard view if logic permits, usually handled by checking user role/mode
                  } catch (decryptionError: any) {
                      setLoginError("Access Denied. Wrong Passcode.");
                  }
              } else {
                  setLoginError("Failed to access database.");
              }
          } catch (err) {
              setLoginError("An error occurred during login.");
          } finally {
              setIsAuthenticating(false);
          }
          return;
      }

      // Standard Logic
      if (!pin) { setLoginError("Please enter your password."); return; } 
      if (authMode === 'signup' && email) localStorage.setItem('ResiFlow_Email', email); 
      if (authMode === 'signup' && pin !== confirmPin) { setLoginError("Passwords do not match."); return; } 
      setIsAuthenticating(true); 
      setLoginError(''); 
      try { 
          const success = await secureDB.initialize(pin); 
          if (success) { 
              try { 
                  const data = await secureDB.getAllPatients(); 
                  setPatients(data); 
                  
                  // Identify User
                  const user = users.find(u => u.email === email) || MOCK_USERS[3]; 
                  setUserProfile(user);
                  
                  setIsAuthenticated(true); 
              } catch (decryptionError: any) { 
                  setLoginError(decryptionError.message || "Decryption Failed. Wrong Password?"); 
              } 
          } else { 
              setLoginError("Failed to initialize database."); 
          } 
      } catch (err) { 
          setLoginError("An error occurred during login."); 
      } finally { 
          setIsAuthenticating(false); 
      } 
  };

  const handleResetApp = async () => { if(window.confirm("Are you sure? This will delete all encrypted data on this device and reset the app to factory settings. You cannot undo this.")) { await secureDB.resetDatabase(); localStorage.removeItem('ResiFlow_NightKey'); window.location.reload(); } };
  const handleLogout = () => { setIsAuthenticated(false); setViewMode('DASHBOARD'); setSelectedPatientId(null); setPatients([]); setPin(''); setConfirmPin(''); setShowProfileModal(false); };
  const handleExportData = () => { const dataStr = JSON.stringify(patients, null, 2); const blob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `resiflow_backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const handleRestoreData = (file: File) => { const reader = new FileReader(); reader.onload = async (e) => { try { const json = JSON.parse(e.target?.result as string); if (Array.isArray(json)) { await secureDB.restoreFromBackup(json); setPatients(json); alert("Data restored successfully."); } else { alert("Invalid backup file format."); } } catch (err) { alert("Failed to parse backup file."); } }; reader.readAsText(file); };
  const handleChangePin = async (oldPin: string, newPin: string): Promise<boolean> => { try { const success = await secureDB.changePin(newPin); if (success) { setPin(newPin); return true; } return false; } catch (e) { return false; } };
  const handlePatientClick = (patient: Patient) => { setSelectedPatientId(patient.id); setPatientDetailTab('overview'); setViewMode('PATIENT_DETAIL'); };
  const handleBack = () => { setViewMode('DASHBOARD'); setSelectedPatientId(null); };
  const handlePrevPatient = () => { if (!selectedPatient) return; const idx = patients.findIndex(p => p.id === selectedPatient.id); const prevIdx = idx > 0 ? idx - 1 : patients.length - 1; setSelectedPatientId(patients[prevIdx].id); };
  const handleNextPatient = () => { if (!selectedPatient) return; const idx = patients.findIndex(p => p.id === selectedPatient.id); const nextIdx = idx < patients.length - 1 ? idx + 1 : 0; setSelectedPatientId(patients[nextIdx].id); };
  const handleQuickAddTask = (patientId: string) => { setTaskTargetPatientId(patientId); setEditingTaskData(null); setShowAddTaskModal(true); };
  const handleEditTask = (patientId: string, task: Task) => { setEditingTaskData({ patientId, task }); setShowAddTaskModal(true); };
  const handleQuickScan = (patientId: string) => { setScanTargetPatientId(patientId); setShowScanModal(true); };
  const handleMedicationScan = (scannedMeds: Medication[]) => { console.log("Global med scan complete", scannedMeds); setShowMedScanModal(false); };
  const persistPatient = async (updatedPatient: Patient) => { setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p)); try { await secureDB.savePatient(updatedPatient); } catch (e) { console.error("Failed to save", e); } };
  const handleScanComplete = (note: ClinicalAdmissionNote) => { if (!scanTargetPatientId) return; const targetP = patients.find(p => p.id === scanTargetPatientId); if (targetP) { const updates: any = { admissionNote: note }; if (note.patientDemographics) { if ((!targetP.hn || targetP.hn === '') && note.patientDemographics.hn) { updates.hn = note.patientDemographics.hn; } if ((!targetP.age || targetP.age === 0) && note.patientDemographics.age) { updates.age = note.patientDemographics.age; } if (note.patientDemographics.gender) { updates.gender = note.patientDemographics.gender; } if ((targetP.name.includes('New Patient') || !targetP.name) && note.patientDemographics.name) { updates.name = note.patientDemographics.name; } } const updated = { ...targetP, ...updates }; persistPatient(updated); } setShowScanModal(false); setScanTargetPatientId(null); };
  const handleSaveTask = (taskData: { description: string, priority: TaskPriority, dueDate?: string }) => { if (editingTaskData) { const p = patients.find(p => p.id === editingTaskData.patientId); if (p) { const updatedTasks = p.tasks.map(t => t.id === editingTaskData.task.id ? { ...t, ...taskData } : t); persistPatient({ ...p, tasks: updatedTasks }); } setEditingTaskData(null); } else if (taskTargetPatientId) { const p = patients.find(p => p.id === taskTargetPatientId); if (p) { const updatedTasks = [...p.tasks, { id: Date.now().toString(), isCompleted: false, ...taskData }]; persistPatient({ ...p, tasks: updatedTasks }); } setTaskTargetPatientId(null); } setShowAddTaskModal(false); };
  const handleToggleTask = (patientId: string, taskId: string) => { const targetP = patients.find(p => p.id === patientId); if (targetP) { const updated = { ...targetP, tasks: targetP.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t) }; persistPatient(updated); } };
  const handleRequestDeleteTask = (patientId: string, taskId: string) => { setDeleteTaskTarget({ patientId, taskId }); };
  const handleConfirmDeleteTask = () => { if (!deleteTaskTarget) return; const { patientId, taskId } = deleteTaskTarget; const targetP = patients.find(p => p.id === patientId); if (targetP) { const updated = { ...targetP, tasks: targetP.tasks.filter(t => t.id !== taskId) }; persistPatient(updated); } setDeleteTaskTarget(null); };
  const handleAddPatient = async (newPatient: Patient) => { const p = { ...newPatient, status: 'Admitted' as const }; setPatients(prev => [p, ...prev]); try { await secureDB.savePatient(p); } catch (e) { console.error(e); } };
  const handleUpdatePatient = (updatedPatient: Patient) => { persistPatient(updatedPatient); };
  const getAIContext = () => { if (!selectedPatient) return undefined; let codeStatusStr: string = selectedPatient.advancedCarePlan.category; if (selectedPatient.advancedCarePlan.category === 'Advanced Care Plan') { const limits = []; if (selectedPatient.advancedCarePlan.limitations.noCPR) limits.push('No CPR'); if (selectedPatient.advancedCarePlan.limitations.noETT) limits.push('No ETT'); codeStatusStr = `Advanced Care Plan: ${limits.join(', ')}. ${selectedPatient.advancedCarePlan.otherDetails}`; } const context = `Patient Name: ${selectedPatient.name}\nAge/Gender: ${selectedPatient.age}${selectedPatient.gender}\nOne-Liner: ${selectedPatient.oneLiner}\nCode Status: ${codeStatusStr}\nActive Tasks: ${selectedPatient.tasks.filter(t => !t.isCompleted).map(t => t.description).join(', ')}`; return anonymizePatientContext(context); };
  const allTasks = useMemo(() => { let tasks: any[] = []; patients.forEach(p => { if (p.status === 'Discharged') return; p.tasks.forEach(t => { tasks.push({ ...t, patientName: p.name, patientId: p.id, room: p.roomNumber }); }); }); return tasks.sort((a,b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1)); }, [patients]);
  const groupedDashboardTasks = useMemo(() => { const grouped: { patient: Patient, tasks: any[] }[] = []; const relevantPatientIds = Array.from(new Set(allTasks.map(t => t.patientId))); relevantPatientIds.forEach(pid => { const patient = patients.find(p => p.id === pid); if (patient) { const pTasks = allTasks.filter(t => t.patientId === pid); if (pTasks.length > 0) grouped.push({ patient, tasks: pTasks }); } }); return grouped.sort((a, b) => a.patient.roomNumber.localeCompare(b.patient.roomNumber, undefined, { numeric: true })); }, [allTasks, patients]);
  const taskStats = useMemo(() => { let pending = 0; let completed = 0; patients.forEach(p => { if (p.status === 'Discharged') return; pending += p.tasks.filter(t => !t.isCompleted).length; completed += p.tasks.filter(t => t.isCompleted).length; }); return { pending, completed, total: pending + completed }; }, [patients]);
  const rightPanelContent = activeTab === 'list' && viewMode === 'DASHBOARD' ? ( <DashboardRightPanel patients={filteredPatients} users={users} onPatientClick={handlePatientClick} onMovePatient={handleMovePatient} onUpdateTeam={handleUpdateTeam} onUnassignPatient={handleUnassignPatient} onEditPatient={handleEditPatientModal} /> ) : null;

  // Helper to render main content based on state to ensure exclusivity
  const renderContent = () => {
      // Priority 0: Night Shift Dashboard
      if (isNightLogin) {
          return (
              <NightShiftDashboard 
                  patients={patients}
                  onToggleTask={handleToggleTask}
                  onUpdatePatient={handleUpdatePatient}
                  onLogout={handleLogout}
                  isDarkMode={isDarkMode}
                  toggleTheme={() => setIsDarkMode(!isDarkMode)}
              />
          );
      }

      // Priority 1: Detail View
      if (viewMode === 'PATIENT_DETAIL' && selectedPatient) {
          return (
              <motion.div key="detail" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }} className="h-full">
                  <PatientDetail 
                      patient={selectedPatient} 
                      onBack={handleBack} 
                      onUpdatePatient={handleUpdatePatient} 
                      isPresentationMode={isPresentationMode}
                      initialTab={patientDetailTab}
                      onPrevPatient={handlePrevPatient}
                      onNextPatient={handleNextPatient}
                  />
              </motion.div>
          );
      }

      // Priority 2: Dashboard Views based on Active Tab
      switch (activeTab) {
          case 'list':
              // ... Dashboard View Content (Kept exact same) ...
              return (
                  <div className="flex flex-col h-full space-y-8 pb-4 overflow-y-auto">
                      {/* Dashboard Header */}
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-1 shrink-0">
                          <h1 className="text-3xl font-bold text-main tracking-tight">Dashboard</h1>
                          <p className="text-muted">Welcome back, {userProfile.name}. Here is what's happening today.</p>
                      </motion.div>
                      
                      {/* Stats Cards */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, staggerChildren: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
                          <StatCard label="Total Patients" value={patients.length.toString()} icon={<Users size={20} />} trend="+2" color="bg-blue-500" />
                          <StatCard label="Critical / Watch" value={patients.filter(p => p.acuity !== 'Stable').length.toString()} icon={<Activity size={20} />} trend="Stable" color="bg-red-500" alert />
                          <StatCard label="My Tasks" value={taskStats.pending.toString()} icon={<ListTodo size={20} />} trend={`${taskStats.completed} Done`} color="bg-green-500" />
                          <StatCard label="Active Issues" value={patients.reduce((acc, p) => acc + (p.admissionNote?.problemList?.filter(pr => pr.status === 'Active').length || 0), 0).toString()} icon={<AlertTriangle size={20} />} trend="Ongoing" color="bg-orange-500" />
                      </motion.div>

                      {/* Charts Area */}
                      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                          {/* Task List Widget */}
                          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.12 }} className="lg:col-span-1 flex flex-col gap-4">
                              <div className="bg-glass-panel border border-glass-border rounded-3xl p-6 shadow-sm h-full flex flex-col relative overflow-hidden">
                                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                  <div className="flex flex-col gap-3 mb-4 z-10">
                                      <div className="flex justify-between items-center">
                                          <h3 className="font-bold text-lg text-main flex items-center gap-2"><CalendarCheck size={20} className="text-green-500" /> Daily Worklist</h3>
                                          <div className="flex items-center gap-2">
                                              <div className="flex gap-1 bg-glass-depth rounded-lg p-0.5 border border-glass-border">
                                              <button onClick={() => setDashboardTaskView('flat')} className={`p-1.5 rounded transition-all ${dashboardTaskView === 'flat' ? 'bg-white shadow-sm text-main dark:bg-slate-700' : 'text-muted hover:text-main'}`}><List size={14} /></button>
                                              <button onClick={() => setDashboardTaskView('grouped')} className={`p-1.5 rounded transition-all ${dashboardTaskView === 'grouped' ? 'bg-white shadow-sm text-main dark:bg-slate-700' : 'text-muted hover:text-main'}`}><Layers size={14} /></button>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="flex gap-1 bg-glass-depth rounded-lg p-0.5 border border-glass-border self-start font-heading tracking-tight">
                                          <button onClick={() => setDashboardTaskFilter('all')} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${dashboardTaskFilter === 'all' ? 'bg-white shadow-sm text-main dark:bg-slate-700' : 'text-muted hover:text-main'}`}>All</button>
                                          <button onClick={() => setDashboardTaskFilter('urgent')} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${dashboardTaskFilter === 'urgent' ? 'bg-red-500 text-white shadow-sm' : 'text-muted hover:text-main'}`}>Urgent</button>
                                          <button onClick={() => setDashboardTaskFilter('pending')} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${dashboardTaskFilter === 'pending' ? 'bg-green-500 text-white shadow-sm' : 'text-muted hover:text-main'}`}>To Do</button>
                                      </div>
                                      {/* Category filtering removed by request */}
                                  </div>
                                  <div className="mb-4 space-y-1 z-10">
                                      <div className="flex justify-between text-[10px] font-bold text-muted uppercase"><span>Progress</span><span><AnimatedCounter value={Math.round((taskStats.completed / (taskStats.total || 1)) * 100)} />%</span></div>
                                      <div className="h-2 w-full bg-glass-depth rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${(taskStats.completed / (taskStats.total || 1)) * 100}%` }} transition={{ duration: 1, type: "spring", stiffness: 50, damping: 20 }} /></div>
                                  </div>
                                  <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar flex-1 z-10 pr-1">
                                      {(() => {
                                          const tasksFlat = patients
                                              .filter(p => p.status !== 'Discharged')
                                              .flatMap(p => (p.tasks || []).map(t => ({
                                                  ...t,
                                                  _patientId: p.id,
                                                  _patientName: p.name,
                                                  _acuity: p.acuity
                                              })));

                                          const matchesSearch = (t: any) => {
                                              const q = (searchQuery || '').trim().toLowerCase();
                                              if (!q) return true;
                                              const hay = `${t.title || ''} ${t.details || ''} ${t._patientName || ''}`.toLowerCase();
                                              return hay.includes(q);
                                          };

                                          // Categorization disabled

                                          const matchesFilter = (t: any) => {
                                              switch (dashboardTaskFilter) {
                                                  case 'urgent':
                                                      return t.priority === 'High' || t.priority === 'Critical' || t.priority === 'URGENT' || t.priority === 'Before Noon' || t.priority === 'Before Discharge';
                                                  case 'pending':
                                                      return !t.isCompleted;
                                                  default:
                                                      return true;
                                              }
                                          };

                                          const matchesCategory = (_t: any) => true;

                                          // Build visible list and sort: urgent first, then due date, then incomplete before complete
                                          const visibleTasks = tasksFlat
                                              .filter(t => matchesSearch(t) && matchesFilter(t))
                                              .sort((a: any, b: any) => {
                                              const pri = (p: any) => (p.priority === 'Critical' ? 2 : p.priority === 'High' ? 1 : 0);
                                              const ap = pri(a), bp = pri(b);
                                              if (ap !== bp) return bp - ap;
                                              const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                                              const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                                              if (ad !== bd) return ad - bd;
                                              if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
                                              return (a.description || '').localeCompare(b.description || '');
                                          });

                                          if (!visibleTasks.length) {
                                              return (
                                                  <div className="text-center text-muted text-sm py-12 flex flex-col items-center gap-2">
                                                      <div className="p-3 bg-glass-depth rounded-full"><CheckCircle2 size={24} className="opacity-50"/></div>
                                                      <span className="italic">No tasks found{(searchQuery || '').trim() ? ` for "${searchQuery}"` : ''}</span>
                                                  </div>
                                              );
                                          }

                                          if (dashboardTaskView === 'grouped') {
                                              const byPatient: Record<string, any[]> = {};
                                              visibleTasks.forEach(t => {
                                                  byPatient[t._patientId] = byPatient[t._patientId] || [];
                                                  byPatient[t._patientId].push(t);
                                              });
                                              return (
                                                  <div className="space-y-3">
                                                      {Object.entries(byPatient).map(([pid, list]) => (
                                                          <div key={pid} className="bg-glass-depth border border-glass-border rounded-xl p-3">
                                                              <div className="flex items-center justify-between mb-2">
                                                                  <div className="flex items-center gap-2 text-sm font-semibold text-main">
                                                                      <UserPlus size={14} className="text-blue-500" />
                                                                      <span>{list[0]?._patientName}</span>
                                                                  </div>
                                                                  <span className="text-[10px] font-bold text-muted">{list.length} task(s)</span>
                                                              </div>
                                                              <div className="space-y-2">
                                                                  {list.map(t => (
                                                                      <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="group bg-white/70 dark:bg-slate-700/40 border border-glass-border rounded-xl px-3 py-2 hover:bg-white/90 dark:hover:bg-slate-700/60">
                                                                          <div className="flex items-start gap-3">
                                                                              <motion.button aria-label={t.isCompleted ? 'Unmark' : 'Mark complete'} onClick={() => handleToggleTask(t._patientId, t.id)} whileTap={{ scale: 0.93 }} animate={t.isCompleted ? { scale: [1, 1.08, 1], rotate: [0, 6, 0] } : { scale: 1 }} transition={{ duration: 0.18 }} className={`mt-0.5 w-5 h-5 rounded-md border relative flex items-center justify-center ${t.isCompleted ? 'bg-green-500/90 border-green-600' : 'bg-glass-depth border-glass-border'} transition-colors`}>{t.isCompleted ? <CheckCircle2 size={14} className="text-white"/> : null}{t.isCompleted ? <motion.span className="absolute inset-0 rounded-md" initial={{ opacity: 0 }} animate={{ opacity: [0.25, 0], scale: [1, 1.6] }} transition={{ duration: 0.28 }} style={{ background: 'rgba(16,185,129,0.35)' }} /> : null}</motion.button>
                                                                              <div className="flex-1 min-w-0">
                                                                                  <div className="flex items-center justify-between gap-2 mb-1">
                                                                                      <div className="flex items-center gap-2">
                                                                                          <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">{(t._patientName || '?').slice(0,1)}</div>
                                                                                          <span className={`text-sm font-semibold text-main truncate max-w-[160px] sm:max-w-[220px] ${thaiClass(t._patientName)}`}>{t._patientName}</span>
                                                                                      </div>
                                                                                      <div className="flex items-center gap-2 shrink-0">
                                                                                          {t.dueDate ? <span className="text-[10px] text-muted">Due {new Date(t.dueDate).toLocaleDateString()}</span> : null}
                                                                                          {(t.priority === 'High' || t.priority === 'Critical') && <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Urgent</span>}
                                                                                      </div>
                                                                                  </div>
                                                                                  <motion.div layout className={`text-sm whitespace-normal break-words ${thaiClass(t.description)}`} animate={t.isCompleted ? { color: 'var(--text-muted)' } : { color: 'var(--text-main)' }} transition={{ duration: 0.18 }}>
                                                                                      <span className={t.isCompleted ? 'line-through' : ''}>{t.description}</span>
                                                                                  </motion.div>
                                                                              </div>
                                                                              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                                  <button className="px-2 py-1 text-[10px] rounded bg-glass-depth border border-glass-border text-main hover:bg-white/70" onClick={() => handleEditTask(t._patientId, t)}>Edit</button>
                                                                              </div>
                                                                          </div>
                                                                      </motion.div>
                                                                  ))}
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              );
                                          }

                                          // flat view
                                          return (
                                              <div className="space-y-2">
                                                  {visibleTasks.map(t => (
                                                      <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="group bg-white/70 dark:bg-slate-700/40 border border-glass-border rounded-xl px-3 py-2 hover:bg-white/90 dark:hover:bg-slate-700/60">
                                                          <div className="flex items-start gap-3">
                                                              <motion.button aria-label={t.isCompleted ? 'Unmark' : 'Mark complete'} onClick={() => handleToggleTask(t._patientId, t.id)} whileTap={{ scale: 0.93 }} animate={t.isCompleted ? { scale: [1, 1.08, 1], rotate: [0, -5, 0] } : { scale: 1 }} transition={{ duration: 0.18 }} className={`mt-0.5 w-5 h-5 rounded-md border relative flex items-center justify-center ${t.isCompleted ? 'bg-green-500/90 border-green-600' : 'bg-glass-depth border-glass-border'} transition-colors`}>{t.isCompleted ? <CheckCircle2 size={14} className="text-white"/> : null}{t.isCompleted ? <motion.span className="absolute inset-0 rounded-md" initial={{ opacity: 0 }} animate={{ opacity: [0.25, 0], scale: [1, 1.6] }} transition={{ duration: 0.28 }} style={{ background: 'rgba(16,185,129,0.35)' }} /> : null}</motion.button>
                                                              <div className="flex-1 min-w-0">
                                                                  <div className="flex items-center justify-between gap-2 mb-1">
                                                                      <div className="flex items-center gap-2">
                                                                          <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">{(t._patientName || '?').slice(0,1)}</div>
                                                                          <span className={`text-sm font-semibold text-main truncate max-w-[180px] sm:max-w-[240px] ${thaiClass(t._patientName)}`}>{t._patientName}</span>
                                                                      </div>
                                                                      <div className="flex items-center gap-2 shrink-0">
                                                                          {t.dueDate ? <span className="text-[10px] text-muted">Due {new Date(t.dueDate).toLocaleDateString()}</span> : null}
                                                                          {(t.priority === 'High' || t.priority === 'Critical') && <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Urgent</span>}
                                                                      </div>
                                                                  </div>
                                                                  <motion.div layout className={`text-sm whitespace-normal break-words ${thaiClass(t.description)}`} animate={t.isCompleted ? { color: 'var(--text-muted)' } : { color: 'var(--text-main)' }} transition={{ duration: 0.18 }}>
                                                                      <span className={t.isCompleted ? 'line-through' : ''}>{t.description}</span>
                                                                  </motion.div>
                                                              </div>
                                                              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                  <button className="px-2 py-1 text-[10px] rounded bg-glass-depth border border-glass-border text-main hover:bg-white/70" onClick={() => handleEditTask(t._patientId, t)}>
                                                                      Edit
                                                                  </button>
                                                              </div>
                                                          </div>
                                                      </motion.div>
                                                  ))}
                                              </div>
                                          );
                                      })()}
                                  </div>
                              </div>
                          </motion.div>
                          
                          {/* Charts Widget */}
                          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.18 }} className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-6 rounded-3xl bg-glass-panel border border-glass-border backdrop-blur-md relative overflow-hidden group shadow-sm flex flex-col min-h-[250px] xl:min-h-[320px]">
                                  <div className="flex justify-between items-start mb-6"><div><h3 className="font-bold text-lg text-main flex items-center gap-2"><LayoutGrid size={18} className="text-blue-500"/> Census Trend</h3><p className="text-xs text-muted">Acuity vs Volume (7-Day)</p></div><div className="flex gap-2"><span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div> Total</span><span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20"><div className="w-2 h-2 rounded-full bg-red-500 shadow-sm animate-pulse"></div> Critical</span></div></div>
                                  <div className="flex-1 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient><linearGradient id="colorUnstable" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} opacity={0.2} /><XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} dy={10} /><YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} /><Tooltip contentStyle={{ backgroundColor: 'var(--bg-glass-panel)', borderColor: 'var(--border-glass)', borderRadius: '12px', color: 'var(--text-main)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 600, paddingBottom: '4px' }} cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '3 3' }} /><Area type="monotone" dataKey="total" name="Total Census" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} animationDuration={1500} /><Area type="monotone" dataKey="unstable" name="Critical Acuity" stroke="#ef4444" strokeWidth={3} fill="url(#colorUnstable)" activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} animationDuration={1500} /></AreaChart></ResponsiveContainer></div>
                              </div>
                              <div className="p-6 rounded-3xl bg-glass-panel border border-glass-border backdrop-blur-md relative overflow-hidden group shadow-sm flex flex-col min-h-[250px] xl:min-h-[320px]">
                                  <div className="flex justify-between items-start mb-6"><h3 className="font-bold text-lg text-main flex items-center gap-2"><CheckSquare size={18} className="text-green-500"/> Workload</h3></div>
                                  <div className="flex-1 w-full flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: 'Pending', value: taskStats.pending, color: '#ef4444' }, { name: 'Completed', value: taskStats.completed, color: '#10b981' }]} layout="vertical" barCategoryGap="20%"><XAxis type="number" hide /><YAxis dataKey="name" type="category" stroke="var(--text-main)" fontSize={12} tickLine={false} axisLine={false} width={80} tick={{fill: 'var(--text-muted)', fontWeight: 500}}/><Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'var(--bg-glass-panel)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'var(--text-main)', backdropFilter: 'blur(10px)' }} /><Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32} animationDuration={1200}>{[0,1].map((entry, index) => (<Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#10b981'} fillOpacity={0.8} />))}</Bar></BarChart></ResponsiveContainer></div>
                                  <div className="mt-4 text-center text-xs text-muted font-medium bg-glass-depth py-2 rounded-xl border border-glass-border"><span className="text-red-500 font-bold">{taskStats.pending}</span> Pending / <span className="text-green-500 font-bold">{taskStats.completed}</span> Completed Today</div>
                              </div>
                              <div className="p-6 rounded-3xl bg-glass-panel border border-glass-border backdrop-blur-md relative overflow-hidden group shadow-sm flex flex-col min-h-[250px] xl:min-h-[320px] md:col-span-2">
                                  <div className="flex justify-between items-start mb-6">
                                      <div>
                                          <h3 className="font-bold text-lg text-main flex items-center gap-2">
                                              <Activity size={18} className="text-purple-500"/> Acuity Trajectory
                                          </h3>
                                          <p className="text-xs text-muted">Weekly Stability Tracking</p>
                                      </div>
                                      <div className="flex gap-2">
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted bg-glass-depth px-2 py-1 rounded-full border border-glass-border">
                                              <div className="w-2 h-2 rounded-full bg-green-500"></div> Stable
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted bg-glass-depth px-2 py-1 rounded-full border border-glass-border">
                                              <div className="w-2 h-2 rounded-full bg-amber-500"></div> Watch
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted bg-glass-depth px-2 py-1 rounded-full border border-glass-border">
                                              <div className="w-2 h-2 rounded-full bg-red-500"></div> Unstable
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex-1 w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                          <LineChart data={acuityTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} opacity={0.2} />
                                              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} dy={10} />
                                              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tick={{fill: 'var(--text-muted)'}} />
                                              <Tooltip 
                                                  contentStyle={{ backgroundColor: 'var(--bg-glass-panel)', borderColor: 'var(--border-glass)', borderRadius: '12px', color: 'var(--text-main)', backdropFilter: 'blur(12px)' }}
                                                  itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                                  cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                              />
                                              <Line type="monotone" dataKey="stable" stroke="#10b981" strokeWidth={3} dot={{r:4, fill:'#10b981', strokeWidth:0}} activeDot={{r:6}} />
                                              <Line type="monotone" dataKey="watch" stroke="#f59e0b" strokeWidth={3} dot={{r:4, fill:'#f59e0b', strokeWidth:0}} activeDot={{r:6}} />
                                              <Line type="monotone" dataKey="unstable" stroke="#ef4444" strokeWidth={3} dot={{r:4, fill:'#ef4444', strokeWidth:0}} activeDot={{r:6}} />
                                          </LineChart>
                                      </ResponsiveContainer>
                                  </div>
                              </div>
                          </motion.div>
                      </motion.div>

                      {/* Patient List */}
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} className="mt-8 flex flex-col flex-1 min-h-0">
                          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4 shrink-0">
                              <div><h3 className="text-2xl font-bold text-main flex items-center gap-2"><Users size={24} className="text-indigo-500"/> Active Patients<span className="text-sm font-medium text-muted bg-glass-depth px-2 py-1 rounded-full border border-glass-border">{filteredPatients.length}</span></h3><p className="text-sm text-muted mt-1">Sorted by Room Number</p></div>
                              <div className="flex items-center gap-3">
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowHandoffExportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-600 dark:text-violet-300 rounded-xl hover:bg-violet-500/20 transition-all text-sm font-bold border border-violet-500/20"><FileOutput size={16} /> Handoff Generator</motion.button>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddPatientModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all text-sm font-bold"><UserPlus size={16} /> Admit Patient</motion.button>
                              </div>
                          </div>
                          
                          <div className="flex-1 min-h-[500px]">
                              <PatientList 
                                  patients={filteredPatients}
                                  onPatientClick={handlePatientClick}
                                  onAddTask={handleQuickAddTask}
                                  onToggleTask={handleToggleTask}
                                  onDeleteTask={handleRequestDeleteTask}
                                  onEditTask={(pid, tid) => {
                                      const p = patients.find(pat => pat.id === pid);
                                      if (p) {
                                          const t = p.tasks.find(tsk => tsk.id === tid);
                                          if (t) handleEditTask(pid, t);
                                      }
                                  }}
                                  onScan={handleQuickScan}
                                  isPresentationMode={isPresentationMode}
                              />
                              {filteredPatients.length === 0 && (
                                  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-glass-border rounded-3xl bg-glass-panel/50 h-full">
                                      <div className="p-4 bg-glass-depth rounded-full mb-4"><Users size={32} className="opacity-30" /></div>
                                      <h3 className="text-lg font-bold text-main">No patients found</h3>
                                      <p className="text-muted max-w-md">Try adjusting your search or admit a new patient to get started.</p>
                                  </div>
                              )}
                          </div>
                      </motion.div>
                  </div>
              );
          case 'directory':
              return (
                  <DirectoryView 
                      items={directoryItems} 
                      onAdd={() => {
                          setDirectoryItemToEdit(null);
                          setShowDirectoryModal(true);
                      }} 
                      onEdit={(item) => {
                          setDirectoryItemToEdit(item);
                          setShowDirectoryModal(true);
                      }}
                      onDelete={handleRequestDeleteDirectory} 
                  />
              );
          case 'settings':
              return (
                  <SettingsView 
                      isDarkMode={isDarkMode} 
                      toggleTheme={() => setIsDarkMode(!isDarkMode)} 
                      isPresentationMode={isPresentationMode} 
                      togglePresentationMode={() => setIsPresentationMode(!isPresentationMode)} 
                      onLogout={handleLogout} 
                      onReset={handleResetApp} 
                      onExport={handleExportData} 
                      onRestore={handleRestoreData} 
                      onChangePin={handleChangePin} 
                      userProfile={userProfile} 
                      onUpdateProfile={handleUpdateProfile}
                      onConfigureNightMode={handleConfigureNightMode}
                  />
              );
          case 'admin':
              return userProfile.role === 'Admin' ? (
                  <AdminPanel 
                      users={users} 
                      onAddUser={handleAddUser} 
                      onUpdateUser={handleUpdateUser} 
                      onDeleteUser={handleDeleteUser} 
                  />
              ) : null;
          default:
              return null;
      }
  };

  if (!isAuthenticated) {
      return (
          <div className={`min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'dark bg-[#0f172a]' : 'bg-slate-50'}`}>
               {/* Login Screen Implementation */}
               <div className="absolute inset-0 transition-opacity duration-1000" style={{ background: isNightLogin ? 'radial-gradient(circle at center, #1e1b4b, #000000)' : 'var(--bg-main-grad)' }}></div>
               <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 5, 0] }} transition={{ duration: 10, repeat: Infinity }} className={`absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full blur-[80px] md:blur-[120px] ${isNightLogin ? 'bg-indigo-900/20' : 'bg-blue-500/10'}`} />
               <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 0] }} transition={{ duration: 12, repeat: Infinity }} className={`absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] md:w-[50vw] md:h-[50vw] rounded-full blur-[80px] md:blur-[120px] ${isNightLogin ? 'bg-violet-900/20' : 'bg-cyan-600/10'}`} />
               
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="z-10 flex flex-col gap-5 p-6 md:p-8 rounded-3xl bg-glass-panel border border-glass-border backdrop-blur-xl shadow-2xl max-w-sm md:max-w-md w-full mx-4 my-auto relative">
                   {isNightLogin && (
                       <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-bounce">
                           Restricted Access
                       </div>
                   )}
                   
                   <div className="flex flex-col items-center text-center mb-2">
                        <div className={`p-3 md:p-4 rounded-2xl shadow-lg mb-4 ${isNightLogin ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-gradient-to-br from-blue-500 to-cyan-600 shadow-blue-500/20'}`}>
                                {isNightLogin ? <Moon size={28} className="text-white"/> : <Activity size={28} className="text-white md:w-8 md:h-8" />}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-main">
                            {isNightLogin ? 'Night Shift Portal' : 'ResiFlow AI'}
                        </h1>
                        <p className="text-muted text-xs md:text-sm mt-1 font-medium">
                            {isNightLogin ? 'Secure Handover Environment' : 'Intelligent Clinical Workflow'}
                        </p>
                   </div>

                   {!isNightLogin && (
                       <div className="flex p-1 bg-glass-depth rounded-xl border border-glass-border">
                           <button onClick={() => { setAuthMode('signin'); setLoginError(''); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${authMode === 'signin' ? 'bg-white text-black shadow-sm' : 'text-muted hover:text-main'}`}>Sign In</button>
                           <button onClick={() => { setAuthMode('signup'); setLoginError(''); }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white text-black shadow-sm' : 'text-muted hover:text-main'}`}>Create Account</button>
                       </div>
                   )}

                   <form onSubmit={handleLogin} className="w-full space-y-4">
                       {!isNightLogin && (
                           <div className="space-y-1.5"><label className="text-[10px] font-bold text-muted uppercase ml-1 tracking-wider">Email</label><div className="relative"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@hospital.com" className="w-full bg-glass-depth border border-glass-border rounded-xl pl-10 pr-4 py-3 text-base md:text-sm text-main focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-muted/50 transition-all" /><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /></div></div>
                       )}
                       
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-muted uppercase ml-1 tracking-wider">
                               {isNightLogin ? 'Night Access Passcode' : (authMode === 'signup' ? 'Set Password (PIN)' : 'Password (PIN)')}
                           </label>
                           <div className="relative">
                               <input 
                                    type="password" 
                                    value={pin} 
                                    onChange={(e) => setPin(e.target.value)} 
                                    placeholder={isNightLogin ? "Enter Passcode" : "••••"} 
                                    inputMode="numeric" 
                                    pattern="[0-9]*" 
                                    className={`w-full bg-glass-depth border border-glass-border rounded-xl pl-10 pr-4 py-3 text-lg tracking-widest text-main focus:outline-none focus:ring-2 transition-all ${isNightLogin ? 'focus:ring-indigo-500/50' : 'focus:ring-blue-500/30'}`} 
                                />
                               <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                           </div>
                       </div>

                       {authMode === 'signup' && !isNightLogin && (<div className="space-y-1.5"><label className="text-[10px] font-bold text-muted uppercase ml-1 tracking-wider">Confirm Password</label><div className="relative"><input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="••••" inputMode="numeric" pattern="[0-9]*" className="w-full bg-glass-depth border border-glass-border rounded-xl pl-10 pr-4 py-3 text-lg tracking-widest text-main focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono transition-all" /><CheckCircle2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /></div></div>)}
                       
                       {loginError && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-red-500 text-center font-bold bg-red-500/10 py-2.5 rounded-xl border border-red-500/20">{loginError}</motion.div>)}
                       
                       <motion.button 
                            type="submit" 
                            disabled={isAuthenticating || !pin} 
                            whileHover={{ scale: 1.02 }} 
                            whileTap={{ scale: 0.98 }} 
                            className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 group mt-2 ${isNightLogin ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-500/30 hover:shadow-blue-500/50'}`}
                        >
                            {isAuthenticating ? (<span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> Verifying...</span>) : (<>{authMode === 'signin' || isNightLogin ? 'Access Workspace' : 'Create Account'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>)}
                        </motion.button>
                        
                        {!isNightLogin && authMode === 'signin' && loginError && (<div className="mt-4 pt-4 border-t border-glass-border"><p className="text-[10px] text-muted text-center mb-3">Forgot PIN or Data Corrupted?</p><button type="button" onClick={handleResetApp} className="w-full py-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 font-bold flex items-center justify-center gap-2 rounded-xl transition-colors border border-transparent hover:border-red-500/20"><RotateCcw size={14} /> Reset & Clear App Data</button></div>)}
                   </form>
                   
                   {!isNightLogin && (
                       <div className="flex flex-col items-center gap-3 mt-2"><div className="flex items-center justify-center gap-2 text-[9px] text-muted uppercase tracking-widest opacity-70"><Database size={10} /> Local Encrypted Storage (AES-GCM)</div><button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-glass-depth border border-glass-border text-muted hover:text-main transition-colors">{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}</button></div>
                   )}
               </motion.div>
          </div>
      );
  }

  // --- Main Dashboard View ---
  return (
    <div className={isDarkMode ? 'dark' : ''}>
        <AddTaskModal isOpen={showAddTaskModal} onClose={() => { setShowAddTaskModal(false); setEditingTaskData(null); setTaskTargetPatientId(null); }} onAdd={handleSaveTask} taskToEdit={editingTaskData ? editingTaskData.task : null} />
        <AddPatientModal isOpen={showAddPatientModal} onClose={() => setShowAddPatientModal(false)} onAdd={handleAddPatient} />
        <ClinicalScanModal isOpen={showScanModal} onClose={() => setShowScanModal(false)} onScanComplete={handleScanComplete} />
        <HandoffExportModal isOpen={showHandoffExportModal} onClose={() => setShowHandoffExportModal(false)} patients={patients} />
        <MedicationScanModal isOpen={showMedScanModal} onClose={() => setShowMedScanModal(false)} onScanComplete={handleMedicationScan} />
        <DrugInteractionModal isOpen={showInteractionModal} onClose={() => setShowInteractionModal(false)} activeMedications={selectedPatient ? selectedPatient.medications.filter(m => m.isActive) : []} />
        
        <DirectoryEditModal
            isOpen={showDirectoryModal}
            onClose={() => { setShowDirectoryModal(false); setDirectoryItemToEdit(null); }}
            onSave={handleSaveDirectoryItem}
            itemToEdit={directoryItemToEdit}
        />

        {patientToEdit && (
            <EditPatientModal 
                isOpen={showEditPatientModal} 
                onClose={() => { setShowEditPatientModal(false); setPatientToEdit(null); }} 
                patient={patientToEdit} 
                onSave={handleUpdatePatient}
            />
        )}
        
        <ConfirmModal isOpen={!!deleteTaskTarget} onClose={() => setDeleteTaskTarget(null)} onConfirm={handleConfirmDeleteTask} title="Delete Task" message="Are you sure you want to delete this task?" />
        <ConfirmModal isOpen={!!directoryDeleteId} onClose={() => setDirectoryDeleteId(null)} onConfirm={handleConfirmDeleteDirectory} title="Delete Contact" message="Are you sure you want to delete this directory contact?" />
        <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={userProfile} onUpdateProfile={handleUpdateProfile} onLogout={handleLogout} />

        <Layout 
            activeTab={activeTab} 
            setActiveTab={handleTabChange} 
            isPresentationMode={isPresentationMode} 
            togglePresentationMode={() => setIsPresentationMode(!isPresentationMode)} 
            onLogout={handleLogout} 
            rightPanel={rightPanelContent} 
            isDarkMode={isDarkMode} 
            toggleTheme={() => setIsDarkMode(!isDarkMode)} 
            aiContext={getAIContext()} 
            notifications={notifications} 
            onNotificationClick={handleNotificationClick} 
            userAvatar={userProfile.avatar} 
            onSearch={setSearchQuery} 
            searchQuery={searchQuery} 
            onProfileClick={() => setShowProfileModal(true)} 
            isAdmin={userProfile.role === 'Admin'} 
            onMarkAllRead={handleMarkAllRead} 
            contentKey={viewMode === 'PATIENT_DETAIL' ? 'patient-detail-view' : activeTab} 
            allPatients={patients} 
            currentPatient={selectedPatient}
            hideSidebar={viewMode === 'PATIENT_DETAIL' || isNightLogin}
            onBackToHome={handleBack}
        >
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
        </Layout>
    </div>
  );
};

export default App;
