
import React, { useState, useRef } from 'react';
import { Moon, Sun, Monitor, Lock, RotateCcw, Download, Shield, LayoutDashboard, UserCircle, KeyRound, Upload, CheckCircle2, Camera, Share2, Copy, Eye, EyeOff, Link } from 'lucide-react';
import { User } from '../types';

interface SettingsViewProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
  onLogout: () => void;
  onReset: () => void;
  onExport: () => void;
  onRestore: (file: File) => void;
  onChangePin: (oldPin: string, newPin: string) => Promise<boolean>;
  userProfile: { name: string, avatar: string, role: string };
  onUpdateProfile: (updates: Partial<User>) => void;
  onConfigureNightMode: (nightPin: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkMode, toggleTheme, isPresentationMode, togglePresentationMode, onLogout, onReset, onExport, onRestore, onChangePin, userProfile, onUpdateProfile, onConfigureNightMode
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Account States
  const [name, setName] = useState(userProfile.name);
  const [avatar, setAvatar] = useState(userProfile.avatar);
  const [editingProfile, setEditingProfile] = useState(false);

  // PIN States
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [changePinStatus, setChangePinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Night Mode Logic
  const [showNightConfig, setShowNightConfig] = useState(false);
  const [nightPasscode, setNightPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const handleSaveProfile = () => {
      onUpdateProfile({ name, avatar });
      setEditingProfile(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setAvatar(ev.target.result as string);
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleChangePin = async () => {
      if(!oldPin || !newPin) return;
      setChangePinStatus('loading');
      const success = await onChangePin(oldPin, newPin);
      if(success) {
          setChangePinStatus('success');
          setOldPin(''); setNewPin('');
          setTimeout(() => setChangePinStatus('idle'), 3000);
      } else {
          setChangePinStatus('error');
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          if(window.confirm("Restoring will overwrite ALL current data. Continue?")) {
              onRestore(e.target.files[0]);
          }
      }
  };

  const handleGenerateNightLink = () => {
      if (nightPasscode.length < 4) {
          alert("Passcode must be at least 4 digits.");
          return;
      }
      onConfigureNightMode(nightPasscode);
      const link = `${window.location.origin}${window.location.pathname}?login=night`;
      setGeneratedLink(link);
  };

  const copyLink = () => {
      navigator.clipboard.writeText(generatedLink);
      alert("Night Shift Link copied!");
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar w-full">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-main">Settings</h1>
            <p className="text-muted">Preferences, security, and data management.</p>
        </div>

        {/* Account Section */}
        <section className="space-y-4">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <UserCircle size={14} /> Profile & Account
            </h2>
            <div className="bg-glass-panel border border-glass-border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex flex-col items-center gap-2 relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-glass-border shadow-lg">
                            <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        {editingProfile && (
                            <>
                                <button 
                                  onClick={() => avatarInputRef.current?.click()}
                                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Camera size={24} />
                                </button>
                                <input 
                                  ref={avatarInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleAvatarChange}
                                />
                            </>
                        )}
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                        <div className="flex justify-between items-start">
                            <div>
                                {editingProfile ? (
                                    <input 
                                      value={name}
                                      onChange={e => setName(e.target.value)}
                                      className="text-xl font-bold bg-glass-depth border border-glass-border rounded px-2 py-1 text-main outline-none"
                                    />
                                ) : (
                                    <h3 className="text-xl font-bold text-main">{userProfile.name}</h3>
                                )}
                                <p className="text-sm text-muted">Resident Physician</p>
                            </div>
                            <button 
                              onClick={() => {
                                  if(editingProfile) handleSaveProfile();
                                  else setEditingProfile(true);
                              }}
                              className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20"
                            >
                                {editingProfile ? 'Save Changes' : 'Edit Profile'}
                            </button>
                        </div>

                        <div className="border-t border-glass-border pt-4">
                            <h4 className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-2"><KeyRound size={12}/> Change Security PIN</h4>
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1 w-full space-y-1">
                                    <label className="text-[10px] text-muted font-bold">Current PIN</label>
                                    <input 
                                      type="password"
                                      value={oldPin}
                                      onChange={e => setOldPin(e.target.value)}
                                      className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm"
                                      placeholder="Old PIN"
                                    />
                                </div>
                                <div className="flex-1 w-full space-y-1">
                                    <label className="text-[10px] text-muted font-bold">New PIN</label>
                                    <input 
                                      type="password"
                                      value={newPin}
                                      onChange={e => setNewPin(e.target.value)}
                                      className="w-full bg-glass-depth border border-glass-border rounded-xl px-3 py-2 text-sm"
                                      placeholder="New PIN"
                                    />
                                </div>
                                <button 
                                  onClick={handleChangePin}
                                  disabled={changePinStatus === 'loading' || !oldPin || !newPin}
                                  className="px-4 py-2 bg-glass-depth border border-glass-border hover:bg-glass-panel text-main rounded-xl font-bold text-xs h-10 w-full sm:w-auto"
                                >
                                    {changePinStatus === 'loading' ? 'Updating...' : 'Update PIN'}
                                </button>
                            </div>
                            {changePinStatus === 'success' && <div className="text-xs text-green-500 mt-2 flex items-center gap-1"><CheckCircle2 size={12}/> PIN Updated Successfully</div>}
                            {changePinStatus === 'error' && <div className="text-xs text-red-500 mt-2">Failed to update PIN. Verify old PIN.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Admin Night Shift Access */}
        {userProfile.role === 'Admin' && (
            <section className="space-y-4">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                    <Share2 size={14} /> Night Shift Access Control
                </h2>
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/30 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2"><Moon size={20} className="text-indigo-400"/> Night Mode Configuration</h3>
                            <p className="text-indigo-200/80 text-sm mt-1 max-w-lg">
                                Generate a restricted access link and a separate passcode for the night float team. 
                                This allows secure access to the Night Dashboard without sharing your master Admin PIN.
                            </p>
                        </div>
                        <button 
                          onClick={() => setShowNightConfig(!showNightConfig)}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm border border-white/20 transition-all whitespace-nowrap flex items-center gap-2"
                        >
                            <KeyRound size={16}/> {showNightConfig ? 'Close Config' : 'Configure Access'}
                        </button>
                    </div>

                    {showNightConfig && (
                        <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-top-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Set Night Passcode</label>
                                        <div className="relative">
                                            <input 
                                              type={showPasscode ? "text" : "password"}
                                              value={nightPasscode}
                                              onChange={(e) => setNightPasscode(e.target.value)}
                                              placeholder="Enter 4-6 digit code"
                                              className="w-full bg-black/30 border border-indigo-500/30 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-indigo-400 font-mono tracking-widest"
                                            />
                                            <button 
                                              onClick={() => setShowPasscode(!showPasscode)}
                                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                                            >
                                                {showPasscode ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-indigo-300/60">This passcode will decrypt the database for the night team.</p>
                                    </div>
                                    <button 
                                      onClick={handleGenerateNightLink}
                                      className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Link size={16}/> Generate Secure Link
                                    </button>
                                </div>

                                <div className="bg-black/30 rounded-xl border border-white/10 p-4 flex flex-col justify-center">
                                    {generatedLink ? (
                                        <div className="space-y-3 animate-in zoom-in-95">
                                            <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase">
                                                <CheckCircle2 size={14}/> Link Active
                                            </div>
                                            <div className="bg-black/40 rounded-lg p-3 break-all text-xs font-mono text-indigo-200 border border-white/5">
                                                {generatedLink}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={copyLink} className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                                                    <Copy size={14}/> Copy Link
                                                </button>
                                                <div className="px-3 py-2 bg-indigo-500/20 rounded-lg text-xs font-bold text-indigo-300 border border-indigo-500/20 text-center">
                                                    Passcode: <span className="text-white ml-1 font-mono">{nightPasscode}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-indigo-200/40 text-sm">
                                            Set a passcode and click generate to create a shareable access link.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        )}

        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <LayoutDashboard size={14} /> Appearance & Interface
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dark Mode */}
              <div className="p-5 rounded-2xl bg-glass-panel border border-glass-border flex items-center justify-between hover:bg-glass-depth transition-colors shadow-sm">
                  <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {isDarkMode ? <Moon size={24}/> : <Sun size={24}/>}
                      </div>
                      <div>
                          <div className="font-bold text-main text-lg">Theme Mode</div>
                          <div className="text-sm text-muted">{isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'}</div>
                      </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme} />
                      <div className="w-14 h-8 bg-glass-depth border border-glass-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
              </div>

              {/* Presentation Mode */}
              <div className="p-5 rounded-2xl bg-glass-panel border border-glass-border flex items-center justify-between hover:bg-glass-depth transition-colors shadow-sm">
                  <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
                          <Monitor size={24}/>
                      </div>
                      <div>
                          <div className="font-bold text-main text-lg">Presentation Mode</div>
                          <div className="text-sm text-muted">Optimize for rounding / projection</div>
                      </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isPresentationMode} onChange={togglePresentationMode} />
                      <div className="w-14 h-8 bg-glass-depth border border-glass-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
              </div>
          </div>
        </section>

        {/* Security */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <Shield size={14} /> Security & Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <button onClick={onLogout} className="p-6 rounded-2xl bg-glass-panel border border-glass-border hover:bg-glass-depth transition-all text-left group shadow-sm hover:shadow-md">
                   <Lock size={28} className="text-main mb-4 group-hover:text-red-500 transition-colors bg-glass-depth p-1.5 rounded-lg border border-glass-border"/>
                   <div className="font-bold text-main text-lg">Lock Database</div>
                   <div className="text-xs text-muted mt-1">Log out and encrypt session</div>
               </button>

               <button onClick={onExport} className="p-6 rounded-2xl bg-glass-panel border border-glass-border hover:bg-glass-depth transition-all text-left group shadow-sm hover:shadow-md">
                  <Download size={28} className="text-main mb-4 group-hover:text-blue-500 transition-colors bg-glass-depth p-1.5 rounded-lg border border-glass-border"/>
                  <div className="font-bold text-main text-lg">Export Backup</div>
                  <div className="text-xs text-muted mt-1">Download encrypted JSON</div>
               </button>

               <button onClick={() => fileInputRef.current?.click()} className="p-6 rounded-2xl bg-glass-panel border border-glass-border hover:bg-glass-depth transition-all text-left group shadow-sm hover:shadow-md relative">
                  <Upload size={28} className="text-main mb-4 group-hover:text-green-500 transition-colors bg-glass-depth p-1.5 rounded-lg border border-glass-border"/>
                  <div className="font-bold text-main text-lg">Restore Data</div>
                  <div className="text-xs text-muted mt-1">Import JSON backup</div>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
               </button>

               <button onClick={onReset} className="p-6 rounded-2xl bg-glass-panel border border-glass-border hover:bg-red-500/5 transition-all text-left group shadow-sm hover:shadow-md">
                   <RotateCcw size={28} className="text-main mb-4 group-hover:text-red-500 transition-colors bg-glass-depth p-1.5 rounded-lg border border-glass-border"/>
                   <div className="font-bold text-main group-hover:text-red-500 transition-colors text-lg">Factory Reset</div>
                   <div className="text-xs text-muted mt-1">Wipe all local data</div>
               </button>
          </div>
        </section>
        
        {/* System Info */}
        <section className="space-y-4">
           <div className="p-6 rounded-2xl bg-glass-panel border border-glass-border shadow-sm">
               <div className="flex items-center gap-3 mb-4">
                   <Shield size={20} className="text-green-500"/>
                   <h3 className="font-bold text-main">System Status</h3>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-muted">
                   <div className="p-2 bg-glass-depth rounded-lg border border-glass-border">
                       <div className="uppercase tracking-wider opacity-50 mb-1">Encryption</div>
                       <div className="text-main font-bold">AES-256-GCM</div>
                   </div>
                   <div className="p-2 bg-glass-depth rounded-lg border border-glass-border">
                       <div className="uppercase tracking-wider opacity-50 mb-1">Storage</div>
                       <div className="text-main font-bold">IndexedDB</div>
                   </div>
                   <div className="p-2 bg-glass-depth rounded-lg border border-glass-border">
                       <div className="uppercase tracking-wider opacity-50 mb-1">Version</div>
                       <div className="text-main font-bold">v3.1.0</div>
                   </div>
                   <div className="p-2 bg-glass-depth rounded-lg border border-glass-border">
                       <div className="uppercase tracking-wider opacity-50 mb-1">Status</div>
                       <div className="text-green-500 font-bold flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Secure</div>
                   </div>
               </div>
           </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
