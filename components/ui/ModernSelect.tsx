
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface ModernSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
}

const ModernSelect: React.FC<ModernSelectProps> = ({ value, onChange, options, label, placeholder, icon, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal search term when value changes externally
  useEffect(() => {
      if (!isOpen) {
          setSearchTerm(value);
      }
  }, [value, isOpen]);

  const filteredOptions = searchable 
    ? options.filter(opt => (opt || '').toLowerCase().includes((searchTerm || '').toLowerCase())) 
    : options;

  return (
    <div className="relative w-full font-thai" ref={containerRef}>
      {label && <label className="text-xs font-bold text-muted uppercase ml-1 mb-1 block">{label}</label>}
      
      <div className="relative">
          {/* Render Input if searchable, else Button */}
          {searchable ? (
             <div className={`
                w-full flex items-center px-4 py-2.5 rounded-xl border transition-all duration-200
                ${isOpen 
                    ? 'bg-glass-panel border-indigo-500 ring-2 ring-indigo-500/20' 
                    : 'bg-glass-depth border-glass-border hover:bg-glass-panel hover:border-indigo-500/30'}
             `}>
                <div className="flex items-center gap-2 text-sm text-main flex-1 min-w-0">
                    {icon && <span className="text-indigo-500 shrink-0">{icon}</span>}
                    <input 
                        type="text"
                        value={isOpen ? searchTerm : value}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if(!isOpen) setIsOpen(true);
                        }}
                        onFocus={() => {
                            setSearchTerm(''); // Clear to show all options on focus, or keep value? Usually clear for search.
                            setIsOpen(true);
                        }}
                        placeholder={placeholder || 'Select...'}
                        className="bg-transparent border-none outline-none w-full placeholder-muted/70 text-main font-medium truncate"
                    />
                </div>
                <ChevronDown size={16} className={`text-muted transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} onClick={() => setIsOpen(!isOpen)}/>
             </div>
          ) : (
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200
                    ${isOpen 
                        ? 'bg-glass-panel border-indigo-500 ring-2 ring-indigo-500/20' 
                        : 'bg-glass-depth border-glass-border hover:bg-glass-panel hover:border-indigo-500/30'}
                `}
              >
                <div className="flex items-center gap-2 text-sm text-main truncate">
                    {icon && <span className="text-indigo-500 shrink-0">{icon}</span>}
                    <span className={value ? 'text-main' : 'text-muted truncate'}>
                        {value || placeholder || 'Select...'}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-muted transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
          )}

          {isOpen && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-800 border border-glass-border rounded-xl shadow-2xl backdrop-blur-3xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="max-h-60 overflow-y-auto overscroll-contain">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => { 
                                    onChange(opt); 
                                    setSearchTerm(opt);
                                    setIsOpen(false); 
                                }}
                                className={`
                                    w-full text-left px-4 py-3 text-sm transition-colors flex justify-between items-center group border-b border-glass-border/30 last:border-0
                                     ${value === opt ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 font-bold' : 'text-main hover:bg-slate-100 dark:hover:bg-slate-700'}
                                `}
                            >
                                <span className="truncate">{opt}</span>
                                {value === opt && <Check size={14} className="text-indigo-500 shrink-0" />}
                            </button>
                        ))
                    ) : (
                        <div className="p-3 text-xs text-muted text-center">No matches found</div>
                    )}
                </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default ModernSelect;
