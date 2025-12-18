import React, { useMemo, useCallback } from 'react';
import { Patient, Acuity, Isolation, TaskPriority, ACPLimitations, LabValue } from '../types';
import { AlertCircle, ShieldAlert, BadgeAlert, ArrowRight, Skull, Activity, Bed, Plus, Check, Clock, HeartPulse, Trash2, FileText, Pencil, ListChecks, Scan, Beaker, Siren, Stethoscope } from 'lucide-react';
import { formatToBuddhistEra } from '../services/dateService';

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
  onAddTask?: () => void;
  onToggleTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
  onScan?: () => void;
  isPresentationMode: boolean;
  isLoading?: boolean;
}

const getLatestLabValue = (values: LabValue[] | undefined) => {
  if (!values || values.length === 0) return 'N/A';
  // Assuming values are sorted with the latest first
  return values[0].value;
};

const PatientCard: React.FC<PatientCardProps> = ({ 
  patient, 
  onClick, 
  onAddTask, 
  onToggleTask, 
  onDeleteTask, 
  onEditTask, 
  onScan, 
  isPresentationMode,
  isLoading = false 
}) => {
const acuityStyles = useMemo(() => {
    switch (patient.acuity) {
      case Acuity.UNSTABLE:
        return {
            border: 'border-l-red-400',
            bg: 'bg-white/10 dark:bg-black/20',
            indicatorIcon: 'text-red-400',
            glow: ''
        };
      case Acuity.WATCH:
        return {
            border: 'border-l-amber-400',
            bg: 'bg-white/10 dark:bg-black/20',
            indicatorIcon: 'text-amber-400',
            glow: ''
        };
      default:
        return {
            border: 'border-l-teal-400',
            bg: 'bg-white/10 dark:bg-black/20',
            indicatorIcon: 'text-teal-400',
            glow: ''
        };
    }
  }, [patient.acuity]);

const isolationIcon = useMemo(() => {
    if (patient.isolation === Isolation.NONE) return null;
    
    let colorClass = 'bg-purple-500/20 text-purple-700 dark:text-purple-200 border-purple-500/30';   
    let label = patient.isolation;
    
    if (patient.isolation === Isolation.AIRBORNE) {
      colorClass = 'bg-blue-500/20 text-blue-700 dark:text-blue-200 border-blue-500/30';
    }
    if (patient.isolation === Isolation.CONTACT) {
      colorClass = 'bg-orange-500/20 text-orange-700 dark:text-orange-200 border-orange-500/30';
    }

    return (
      <div 
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}
        role="status"
        aria-label={`Isolation precaution: ${label}`}
      >
        <ShieldAlert size={10} aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden" aria-hidden="true">{label.charAt(0)}</span>
      </div>
    );
  }, [patient.isolation]);

  const getSchemeStyles = useCallback((scheme: string) => {
      if (scheme.includes('บัตรทอง')) return 'bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20';
      if (scheme.includes('ข้าราชการ')) return 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20';
      if (scheme.includes('ประกันสังคม')) return 'bg-pink-100 border-pink-200 text-pink-800 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/20';
      return 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-600';
  }, []);

  const getShortScheme = useCallback((scheme: string) => {
      if (scheme.includes('บัตรทอง')) return 'บัตรทอง (UCS)';
      if (scheme.includes('ข้าราชการ')) return 'ข้าราชการ';
      if (scheme.includes('ประกันสังคม')) return 'ประกันสังคม';
      if (scheme.includes('รัฐวิสาหกิจ')) return 'รัฐวิสาหกิจ';
      if (scheme.includes('ครูเอกชน')) return 'ครูเอกชน';
      if (scheme.includes('ต่างด้าว')) return 'ต่างด้าว';
      if (scheme.includes('ชำระเงินเอง')) return 'ชำระเงินเอง';
      return scheme.length > 15 ? scheme.substring(0, 12) + '...' : scheme;
  }, []);

  const getPriorityDot = useCallback((priority: TaskPriority) => {
      switch(priority) {
          case TaskPriority.URGENT: return 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]';
          case TaskPriority.BEFORE_NOON: return 'bg-amber-500';
          case TaskPriority.BEFORE_DISCHARGE: return 'bg-emerald-500';
          default: return 'bg-slate-400';
      }
  }, []);

  const formatTaskDate = useCallback((dateStr?: string) => {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
        // If invalid date, return original string (might be just time "14:00")
        if (isNaN(date.getTime())) return dateStr;

        const today = new Date();
        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = date.getDate() === tomorrow.getDate() && date.getMonth() === tomorrow.getMonth();

        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Check if the original string had a time component (length > 10 usually "YYYY-MM-DD HH:mm")
        const hasTime = dateStr.length > 10; 

        if (isToday) return hasTime ? timeStr : 'Today';
        if (isTomorrow) return hasTime ? `Tmw ${timeStr}` : 'Tomorrow';
        return hasTime ? `${formatToBuddhistEra(date, { day: 'numeric', month: 'numeric' })} ${timeStr}` : formatToBuddhistEra(date, { day: 'numeric', month: 'numeric' });
    } catch (e) {
        return dateStr;
    }
  }, []);

  const codeStatusBadge = useMemo(() => {
      const { category, limitations } = patient.advancedCarePlan;
      
      if (category === 'Full Code') return null;
      
      if (category === 'Not Decided') {
          return (
             <span 
               className="text-[10px] sm:text-xs font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-yellow-200 dark:border-yellow-500/20 whitespace-nowrap"
               role="status"
               aria-label="Advanced care plan status pending"
             >
                <HeartPulse size={10} aria-hidden="true" /> Status Pending
             </span>
          );
      }

      // If ACP, show specific limits
      const activeLimits = [];
      if (limitations.noCPR) activeLimits.push('No CPR');
      if (limitations.noETT) activeLimits.push('No ETT');
      if (limitations.noInotropes) activeLimits.push('No Inotropes');
      
      // If more than 2, just say "ACP" + count, otherwise list them
      const label = activeLimits.length > 0 ? activeLimits.slice(0, 2).join(', ') + (activeLimits.length > 2 ? '...' : '') : 'ACP';

      return (
          <span 
            className="text-[10px] sm:text-xs font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-200 dark:border-red-500/20 whitespace-nowrap" 
            role="status"
            aria-label={`Advanced care plan with limitations: ${activeLimits.join(', ')}`}
            title="Advanced Care Plan"
          >
            <Skull size={10} aria-hidden="true" /> {label}
          </span>
      );
  }, [patient.advancedCarePlan]);

  const taskStats = useMemo(() => {
    const completed = patient.tasks.filter(t => t.isCompleted).length;
    const total = patient.tasks.length;
    return { completed, total };
  }, [patient.tasks]);

  const activeConsults = useMemo(() => {
    return patient.consults?.filter(c => c.status === 'Active' || c.status === 'Pending');
  }, [patient.consults]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    onClick();
  }, [onClick]);

  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  const handleScanClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onScan?.();
  }, [onScan]);

  const handleAddTaskClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddTask?.();
  }, [onAddTask]);

  if (isLoading) {
    return (
      <div 
        className={`
          relative overflow-hidden rounded-2xl border backdrop-blur-md
          border-l-[5px] border-l-slate-300 bg-glass-panel
          shadow-[0_2px_8px_rgba(0,0,0,0.06)]
          h-full flex flex-col animate-pulse
        `}
        role="status"
        aria-label="Loading patient information"
      >
        <div className="p-5 flex flex-col gap-4 flex-1">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          </div>
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Patient ${patient.name}, Room ${patient.roomNumber}, ${patient.acuity} acuity. Click for details.`}
      className={`
        relative overflow-hidden rounded-2xl border border-white/20 backdrop-blur-2xl transition-all duration-300 hover:scale-[1.01] cursor-pointer group
        hover:border-indigo-400/80 dark:hover:border-indigo-400/60
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/5
        border-l-4 ${acuityStyles.border} ${acuityStyles.bg}
        shadow-lg hover:shadow-xl shadow-inner-glass
        h-full flex flex-col
      `}
    >
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header Row */}
        <header className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div 
                  className="flex items-center gap-2 h-8 px-3 rounded-full bg-black/10 dark:bg-black/20 border border-white/10 backdrop-blur-lg"
                  aria-label={`Room ${patient.roomNumber}`}
                >
                    <Bed size={16} strokeWidth={2.5} className={acuityStyles.indicatorIcon} />
                    <span className="text-sm font-bold tracking-tighter text-main">{patient.roomNumber}</span>     
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-slate-800 dark:text-white truncate transition-colors ${isPresentationMode ? 'text-xl' : 'text-lg'}`} title={patient.name}>
                      {patient.name}
                    </h3>
                  </div>
                  {patient.hn && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1" data-testid="patient-hn">
                      <FileText size={isPresentationMode ? 16 : 14} className="shrink-0" />
                      <span className={`font-mono tracking-wider ${isPresentationMode ? 'text-base' : 'text-sm'}`}>{patient.hn}</span>
                    </div>
                  )}
                </div>
            </div>

            <div className="flex flex-col items-end gap-2">
               {isolationIcon}
               <button
                  onClick={handleScanClick}
                  className="p-2 rounded-lg bg-black/10 text-white/70 hover:bg-black/20 hover:text-white transition-all border border-white/10 min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label="Scan admission note"
                  title="Scan Admission Note"
               >
                  <Scan size={18} aria-hidden="true" />
               </button>
            </div>
        </header>

        {/* One Liner */}
        <div 
          className={`
            px-3 py-2 rounded-lg border border-white/10 bg-black/10 backdrop-blur-lg
            ${isPresentationMode ? 'text-base font-medium' : 'text-sm'}
            text-main leading-relaxed
          `}
          role="contentinfo"
          aria-label="Clinical summary"
        >
            {patient.oneLiner}
        </div>

        {!isPresentationMode && (
            <section className="pt-3 border-t border-white/10" aria-labelledby="tasks-heading">
                <div className="flex items-center justify-between mb-2">
                    <h4 id="tasks-heading" className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider">
                        <BadgeAlert size={14} aria-hidden="true" />
                        Tasks
                    </h4>
                    {patient.tasks.length > 0 && (
                         <span 
                           className="text-xs bg-black/10 border border-white/10 px-2 py-0.5 rounded-lg text-main font-bold"
                           aria-label={`${taskStats.completed} of ${taskStats.total} tasks completed`}
                         >
                             {taskStats.completed} / {taskStats.total}
                         </span>
                    )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none" role="list">
                    {patient.tasks.length === 0 ? (
                        <div className="flex-1 text-center py-2">
                            <span className="text-xs text-muted/60 italic">No active tasks</span>
                        </div>
                    ) : (
                        patient.tasks.slice(0, 4).map(task => {
                            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                            const subtasksDone = task.subtasks ? task.subtasks.filter(s => s.isCompleted).length : 0;
                            const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

                            return (
                                <div
                                    key={task.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleTask?.(task.id);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onToggleTask?.(task.id);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Task: ${task.description}. ${task.isCompleted ? 'Completed' : 'Not completed'}. ${task.dueDate ? `Due ${formatTaskDate(task.dueDate)}` : ''}`}
                                    className={`
                                        flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs border max-w-[160px] flex items-center gap-2 cursor-pointer group/task
                                        transition-all duration-200 font-medium relative select-none backdrop-blur-lg
                                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1
                                        ${task.isCompleted
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                            : 'bg-white/5 border-white/10 text-main hover:bg-white/10 hover:border-white/20 hover:shadow-md'}
                                    `}
                                    title={task.description}
                                >
                                    <div className="absolute -top-2 -right-2 p-2 flex gap-1 opacity-0 group-hover/task:opacity-100 group-focus-within/task:opacity-100 transition-opacity z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditTask?.(task.id);
                                            }}
                                            className="p-1.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 min-w-[24px] min-h-[24px] flex items-center justify-center"
                                            aria-label={`Edit task: ${task.description}`}
                                            title="Edit"
                                        >
                                            <Pencil size={10} aria-hidden="true" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteTask?.(task.id);
                                            }}
                                            className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 min-w-[24px] min-h-[24px] flex items-center justify-center"
                                            aria-label={`Delete task: ${task.description}`}
                                            title="Delete"
                                        >
                                            <Trash2 size={10} aria-hidden="true" />
                                        </button>
                                    </div>
                                    {hasSubtasks ? (
                                        <div 
                                          className={`
                                            px-1.5 py-0.5 rounded-md text-[9px] font-bold border      
                                            ${subtasksDone === totalSubtasks ? 'bg-green-500 text-white border-green-600' : 'bg-black/20 text-muted border-white/10'}
                                          `}
                                          aria-label={`${subtasksDone} of ${totalSubtasks} subtasks completed`}
                                        >
                                            {subtasksDone}/{totalSubtasks}
                                        </div>
                                    ) : (
                                        <div 
                                          className={`
                                            w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all border-2
                                            ${task.isCompleted ? 'bg-green-500 border-green-400 text-white' : `${getPriorityDot(task.priority)} border-white/50`}
                                          `}
                                          aria-hidden="true"
                                        >
                                            <Check
                                                size={10} 
                                                strokeWidth={3} 
                                                className={task.isCompleted ? 'opacity-100' : 'opacity-0'} 
                                            />
                                        </div>
                                    )}
                                    
                                    <span className={`truncate flex-1 ${task.isCompleted ? 'line-through opacity-70' : ''}`}>{task.description}</span>
                                    {task.dueDate && !task.isCompleted && (
                                        <span 
                                          className="flex items-center gap-1 text-[10px] text-muted bg-black/20 px-1.5 py-0.5 rounded-md border border-white/10"
                                          aria-label={`Due ${formatTaskDate(task.dueDate)}`}
                                        >
                                            <Clock size={9} aria-hidden="true" />
                                            {formatTaskDate(task.dueDate)}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                    {patient.tasks.length > 4 && (
                        <div 
                          className="text-xs px-3 py-2 flex items-center text-muted bg-black/10 rounded-lg border border-white/10 font-medium"
                          aria-label={`${patient.tasks.length - 4} more tasks`}
                        >
                            +{patient.tasks.length - 4}
                        </div>
                    )}

                    <button
                        onClick={handleAddTaskClick}
                        className="flex-shrink-0 w-9 h-9 rounded-lg border-2 border-dashed border-white/20 text-muted hover:text-indigo-400 hover:border-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 min-w-[36px] min-h-[36px]"
                        aria-label="Add new task"
                        title="Add Task"
                    >
                        <Plus size={14} aria-hidden="true" />
                    </button>
                </div>
            </section>
        )}
      </div>
      
      <div 
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 text-indigo-400 pointer-events-none"
        aria-hidden="true"
      >
          <ArrowRight size={20} strokeWidth={2.5} />
      </div>
    </article>
  );
};

export default React.memo(PatientCard);
