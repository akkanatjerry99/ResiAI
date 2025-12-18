
import React, { useState, useEffect } from 'react';
import { X, Save, Phone, Building, Hash } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

export interface DirectoryItem {
    id: string;
    name: string;
    ext: string;
    category: string;
    icon?: React.ReactNode;
    color?: string;
}

interface DirectoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<DirectoryItem, 'icon' | 'color'> & { id?: string }) => void;
  itemToEdit?: DirectoryItem | null;
}

const CATEGORIES = ['Emergency', 'Wards', 'ICU', 'Dialysis Unit', 'Services', 'Other'];

const DirectoryEditModal: React.FC<DirectoryEditModalProps> = ({ isOpen, onClose, onSave, itemToEdit }) => {
  const [name, setName] = useState('');
  const [ext, setExt] = useState('');
  const [category, setCategory] = useState('Services');

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setName(itemToEdit.name);
        setExt(itemToEdit.ext);
        setCategory(itemToEdit.category);
      } else {
        setName('');
        setExt('');
        setCategory('Services');
      }
    }
  }, [isOpen, itemToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ext) return;
    
    onSave({
        id: itemToEdit?.id,
        name,
        ext,
        category
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4 sm:p-0">
      <div className="bg-glass-panel border border-glass-border sm:p-0 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl relative backdrop-blur-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        
        <div className="px-6 py-4 border-b border-glass-border bg-gradient-to-r from-blue-500/5 to-cyan-500/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    <Phone size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-main">{itemToEdit ? 'Edit Contact' : 'Add Contact'}</h2>
                    <p className="text-xs text-muted">{itemToEdit ? 'Update details' : 'Add to hospital directory'}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-glass-depth text-muted hover:text-main transition-colors">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted uppercase ml-1 flex items-center gap-1"><Building size={12}/> Name / Department</label>
                <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. ICU 2, Pharmacy"
                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                    autoFocus
                    required
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted uppercase ml-1 flex items-center gap-1"><Hash size={12}/> Extension / Number</label>
                <input 
                    value={ext}
                    onChange={(e) => setExt(e.target.value)}
                    placeholder="e.g. 5500"
                    className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                    required
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted uppercase ml-1">Category</label>
                <ModernSelect 
                    value={category}
                    onChange={setCategory}
                    options={CATEGORIES}
                />
            </div>

            <button 
                type="submit"
                disabled={!name || !ext}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
                <Save size={18} /> {itemToEdit ? 'Save Changes' : 'Add to Directory'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default DirectoryEditModal;
