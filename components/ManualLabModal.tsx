
import React, { useState, useEffect } from 'react';
import { RawLabResult, SubLabResult } from '../types';
import { X, Save, TestTube, Plus, Trash2, ListTree, GripVertical } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface ManualLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (result: RawLabResult) => void;
}

const COMMON_LABS = [
    'Creatinine', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate', 'BUN',
    'WBC', 'Hemoglobin', 'Hematocrit', 'Platelet',
    'AST', 'ALT', 'ALP', 'Total Bilirubin', 'Direct Bilirubin', 'Albumin',
    'Calcium', 'Magnesium', 'Phosphorus',
    'INR', 'PT', 'PTT',
    'Lactate', 'Procalcitonin', 'CRP',
    'PCR TB', 'Lupus Anticoagulant', 'Dengue NS1', 'Influenza A/B', 'Covid-19 PCR'
];

const ManualLabModal: React.FC<ManualLabModalProps> = ({ isOpen, onClose, onSave }) => {
  const [testName, setTestName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  
  // Complex Lab State
  const [isPanel, setIsPanel] = useState(false);
  const [subResults, setSubResults] = useState<SubLabResult[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubValue, setNewSubValue] = useState('');
  const [newSubUnit, setNewSubUnit] = useState('');

  // Reset
  useEffect(() => {
      if (isOpen) {
          setTestName('');
          setValue('');
          setUnit('');
          setDate(new Date().toISOString().split('T')[0]);
          setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
          setIsPanel(false);
          setSubResults([]);
          setNewSubName('');
          setNewSubValue('');
          setNewSubUnit('');
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSubResult = () => {
      if (!newSubName || !newSubValue) return;
      setSubResults([...subResults, { name: newSubName, value: newSubValue, unit: newSubUnit }]);
      setNewSubName('');
      setNewSubValue('');
      setNewSubUnit('');
  };

  const removeSubResult = (index: number) => {
      setSubResults(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
      if (!testName) return;
      if (!isPanel && !value) return;
      
      const dateTime = `${date}T${time}:00`;
      
      // Try to parse numeric if possible, else keep as string
      let finalValue: number | string = value;
      const numVal = parseFloat(value);
      // Check valid number and not empty string
      if (!isNaN(numVal) && value.trim() !== '' && !isNaN(Number(value))) {
          finalValue = numVal;
      }

      onSave({
          testName,
          value: isPanel ? (value || 'See Details') : finalValue,
          unit: isPanel ? '' : unit,
          dateTime,
          subResults: isPanel ? subResults : undefined
      });
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-md shadow-2xl relative backdrop-blur-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <TestTube size={20} />
                    <span>Add Lab Result</span>
                </div>
                <button onClick={onClose}><X size={20} className="text-muted hover:text-main"/></button>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-muted uppercase ml-1">Test Name</label>
                    <ModernSelect 
                        value={testName}
                        onChange={setTestName}
                        options={COMMON_LABS}
                        searchable
                        placeholder="Select or type..."
                        allowCustom
                    />
                </div>

                {/* Type Toggle */}
                <div className="flex bg-glass-depth p-1 rounded-xl border border-glass-border">
                    <button
                        onClick={() => setIsPanel(false)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isPanel ? 'bg-white shadow-sm text-blue-600 dark:bg-slate-700 dark:text-white' : 'text-muted hover:text-main'}`}
                    >
                        Single Value
                    </button>
                    <button
                        onClick={() => setIsPanel(true)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isPanel ? 'bg-white shadow-sm text-blue-600 dark:bg-slate-700 dark:text-white' : 'text-muted hover:text-main'}`}
                    >
                        <ListTree size={14}/> Complex / Panel
                    </button>
                </div>

                {!isPanel ? (
                    <div className="flex gap-3 animate-in slide-in-from-left-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-muted uppercase ml-1">Value / Result</label>
                            <input 
                                type="text"
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-main font-bold outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-muted/50"
                                placeholder="1.2 or Negative"
                            />
                        </div>
                        <div className="w-1/3 space-y-1">
                            <label className="text-xs font-bold text-muted uppercase ml-1">Unit</label>
                            <input 
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                                className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2.5 text-main text-sm outline-none"
                                placeholder="mg/dL"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 animate-in slide-in-from-right-2">
                        <div className="bg-glass-depth p-3 rounded-xl border border-glass-border space-y-2">
                            <div className="text-[10px] font-bold text-muted uppercase ml-1">Add Sub-Result</div>
                            <div className="grid grid-cols-2 gap-2">
                                <input 
                                    value={newSubName} onChange={e => setNewSubName(e.target.value)}
                                    placeholder="Sub-test Name (e.g. Screen)"
                                    className="w-full bg-glass-panel border-none rounded-lg px-2 py-1.5 text-xs text-main outline-none"
                                />
                                <div className="flex gap-2">
                                    <input 
                                        value={newSubValue} onChange={e => setNewSubValue(e.target.value)}
                                        placeholder="Value/Result"
                                        className="flex-1 bg-glass-panel border-none rounded-lg px-2 py-1.5 text-xs text-main outline-none font-bold"
                                    />
                                    <button 
                                        onClick={handleAddSubResult}
                                        disabled={!newSubName || !newSubValue}
                                        className="p-1.5 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                                    >
                                        <Plus size={16}/>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-1">
                            {subResults.length === 0 && <div className="text-center text-xs text-muted italic py-2">No sub-results added</div>}
                            {subResults.map((sub, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-glass-panel border border-glass-border text-xs group">
                                    <div className="flex items-center gap-2">
                                        <GripVertical size={12} className="text-muted/50 cursor-move"/>
                                        <div>
                                            <div className="font-bold text-main">{sub.name}</div>
                                            <div className="text-muted flex gap-1">
                                                <span className="font-bold text-blue-600 dark:text-blue-400">{sub.value}</span> 
                                                {sub.unit && <span>{sub.unit}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeSubResult(idx)} className="text-muted hover:text-red-500 p-1">
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-glass-border">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">Date</label>
                        <input 
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">Time</label>
                        <input 
                            type="time"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm text-main outline-none"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={!testName || (!isPanel && !value)}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                    <Save size={18} /> Save Result
                </button>
            </div>
        </div>
    </div>
  );
};

export default ManualLabModal;
