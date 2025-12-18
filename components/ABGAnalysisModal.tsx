
import React, { useState, useEffect } from 'react';
import { X, Activity, BrainCircuit, Loader2, Calculator, AlertTriangle, ArrowRight, CheckCircle2, Sparkles, Clock } from 'lucide-react';
import { generateABGInterpretation } from '../services/geminiService';

interface ABGAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues?: { pH?: string, pCO2?: string, HCO3?: string, pO2?: string, Lactate?: string, Na?: string, Cl?: string, Albumin?: string };
}

const ABGAnalysisModal: React.FC<ABGAnalysisModalProps> = ({ isOpen, onClose, initialValues }) => {
  const [values, setValues] = useState({
    pH: '',
    pCO2: '',
    HCO3: '',
    pO2: '',
    Lactate: '',
    Na: '',
    Cl: '',
    Albumin: ''
  });
  
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [chronicity, setChronicity] = useState<'Acute' | 'Chronic'>('Acute');
  
  // Real-time Calculation State
  const [calcResult, setCalcResult] = useState<{
      primary: string;
      compensation: string;
      anionGap: number | null;
      correctedGap: number | null;
      deltaRatio: number | null;
      gapImpression: string;
  } | null>(null);

  useEffect(() => {
      if (isOpen) {
          if (initialValues) {
              setValues(prev => ({ ...prev, ...initialValues }));
          } else {
              setValues({ pH: '', pCO2: '', HCO3: '', pO2: '', Lactate: '', Na: '', Cl: '', Albumin: '' });
          }
          setAnalysis('');
          setCalcResult(null);
          setChronicity('Acute'); // Default
      }
  }, [isOpen, initialValues]);

  // Auto-calculate on value change
  useEffect(() => {
      calculateABG();
  }, [values, chronicity]);

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const calculateABG = () => {
      const pH = parseFloat(values.pH);
      const pCO2 = parseFloat(values.pCO2);
      const HCO3 = parseFloat(values.HCO3);
      const Na = parseFloat(values.Na);
      const Cl = parseFloat(values.Cl);
      const Alb = parseFloat(values.Albumin);
      
      if (isNaN(pH) || isNaN(pCO2) || isNaN(HCO3)) {
          setCalcResult(null);
          return;
      }

      let primary = '';
      let compensation = '';
      let anionGap: number | null = null;
      let correctedGap: number | null = null;
      let deltaRatio: number | null = null;
      let gapImpression = '';

      // 1. Primary Disorder
      if (pH < 7.35) {
          if (pCO2 > 45) primary = 'Respiratory Acidosis';
          else if (HCO3 < 22) primary = 'Metabolic Acidosis';
          else primary = 'Acidemia (Mixed/Uncompensated)';
      } else if (pH > 7.45) {
          if (pCO2 < 35) primary = 'Respiratory Alkalosis';
          else if (HCO3 > 26) primary = 'Metabolic Alkalosis';
          else primary = 'Alkalemia (Mixed/Uncompensated)';
      } else {
          primary = 'Normal pH (Compensated or Normal)';
      }

      // 2. Compensation & Rules
      if (primary === 'Metabolic Acidosis') {
          // Winter's Formula: Expected pCO2 = (1.5 * HCO3) + 8 +/- 2
          const expectedPCO2 = (1.5 * HCO3) + 8;
          if (pCO2 >= expectedPCO2 - 2 && pCO2 <= expectedPCO2 + 2) compensation = `Compensated (Winters: pCO2 ${expectedPCO2.toFixed(1)}±2)`;
          else if (pCO2 < expectedPCO2 - 2) compensation = `Partially Compensated + Concomitant Resp Alkalosis (pCO2 < ${expectedPCO2.toFixed(1)})`;
          else compensation = `Partially Compensated + Concomitant Resp Acidosis (pCO2 > ${(expectedPCO2 + 2).toFixed(1)})`;
      } 
      else if (primary === 'Metabolic Alkalosis') {
          // Expected pCO2 = 0.7 * (HCO3 - 24) + 40 +/- 2
          const expectedPCO2 = (0.7 * (HCO3 - 24)) + 40;
          if (pCO2 >= expectedPCO2 - 2 && pCO2 <= expectedPCO2 + 2) compensation = 'Compensated';
          else compensation = 'Uncompensated / Mixed';
      }
      else if (primary.includes('Respiratory')) {
          const pCO2Diff = Math.abs(pCO2 - 40);
          let expectedHCO3Change = 0;
          let expectedHCO3 = 24;

          if (primary.includes('Acidosis')) {
             // pCO2 > 40
             if (chronicity === 'Acute') {
                 // For every 10 mmHg pCO2 increases, HCO3 increases by 1
                 expectedHCO3Change = (pCO2Diff / 10) * 1; 
             } else {
                 // For every 10 mmHg pCO2 increases, HCO3 increases by 4
                 expectedHCO3Change = (pCO2Diff / 10) * 4;
             }
             expectedHCO3 = 24 + expectedHCO3Change;
          } else {
             // Alkalosis, pCO2 < 40
             if (chronicity === 'Acute') {
                 // For every 10 mmHg pCO2 decreases, HCO3 decreases by 2
                 expectedHCO3Change = (pCO2Diff / 10) * 2;
             } else {
                 // For every 10 mmHg pCO2 decreases, HCO3 decreases by 4 (range 4-5)
                 expectedHCO3Change = (pCO2Diff / 10) * 4; 
             }
             expectedHCO3 = 24 - expectedHCO3Change;
          }
          
          if (HCO3 >= expectedHCO3 - 2 && HCO3 <= expectedHCO3 + 2) {
              compensation = `Compensated (${chronicity})`;
          } else {
              compensation = `Uncompensated / Mixed (${chronicity})`;
          }
          // Append expected value for clarity
          compensation += ` (Exp HCO3 ~${expectedHCO3.toFixed(1)})`;
      }

      // 3. Anion Gap Calculation
      if (!isNaN(Na) && !isNaN(Cl) && !isNaN(HCO3)) {
          anionGap = Na - (Cl + HCO3);
          
          // Albumin Correction
          // Corrected AG = Observed AG + 2.5 * (4 - Albumin)
          if (!isNaN(Alb)) {
              correctedGap = anionGap + 2.5 * (4.0 - Alb);
          }

          const activeGap = correctedGap !== null ? correctedGap : anionGap;
          
          if (activeGap > 12) {
              gapImpression = 'High Anion Gap';
              // Delta Ratio = (AG - 12) / (24 - HCO3)
              // Only valid if HCO3 < 24
              if (HCO3 < 24) {
                  deltaRatio = (activeGap - 12) / (24 - HCO3);
                  if (deltaRatio < 0.4) gapImpression += ' + Hyperchloremic Normal AG Acidosis';
                  else if (deltaRatio > 0.4 && deltaRatio < 0.8) gapImpression += ' + Normal AG Acidosis';
                  else if (deltaRatio > 1 && deltaRatio < 2) gapImpression += ' (Pure HAGMA)';
                  else if (deltaRatio > 2) gapImpression += ' + Metabolic Alkalosis';
              }
          } else {
              gapImpression = 'Normal Anion Gap';
          }
      }

      setCalcResult({ primary, compensation, anionGap, correctedGap, deltaRatio, gapImpression });
  };

  const handleAnalyze = async () => {
    setLoading(true);
    // Include calculated metrics in context for AI
    const enrichedData = {
        ...values,
        ...calcResult,
        chronicity,
        note: "Please provide clinical synthesis, potential causes (differential diagnosis), and treatment suggestions based on these values."
    };
    
    // Convert numbers to strings for API compatibility
    const stringifiedData: Record<string, string> = {};
    Object.entries(enrichedData).forEach(([k, v]) => stringifiedData[k] = String(v));

    const result = await generateABGInterpretation(stringifiedData);
    setAnalysis(result);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-2xl shadow-2xl relative backdrop-blur-xl flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-500/10 text-pink-500 rounded-xl border border-pink-500/20">
                    <Activity size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-main">Blood Gas Analyzer</h2>
                    <p className="text-xs text-muted">Guideline-Compliant Calculator (Winter's, Delta, Albumin)</p>
                </div>
            </div>
            <button onClick={onClose}><X size={20} className="text-muted hover:text-main"/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* Input Section */}
            <div className="bg-glass-depth rounded-2xl p-4 border border-glass-border">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-muted uppercase flex items-center gap-2"><Calculator size={14}/> Measured Values</h3>
                    
                    {/* Acute / Chronic Toggle */}
                    <div className="flex bg-glass-panel rounded-lg p-0.5 border border-glass-border">
                        <button 
                            onClick={() => setChronicity('Acute')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chronicity === 'Acute' ? 'bg-pink-500 text-white shadow-sm' : 'text-muted hover:text-main'}`}
                        >
                            Acute
                        </button>
                        <button 
                            onClick={() => setChronicity('Chronic')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${chronicity === 'Chronic' ? 'bg-pink-500 text-white shadow-sm' : 'text-muted hover:text-main'}`}
                        >
                            Chronic
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['pH', 'pCO2', 'HCO3', 'pO2', 'Na', 'Cl', 'Lactate', 'Albumin'].map(field => (
                        <div key={field} className="space-y-1">
                            <label className="text-[10px] font-bold text-muted uppercase ml-1">{field}</label>
                            <input 
                                type="number"
                                value={values[field as keyof typeof values]}
                                onChange={e => handleChange(field, e.target.value)}
                                placeholder="--"
                                className="w-full bg-glass-panel border border-glass-border rounded-xl px-2 py-2 text-sm text-center font-bold text-main focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Live Calculation Results */}
            {calcResult && (
                <div className="bg-gradient-to-br from-pink-500/5 to-purple-500/5 rounded-2xl p-4 border border-pink-500/10 animate-in fade-in">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-2">
                            <BrainCircuit size={14}/> Step-by-Step Analysis
                        </h3>
                        <div className="text-[10px] bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            <Clock size={10} /> {chronicity} Rules
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-pink-500/10">
                            <div className="text-[10px] text-muted uppercase mb-1">Primary Disorder</div>
                            <div className="text-lg font-bold text-main leading-tight">{calcResult.primary}</div>
                            {calcResult.compensation && <div className="text-xs text-pink-600 mt-1 font-medium">{calcResult.compensation}</div>}
                        </div>

                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-pink-500/10">
                            <div className="text-[10px] text-muted uppercase mb-1">Anion Gap</div>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-lg font-bold text-main">
                                    {calcResult.correctedGap !== null ? calcResult.correctedGap.toFixed(1) : (calcResult.anionGap !== null ? calcResult.anionGap.toFixed(1) : 'N/A')}
                                </span>
                                {calcResult.correctedGap !== null && (
                                    <span className="text-[9px] text-muted font-normal">(Albumin Corrected)</span>
                                )}
                                {calcResult.anionGap !== null && (
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${(calcResult.correctedGap || calcResult.anionGap!) > 12 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {(calcResult.correctedGap || calcResult.anionGap!) > 12 ? 'High Gap' : 'Normal Gap'}
                                    </span>
                                )}
                            </div>
                            {calcResult.deltaRatio !== null && (
                                <div className="text-xs text-muted mt-1">
                                    Delta Ratio: <strong className="text-main">{calcResult.deltaRatio.toFixed(2)}</strong>
                                    <div className="text-[10px] opacity-80 mt-0.5 leading-tight">{calcResult.gapImpression}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Synthesis Section */}
            <button 
                onClick={handleAnalyze}
                disabled={loading || !values.pH}
                className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} />}
                Generate Clinical Synthesis (AI)
            </button>

            {analysis && (
                <div className="mt-4 p-4 rounded-2xl bg-glass-depth border border-glass-border animate-in slide-in-from-bottom-2">
                    <h3 className="text-sm font-bold text-pink-600 dark:text-pink-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={14}/> AI Interpretation
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-main leading-relaxed whitespace-pre-wrap text-sm">
                        {analysis}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ABGAnalysisModal;
