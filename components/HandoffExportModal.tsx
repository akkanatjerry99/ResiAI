import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageSquare, Moon, Sun, RefreshCw, Filter, Settings2 } from 'lucide-react';
import { Patient, TaskPriority } from '../types';
import { formatToBuddhistEra } from '../services/dateService';

interface HandoffExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
}

const HandoffExportModal: React.FC<HandoffExportModalProps> = ({ isOpen, onClose, patients }) => {
  const [handoffText, setHandoffText] = useState('');
  const [copied, setCopied] = useState(false);
  const [activePatients, setActivePatients] = useState<Patient[]>([]);
  const [includeStable, setIncludeStable] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'unstable' | 'watch'>('all');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Auto-regenerate whenever patients or filters change
  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, patients, includeStable, filterMode]);

  const regenerate = () => {
      let filtered = patients.filter(p => p.status !== 'Discharged');
      
      if (!includeStable) {
          filtered = filtered.filter(p => p.acuity !== 'Stable');
      }
      
      if (filterMode === 'unstable') {
          filtered = filtered.filter(p => p.acuity === 'Unstable');
      } else if (filterMode === 'watch') {
          filtered = filtered.filter(p => p.acuity === 'Watch' || p.acuity === 'Unstable');
      }

      const sorted = filtered.sort((a, b) => 
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
      );
      
      setActivePatients(sorted);
      setHandoffText(generateThaiHandoff(sorted));
  };

  const handleRefresh = () => {
      setIsRegenerating(true);
      // Small delay to show animation and confirm action to user
      setTimeout(() => {
          regenerate();
          setIsRegenerating(false);
      }, 500);
  };

  const getRecentCriticalLabs = (p: Patient) => {
      const results: string[] = [];
      const today = new Date().toDateString();
      
      // Helper to check date match
      const isToday = (dateStr: string) => {
          try {
              const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
              return d.toDateString() === today;
          } catch(e) { return false; }
      };

      // Check specific keys
      p.labs.creatinine?.forEach(l => {
          if (isToday(l.date) && Number(l.value) > 1.5) results.push(`Cr ${l.value}`);
      });
      p.labs.k?.forEach(l => {
          if (isToday(l.date) && (Number(l.value) < 3.5 || Number(l.value) > 5.0)) results.push(`K ${l.value}`);
      });
      p.labs.wbc?.forEach(l => {
          if (isToday(l.date) && (Number(l.value) > 15 || Number(l.value) < 4)) results.push(`WBC ${l.value}`);
      });
      p.labs.hgb?.forEach(l => {
          if (isToday(l.date) && Number(l.value) < 8) results.push(`Hb ${l.value}`);
      });
      
      // Check Other
      p.labs.others.forEach(o => {
          const last = o.values[o.values.length - 1];
          if (last && isToday(last.date)) {
              // Heuristic for abnormal (user usually manual enters abnormals)
              results.push(`${o.name} ${last.value}`);
          }
      });

      return results;
  };

  const generateThaiHandoff = (pts: Patient[]) => {
    const dateHeader = `📅 Handoff ${formatToBuddhistEra(new Date(), { day: 'numeric', month: 'short' })}\nเวรบ่าย/ดึก (Total ${pts.length})`;
    
    const body = pts.map(p => {
        const lines: string[] = [];
        
        // --- 1. Header: Room Name (Age/Sex) ---
        const ageSex = `${p.age}${p.gender}`;
        lines.push(`🏥 ${p.roomNumber} ${p.name} (${ageSex})`);
        
        // --- 2. Diagnosis (#) ---
        if (p.diagnosis) {
             const dx = p.diagnosis.startsWith('#') ? p.diagnosis : `#${p.diagnosis}`;
             lines.push(dx);
        }
        
        // --- 3. One Liner (Context) ---
        if (p.oneLiner && p.oneLiner !== p.diagnosis) {
             lines.push(`ℹ️ ${p.oneLiner}`);
        }

        // --- 4. Meds (Abx, Drips) ---
        const medsLines: string[] = [];
        
        // Antibiotics
        if (p.antibiotics && p.antibiotics.length > 0) {
            const abx = p.antibiotics.map(a => {
                const start = new Date(a.startDate).getTime();
                const now = new Date().getTime();
                const day = Math.floor((now - start) / (86400000)) + 1;
                return `${a.name} (D${day})`;
            }).join(', ');
            medsLines.push(`💊 On ${abx}`);
        }
        
        // Drips
        const drips = p.medications.filter(m => m.isActive && (m.route.includes('Drip') || ['Norepinephrine', 'Levophed', 'Dopamine', 'Adrenalin', 'Milrinone', 'Nicardipine'].some(d => m.name.includes(d))));
        if (drips.length > 0) {
            medsLines.push(`💧 Drips: ${drips.map(d => `${d.name} ${d.dose}`).join(', ')}`);
        }
        
        if (medsLines.length > 0) lines.push(medsLines.join('\n'));

        // --- 5. New Labs / Micro ---
        const activeCultures = (p.microbiology || []).filter(c => 
             c.status !== 'Final' || 
             (c.organism && !c.organism.toLowerCase().includes('no growth') && !c.organism.toLowerCase().includes('normal flora'))
        );
        const critLabs = getRecentCriticalLabs(p);
        
        if (activeCultures.length > 0 || critLabs.length > 0) {
            const parts = [];
            if (critLabs.length > 0) parts.push(`Labs Today: ${critLabs.join(', ')}`);
            if (activeCultures.length > 0) parts.push(`Micro: ${activeCultures.map(c => `${c.specimen} -> ${c.organism || 'Pending'}`).join(', ')}`);
            lines.push(`🧪 ${parts.join('\n   ')}`);
        }

        // --- 6. Summary Points ---
        if (p.handoff.patientSummary && p.handoff.patientSummary !== p.oneLiner) {
             const summaryLines = p.handoff.patientSummary.split('\n').map(l => l.trim()).filter(Boolean);
             summaryLines.forEach(l => lines.push(`- ${l.replace(/^- /, '')}`));
        }

        // --- 7. "ฝาก" (Fak) - The Plan ---
        const fakItems: string[] = [];
        
        // Manual Action List Only
        if (p.handoff.actionList) {
            const manualActions = p.handoff.actionList.split('\n').filter(s => s.trim());
            
            // Format time nicely if present (e.g. "Task (at 14:00 น.)" -> "Task @ 14:00")
            const formattedActions = manualActions.map(action => {
                const match = action.match(/^(.*?)\s\(at\s(\d{1,2}:\d{2})\sน\.\)$/);
                if (match) {
                    const task = match[1];
                    const time = match[2];
                    return `${task} @ ${time}`;
                }
                return action;
            });

            fakItems.push(...formattedActions);
        }

        // Contingencies (Automatic for unstable)
        if (p.acuity === 'Unstable' && p.handoff.contingencies) {
            fakItems.push(`If worsens: ${p.handoff.contingencies}`);
        } else if (p.acuity === 'Unstable') {
            fakItems.push('Observe clinical status closely');
        }

        if (fakItems.length > 0) {
            lines.push(`🌙 ฝาก: ${fakItems.join(', ')}`);
        } else {
            lines.push(`✨ ไม่ฝาก`);
        }

        return lines.join('\n');
    }).join('\n\n----------------------------\n\n');

    return `${dateHeader}\n\n${body}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(handoffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-glass-panel border border-glass-border p-0 rounded-3xl w-full max-w-5xl shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-glass-border bg-gradient-to-r from-blue-500/10 to-indigo-500/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl shadow-inner border border-blue-500/20">
                    <MessageSquare size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-main">Auto-Handoff Generator</h2>
                    <p className="text-xs text-muted font-medium">Automatic synthesis from patient charts (I-PASS)</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleRefresh}
                    className="p-2 rounded-lg hover:bg-glass-depth text-muted hover:text-blue-500 transition-colors"
                    title="Refresh Data & Reset Manual Edits"
                >
                    <RefreshCw size={20} className={isRegenerating ? "animate-spin text-blue-500" : ""} />
                </button>
                <button 
                    onClick={onClose} 
                    className="p-2 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-2 border-b border-glass-border bg-glass-panel/50 flex flex-wrap items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-muted">
                <Filter size={14} /> Filter:
            </div>
            <div className="flex bg-glass-depth p-1 rounded-lg border border-glass-border">
                <button 
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterMode === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-muted hover:text-main'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilterMode('watch')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterMode === 'watch' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-600' : 'text-muted hover:text-main'}`}
                >
                    Watch+
                </button>
                <button 
                    onClick={() => setFilterMode('unstable')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterMode === 'unstable' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-muted hover:text-main'}`}
                >
                    Unstable
                </button>
            </div>
            
            <label className="flex items-center gap-2 text-xs font-bold text-muted cursor-pointer hover:text-main">
                <input 
                    type="checkbox" 
                    checked={includeStable} 
                    onChange={e => setIncludeStable(e.target.checked)}
                    className="rounded border-glass-border text-blue-600 focus:ring-blue-500"
                />
                Include Stable Patients
            </label>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* Raw Text Column */}
            <div className="flex-1 flex flex-col border-r border-glass-border bg-glass-depth/30 min-w-0">
                <div className="p-3 border-b border-glass-border bg-glass-panel/50 text-xs font-bold text-muted uppercase tracking-wider flex justify-between items-center">
                    <span>Generated Text (Ready to Copy)</span>
                    <button onClick={handleCopy} className="text-blue-500 hover:text-blue-600 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-md transition-colors font-bold">
                        {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
                <textarea 
                    value={handoffText}
                    onChange={(e) => setHandoffText(e.target.value)}
                    className="flex-1 w-full p-4 bg-transparent border-none text-sm font-mono text-main outline-none resize-none focus:ring-inset focus:ring-2 focus:ring-blue-500/20"
                    spellCheck={false}
                />
            </div>

            {/* Preview List Column */}
            <div className="w-full md:w-80 lg:w-96 flex flex-col bg-glass-panel/30 shrink-0 border-l border-glass-border">
                <div className="p-3 border-b border-glass-border bg-glass-panel/50 text-xs font-bold text-muted uppercase tracking-wider">
                    Included Patients ({activePatients.length})
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {activePatients.map(p => (
                        <div key={p.id} className="p-3 rounded-xl bg-glass-panel border border-glass-border flex justify-between items-center">
                            <div>
                                <div className="font-bold text-xs text-main">{p.roomNumber} {p.name}</div>
                                <div className="text-[10px] text-muted truncate max-w-[150px]">{p.diagnosis}</div>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${p.acuity === 'Unstable' ? 'bg-red-500 text-white' : p.acuity === 'Watch' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                                {p.acuity}
                            </span>
                        </div>
                    ))}
                    {activePatients.length === 0 && (
                        <div className="text-center text-muted text-xs py-8 italic">No patients match filter</div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default HandoffExportModal;