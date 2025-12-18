
import React, { useState, useEffect } from 'react';
import { TimelineEvent, EventType, EventStatus } from '../types';
import { X, Calendar, Clock, Image, Syringe, TestTube, FileText, CheckCircle2, Hourglass, CalendarClock, CheckSquare, BriefcaseMedical } from 'lucide-react';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: TimelineEvent | TimelineEvent[]) => void;
  eventToEdit?: TimelineEvent | null;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onAdd, eventToEdit }) => {
  const [title, setTitle] = useState('');
  const [dateVal, setDateVal] = useState(new Date().toISOString().split('T')[0]);
  const [timeVal, setTimeVal] = useState('08:00');
  const [type, setType] = useState<EventType>('Meeting'); // Default to Meeting (Appointment)
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<EventStatus>('Scheduled');

  useEffect(() => {
    if (isOpen) {
        if (eventToEdit) {
            setTitle(eventToEdit.title);
            try {
                const d = new Date(eventToEdit.date);
                setDateVal(d.toISOString().split('T')[0]);
                setTimeVal(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
            } catch (e) {
                setDateVal(new Date().toISOString().split('T')[0]);
            }
            setType(eventToEdit.type);
            setNotes(eventToEdit.notes || '');
            setStatus(eventToEdit.status || 'Scheduled');
        } else {
            resetForm();
        }
    }
  }, [isOpen, eventToEdit]);

  const resetForm = () => {
      setTitle('');
      setDateVal(new Date().toISOString().split('T')[0]);
      setTimeVal('08:00');
      setType('Meeting'); // Default
      setNotes('');
      setStatus('Scheduled');
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateVal) return;

    const fullDate = `${dateVal}T${timeVal || '00:00'}:00`;

    onAdd({
        id: eventToEdit ? eventToEdit.id : Date.now().toString(),
        title,
        date: fullDate,
        type,
        notes,
        status
    });
    
    if (!eventToEdit) resetForm();
    onClose();
  };

  const setDateTo = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      setDateVal(d.toISOString().split('T')[0]);
  };

  const getIconForType = (t: EventType) => {
      switch(t) {
          case 'Imaging': return <Image size={18} />;
          case 'Procedure': return <Syringe size={18} />;
          case 'Lab': return <TestTube size={18} />;
          case 'Meeting': return <BriefcaseMedical size={18} />;
          default: return <FileText size={18} />;
      }
  };

  const getTypeLabel = (t: EventType) => {
      if (t === 'Meeting') return 'Appointment';
      return t;
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-md shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-teal-500/5 to-cyan-500/5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/10 rounded-lg text-teal-500">
                    <Calendar size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-main">{eventToEdit ? 'Edit Event' : 'Add Appointment'}</h2>
                    <p className="text-xs text-muted">{eventToEdit ? 'Update details' : 'Schedule new appointment or event'}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
            
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Title / Location</label>
                <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Follow-up Cardio, Eye Clinic"
                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main outline-none focus:ring-2 focus:ring-teal-500/30 font-medium"
                    autoFocus={!eventToEdit}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Date</label>
                    <input 
                        type="date"
                        value={dateVal}
                        onChange={(e) => setDateVal(e.target.value)}
                        className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Time</label>
                    <div className="relative">
                        <Clock size={16} className="absolute left-3 top-3 text-muted pointer-events-none"/>
                        <input 
                            type="time"
                            value={timeVal}
                            onChange={(e) => setTimeVal(e.target.value)}
                            className="w-full bg-glass-depth border border-glass-border rounded-xl pl-10 pr-3 py-2.5 text-main outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Date Buttons */}
            {!eventToEdit && (
                <div className="flex gap-2">
                    <button type="button" onClick={() => setDateTo(0)} className="flex-1 py-1.5 text-xs bg-glass-depth border border-glass-border rounded-lg hover:bg-glass-panel font-medium">Today</button>
                    <button type="button" onClick={() => setDateTo(1)} className="flex-1 py-1.5 text-xs bg-glass-depth border border-glass-border rounded-lg hover:bg-glass-panel font-medium">Tomorrow</button>
                    <button type="button" onClick={() => setDateTo(7)} className="flex-1 py-1.5 text-xs bg-glass-depth border border-glass-border rounded-lg hover:bg-glass-panel font-medium">+1 Week</button>
                    <button type="button" onClick={() => setDateTo(30)} className="flex-1 py-1.5 text-xs bg-glass-depth border border-glass-border rounded-lg hover:bg-glass-panel font-medium">+1 Month</button>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Event Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['Meeting', 'Lab', 'Imaging', 'Procedure', 'Other'] as EventType[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`
                                flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all
                                ${type === t ? 'bg-teal-500 text-white border-teal-500' : 'bg-glass-depth border-glass-border text-muted hover:text-main'}
                            `}
                        >
                            {getIconForType(t)}
                            {getTypeLabel(t)}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Status</label>
                <div className="flex bg-glass-depth rounded-xl p-1 border border-glass-border">
                    {[
                        { id: 'Scheduled', label: 'Scheduled', icon: <CalendarClock size={14}/>, color: 'text-blue-500' },
                        { id: 'Pending Result', label: 'Pending', icon: <Hourglass size={14}/>, color: 'text-amber-500' },
                        { id: 'Completed', label: 'Done', icon: <CheckCircle2 size={14}/>, color: 'text-green-500' }
                    ].map(s => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setStatus(s.id as any)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${status === s.id ? `bg-white dark:bg-slate-700 shadow-sm ${s.color}` : 'text-muted hover:text-main'}`}
                        >
                            {s.icon}
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-muted uppercase ml-1">Details (Optional)</label>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Specific location, doctor name, preparation instructions..."
                    className="w-full h-20 bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-main outline-none resize-none"
                />
            </div>
        </div>

        <div className="p-6 border-t border-glass-border bg-glass-panel/50 backdrop-blur-md shrink-0">
            <button 
                onClick={handleSubmit}
                disabled={!title}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <CheckSquare size={18} />
                {eventToEdit ? 'Save Changes' : 'Add Appointment'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddEventModal;
