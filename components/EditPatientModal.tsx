
import React, { useState, useEffect } from 'react';
import { Patient, Acuity, Isolation } from '../types';
import { Calendar, Activity, ShieldAlert } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onSave: (patient: Patient) => void;
}

const EditPatientModal: React.FC<EditPatientModalProps> = ({ isOpen, onClose, patient, onSave }) => {
    const [name, setName] = useState(patient.name);
    const [hn, setHn] = useState(patient.hn || '');
    const [room, setRoom] = useState(patient.roomNumber);
    const [age, setAge] = useState(patient.age);
    const [weight, setWeight] = useState(patient.weight || '');
    const [admissionDate, setAdmissionDate] = useState(patient.admissionDate);
    const [acuity, setAcuity] = useState<Acuity>(patient.acuity);
    const [isolation, setIsolation] = useState<Isolation>(patient.isolation);

    useEffect(() => {
        if (isOpen) {
            setName(patient.name);
            setHn(patient.hn || '');
            setRoom(patient.roomNumber);
            setAge(patient.age);
            setWeight(patient.weight || '');
            setAdmissionDate(patient.admissionDate);
            setAcuity(patient.acuity);
            setIsolation(patient.isolation);
        }
    }, [isOpen, patient]);
    
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-sm shadow-2xl relative backdrop-blur-xl flex flex-col">
                <h3 className="text-xl font-bold text-main mb-6">Edit Patient Details</h3>
                
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1">Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30 font-bold"/>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted uppercase ml-1">HN</label>
                            <input value={hn} onChange={e => setHn(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted uppercase ml-1">Room</label>
                            <input value={room} onChange={e => setRoom(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted uppercase ml-1">Age</label>
                            <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted uppercase ml-1">Weight (kg)</label>
                            <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"/>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <ModernSelect
                                label="Acuity"
                                icon={<Activity size={14}/>}
                                value={acuity}
                                onChange={(v) => setAcuity(v as Acuity)}
                                options={[Acuity.STABLE, Acuity.WATCH, Acuity.UNSTABLE]}
                            />
                        </div>
                        <div className="space-y-1">
                            <ModernSelect
                                label="Isolation"
                                icon={<ShieldAlert size={14}/>}
                                value={isolation}
                                onChange={(v) => setIsolation(v as Isolation)}
                                options={[Isolation.NONE, Isolation.CONTACT, Isolation.DROPLET, Isolation.AIRBORNE]}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted uppercase ml-1 flex items-center gap-1"><Calendar size={12}/> Admission Date</label>
                        <input type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-blue-500/30"/>
                    </div>
                </div>

                <div className="flex gap-3 mt-8 pt-4 border-t border-glass-border">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-glass-border text-muted font-bold text-sm hover:bg-glass-depth transition-colors">Cancel</button>
                    <button onClick={() => { onSave({ ...patient, name, hn, roomNumber: room, age, weight: Number(weight), admissionDate, acuity, isolation }); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default EditPatientModal;
