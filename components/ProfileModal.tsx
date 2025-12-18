
import React, { useState, useEffect } from 'react';
import { X, Camera, Mail, Shield, User, LogOut, Edit2, Save, Check, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateProfile: (updates: Partial<UserType>) => void;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdateProfile, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setEmail(user.email);
      setAvatar(user.avatar);
      setIsEditing(false);
      setIsSaving(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setAvatar(ev.target.result as string);
          // If not in full edit mode, update avatar immediately
          if (!isEditing) {
             onUpdateProfile({ avatar: ev.target.result as string });
          }
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSave = () => {
      setIsSaving(true);
      // Simulate network request
      setTimeout(() => {
          onUpdateProfile({ name, email, avatar });
          setIsEditing(false);
          setIsSaving(false);
      }, 600);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-sm shadow-2xl relative backdrop-blur-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-main">
          <X size={20} />
        </button>

        <div className="absolute top-4 left-4">
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-indigo-500 text-white' : 'text-muted hover:bg-glass-depth hover:text-main'}`}
                title="Edit Profile"
                disabled={isSaving}
            >
                {isEditing ? <Check size={18} onClick={handleSave} /> : <Edit2 size={18} />}
            </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative group mb-4">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 shadow-lg transition-colors ${isEditing ? 'border-indigo-500' : 'border-glass-border'}`}>
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <label className={`absolute inset-0 flex items-center justify-center bg-black/40 rounded-full text-white cursor-pointer transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <Camera size={24} />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isSaving} />
            </label>
          </div>

          {isEditing ? (
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold text-main bg-glass-depth border border-glass-border rounded-lg px-2 py-1 text-center mb-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Name"
                disabled={isSaving}
              />
          ) : (
              <h2 className="text-xl font-bold text-main">{name}</h2>
          )}
          
          <span className="text-xs bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-full font-bold border border-indigo-500/20 mt-2">
            {user.role}
          </span>

          <div className="w-full mt-6 space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isEditing ? 'bg-glass-depth border-indigo-500/30' : 'bg-glass-depth border-glass-border'}`}>
              <Mail size={16} className={isEditing ? 'text-indigo-500' : 'text-muted'} />
              <div className="flex-1 overflow-hidden">
                <div className="text-[10px] text-muted uppercase font-bold">Email</div>
                {isEditing ? (
                    <input 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="text-sm text-main bg-transparent rounded px-0 w-full outline-none"
                        placeholder="email@hospital.com"
                        disabled={isSaving}
                    />
                ) : (
                    <div className="text-sm text-main truncate">{email}</div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl bg-glass-depth border border-glass-border">
              <Shield size={16} className="text-green-500" />
              <div className="flex-1">
                <div className="text-[10px] text-muted uppercase font-bold">Account Status</div>
                <div className="text-sm text-main">Active & Secure</div>
              </div>
            </div>
          </div>

          <div className="w-full mt-6 flex gap-3">
             {isEditing ? (
                 <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
                 >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                 </button>
             ) : (
                 <>
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-glass-border text-muted hover:text-main text-sm font-bold transition-colors hover:bg-glass-depth">
                        Close
                    </button>
                    <button onClick={onLogout} className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-bold transition-colors flex items-center justify-center gap-2">
                        <LogOut size={16} /> Logout
                    </button>
                 </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
