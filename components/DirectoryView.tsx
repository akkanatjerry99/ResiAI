
import React, { useState } from 'react';
import { Phone, Search, Plus, Pencil, Trash2, HeartPulse, Shield, BedDouble, Scan, FlaskConical, Droplet, Pill, Monitor, Stethoscope } from 'lucide-react';
import { DirectoryItem } from './DirectoryEditModal';

interface DirectoryViewProps {
  items: DirectoryItem[];
  onAdd: () => void;
  onEdit: (item: DirectoryItem) => void;
  onDelete: (id: string) => void;
}

const DirectoryView: React.FC<DirectoryViewProps> = ({ items, onAdd, onEdit, onDelete }) => { 
    const [search, setSearch] = useState(''); 
    const [filter, setFilter] = useState('All'); 
    const categories = ['All', 'Emergency', 'Wards', 'ICU', 'Dialysis Unit', 'Services', 'Other']; 
    
    const filtered = items.filter(item => (filter === 'All' || item.category === filter) && (item.name.toLowerCase().includes(search.toLowerCase()) || item.ext.includes(search))); 
    
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20 flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex flex-col gap-1 shrink-0">
                <h1 className="text-3xl font-bold text-main tracking-tight flex items-center gap-2"><Phone size={32} className="text-blue-500"/> Hospital Directory</h1>
                <p className="text-muted">Quick access to essential extensions and pagers.</p>
            </div>
            <div className="bg-glass-panel border border-glass-border rounded-3xl p-6 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 shrink-0">
                    <div className="relative w-full md:w-96">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search directory..." className="w-full bg-glass-depth border border-glass-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"/>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border overflow-x-auto w-full md:w-auto custom-scrollbar">
                            {categories.map(cat => (
                                <button key={cat} onClick={() => setFilter(cat)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none ${filter === cat ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-muted hover:text-main'}`}>{cat}</button>
                            ))}
                        </div>
                        <button onClick={onAdd} className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 font-bold hover:bg-blue-500/20 text-xs flex items-center gap-1 shrink-0"><Plus size={14}/> Add Contact</button>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((item) => (
                            <div key={item.id} className="p-4 rounded-2xl bg-glass-depth border border-glass-border hover:bg-glass-panel transition-all group flex items-center gap-4 cursor-pointer hover:shadow-md hover:scale-[1.01] relative pr-20">
                                <div className={`p-3 rounded-xl border ${item.color || 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>{item.icon || <Phone size={20}/>}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-main truncate">{item.name}</div>
                                    <div className="text-xs text-muted font-medium uppercase tracking-wider">{item.category}</div>
                                </div>
                                <div className="text-lg font-mono font-bold text-main bg-white/50 dark:bg-black/20 px-3 py-1 rounded-lg border border-glass-border group-hover:text-blue-500 transition-colors">{item.ext}</div>
                                
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 rounded-lg bg-glass-panel border border-glass-border text-blue-500 hover:bg-blue-500 hover:text-white transition-colors shadow-sm"><Pencil size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-2 rounded-lg bg-glass-panel border border-glass-border text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-sm"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (<div className="col-span-full py-12 text-center text-muted italic">No contacts found matching "{search}"</div>)}
                    </div>
                </div>
            </div>
        </div>
    ); 
};

export default DirectoryView;
