
import React, { useState, useEffect } from 'react';
import { TaskPriority, Task, Subtask } from '../types';
import { X, Clock, Calendar, Zap, Flag, AlertCircle, CalendarDays, CheckCircle2, Pencil, ListChecks, Plus, Trash2 } from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: { description: string, priority: TaskPriority, dueDate?: string, subtasks?: Subtask[] }) => void;
  initialDescription?: string; // For quick add from text
  taskToEdit?: Task | null; // For editing existing task
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAdd, initialDescription = '', taskToEdit }) => {
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // Date & Time State
  const [dateVal, setDateVal] = useState('');
  const [timeVal, setTimeVal] = useState('');

  // Reset or Populate form when opened
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
          // Edit Mode
          setDescription(taskToEdit.description);
          setPriority(taskToEdit.priority);
          setSubtasks(taskToEdit.subtasks || []);
          setIsChecklistMode(!!taskToEdit.subtasks && taskToEdit.subtasks.length > 0);
          
          if (taskToEdit.dueDate) {
              try {
                  const d = new Date(taskToEdit.dueDate.includes('T') ? taskToEdit.dueDate : taskToEdit.dueDate.replace(' ', 'T'));
                  if (!isNaN(d.getTime())) {
                      setDateVal(d.toISOString().split('T')[0]);
                      setTimeVal(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                  } else {
                      setDateVal(''); setTimeVal('');
                  }
              } catch(e) { setDateVal(''); setTimeVal(''); }
          } else {
              setDateVal(''); setTimeVal('');
          }
      } else {
          // New Task Mode
          setDescription(initialDescription);
          setPriority(TaskPriority.NORMAL);
          setDateVal(new Date().toISOString().split('T')[0]);
          setTimeVal('');
          setSubtasks([]);
          setIsChecklistMode(false);
      }
      setNewSubtaskText('');
    }
  }, [isOpen, initialDescription, taskToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    
    let finalDueDate = undefined;
    if (dateVal) {
        finalDueDate = timeVal ? `${dateVal} ${timeVal}` : dateVal;
    }

    onAdd({ 
        description, 
        priority, 
        dueDate: finalDueDate,
        subtasks: isChecklistMode ? subtasks : undefined
    });
  };

  const handleAddSubtask = () => {
      if(!newSubtaskText.trim()) return;
      setSubtasks([...subtasks, { id: Date.now().toString(), text: newSubtaskText, isCompleted: false }]);
      setNewSubtaskText('');
  };

  const removeSubtask = (id: string) => {
      setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const setDateToToday = () => setDateVal(new Date().toISOString().split('T')[0]);
  const setDateToTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setDateVal(d.toISOString().split('T')[0]);
  };

  const priorities = [
    { 
      id: TaskPriority.NORMAL, 
      label: 'Routine', 
      icon: <Flag size={18} />, 
      style: 'from-slate-500 to-slate-600', 
      border: 'border-slate-500/30' 
    },
    { 
      id: TaskPriority.BEFORE_NOON, 
      label: 'Before Noon', 
      icon: <Clock size={18} />, 
      style: 'from-amber-500 to-orange-500', 
      border: 'border-amber-500/30' 
    },
    { 
      id: TaskPriority.BEFORE_DISCHARGE, 
      label: 'Pre-Discharge', 
      icon: <CheckCircle2 size={18} />, 
      style: 'from-emerald-500 to-teal-500', 
      border: 'border-emerald-500/30' 
    },
    { 
      id: TaskPriority.URGENT, 
      label: 'Urgent', 
      icon: <Zap size={18} />, 
      style: 'from-red-500 to-rose-600', 
      border: 'border-red-500/30' 
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-lg shadow-2xl relative backdrop-blur-xl transform transition-all scale-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className="px-6 py-5 border-b border-glass-border bg-gradient-to-r from-indigo-500/5 to-purple-500/5 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-main tracking-tight">{taskToEdit ? 'Edit Task' : 'New Task'}</h2>
                <p className="text-xs text-muted font-medium">{taskToEdit ? 'Update task details' : 'Create a clinical action item'}</p>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* Mode Switcher */}
            <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border">
                <button
                    type="button"
                    onClick={() => setIsChecklistMode(false)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!isChecklistMode ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-muted hover:text-main'}`}
                >
                    <CheckCircle2 size={14} /> Simple Task
                </button>
                <button
                    type="button"
                    onClick={() => setIsChecklistMode(true)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isChecklistMode ? 'bg-white shadow-sm text-indigo-600 dark:bg-slate-700 dark:text-white' : 'text-muted hover:text-main'}`}
                >
                    <ListChecks size={14} /> Checklist
                </button>
            </div>

            {/* Description Input */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">
                    {isChecklistMode ? 'Checklist Title' : 'Task Description'}
                </label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isChecklistMode ? "e.g. Discharge Planning" : "Describe the task (e.g. 'Call Cardio', 'Check BMP')..."}
                    className={`w-full bg-glass-depth border border-glass-border rounded-2xl p-4 text-main placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-lg leading-relaxed shadow-inner ${isChecklistMode ? 'h-16' : 'h-28'}`}
                    autoFocus
                />
            </div>

            {/* Checklist Editor */}
            {isChecklistMode && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Subtasks</label>
                    <div className="space-y-2">
                        {subtasks.map((st, i) => (
                            <div key={st.id} className="flex items-center gap-2 p-2 bg-glass-panel border border-glass-border rounded-xl">
                                <div className="w-5 h-5 border-2 border-indigo-500/30 rounded flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-indigo-500">{i+1}</span>
                                </div>
                                <span className="text-sm text-main flex-1">{st.text}</span>
                                <button type="button" onClick={() => removeSubtask(st.id)} className="p-1 text-muted hover:text-red-500">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            value={newSubtaskText}
                            onChange={(e) => setNewSubtaskText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                            placeholder="Add item..."
                            className="flex-1 bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <button 
                            type="button" 
                            onClick={handleAddSubtask}
                            className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl hover:bg-indigo-500/20"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Priority Selector */}
            <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Priority Level</label>
                <div className="grid grid-cols-2 gap-3">
                    {priorities.map((p) => {
                        const isSelected = priority === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setPriority(p.id)}
                                className={`
                                    relative p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 overflow-hidden group
                                    ${isSelected 
                                        ? `bg-gradient-to-br ${p.style} border-transparent text-white shadow-lg scale-[1.02]` 
                                        : 'bg-glass-panel border-glass-border text-muted hover:border-indigo-500/30 hover:bg-glass-depth'}
                                `}
                            >
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-glass-depth'}`}>
                                    {p.icon}
                                </div>
                                <div className="text-left">
                                    <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-main'}`}>{p.label}</div>
                                    <div className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                                        {isSelected ? 'Selected' : 'Tap to select'}
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 blur-xl rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Date & Time Picker */}
            <div className="space-y-3">
                 <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Due Date & Time</label>
                 
                 <div className="bg-glass-depth border border-glass-border rounded-2xl p-1.5 flex flex-col sm:flex-row gap-1.5">
                    {/* Date Input */}
                    <div className="flex-1 relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted group-focus-within:text-indigo-500 transition-colors">
                            <CalendarDays size={16} />
                        </div>
                        <input 
                            type="date"
                            value={dateVal}
                            onChange={(e) => setDateVal(e.target.value)}
                            className="w-full bg-glass-panel border-none rounded-xl py-2.5 pl-10 pr-3 text-sm text-main focus:ring-2 focus:ring-indigo-500/30 outline-none h-10"
                        />
                    </div>
                    
                    {/* Time Input */}
                    <div className="flex-1 relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted group-focus-within:text-indigo-500 transition-colors">
                            <Clock size={16} />
                        </div>
                        <input 
                            type="time"
                            value={timeVal}
                            onChange={(e) => setTimeVal(e.target.value)}
                            className="w-full bg-glass-panel border-none rounded-xl py-2.5 pl-10 pr-3 text-sm text-main focus:ring-2 focus:ring-indigo-500/30 outline-none h-10"
                        />
                    </div>
                 </div>

                 {/* Quick Dates */}
                 <div className="flex gap-2">
                     <button 
                        type="button" 
                        onClick={setDateToToday}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
                     >
                         Today
                     </button>
                     <button 
                        type="button" 
                        onClick={setDateToTomorrow}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                     >
                         Tomorrow
                     </button>
                 </div>
            </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 pt-2 border-t border-glass-border bg-glass-panel/50 backdrop-blur-sm">
            <button 
                onClick={(e) => handleSubmit(e)}
                disabled={!description.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {taskToEdit ? <Pencil size={18} /> : <CheckCircle2 size={18} />}
                {taskToEdit ? 'Update Task' : 'Confirm Task'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;