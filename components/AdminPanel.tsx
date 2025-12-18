
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { Shield, UserPlus, Search, Edit2, Trash2, CheckCircle2, XCircle, Mail, AlertTriangle, ShieldCheck, Save, Camera, Lock } from 'lucide-react';
import ModernSelect from './ui/ModernSelect';

interface AdminPanelProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Resident');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
      if (showModal) {
          if (editingUser) {
              setName(editingUser.name);
              setEmail(editingUser.email);
              setRole(editingUser.role);
              setStatus(editingUser.status);
              setAvatar(editingUser.avatar);
              setPassword(''); // Don't show existing password
          } else {
              setName('');
              setEmail('');
              setRole('Resident');
              setStatus('Active');
              setAvatar(`https://i.pravatar.cc/150?u=${Date.now()}`);
              setPassword('');
          }
      }
  }, [showModal, editingUser]);

  const handleSave = () => {
      if (!name || !email) return;
      
      if (editingUser) {
          onUpdateUser(editingUser.id, {
              name,
              email,
              role,
              status,
              avatar,
              password: password || undefined // Only update if set
          });
      } else {
          onAddUser({
              name,
              email,
              role,
              status,
              avatar,
              password,
              lastActive: 'Never'
          });
      }
      
      setShowModal(false);
      setEditingUser(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) setAvatar(ev.target.result as string);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const getRoleBadge = (role: UserRole) => {
      switch(role) {
          case 'Admin': return 'bg-red-500/10 text-red-600 border-red-500/20';
          case 'Attending': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
          case 'Resident': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
          case 'Nurse': return 'bg-green-500/10 text-green-600 border-green-500/20';
          case 'Intern': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
          case 'Medical Student': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
          case 'Pharmacist': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
          case 'Pharmacy Student': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
          case 'Staff': return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
          default: return 'bg-gray-500/10 text-gray-600';
      }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar w-full">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
      
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-main tracking-tight flex items-center gap-2">
                <ShieldCheck size={32} className="text-indigo-500"/> Admin Console
            </h1>
            <p className="text-muted">Manage team access, roles, and security permissions.</p>
        </div>

        <div className="bg-glass-panel border border-glass-border rounded-3xl p-6 shadow-sm min-h-[60vh] flex flex-col">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-80">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                      type="text" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search users..." 
                      className="w-full bg-glass-depth border border-glass-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                </div>
                <button 
                  onClick={() => { setEditingUser(null); setShowModal(true); }}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                >
                    <UserPlus size={18} /> Invite User
                </button>
            </div>

            {/* User Table */}
            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-glass-border text-xs text-muted uppercase tracking-wider">
                            <th className="p-4 font-bold">User</th>
                            <th className="p-4 font-bold">Role</th>
                            <th className="p-4 font-bold">Status</th>
                            <th className="p-4 font-bold">Last Active</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-glass-depth transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-glass-border" />
                                        <div>
                                            <div className="font-bold text-main text-sm">{user.name}</div>
                                            <div className="text-xs text-muted flex items-center gap-1"><Mail size={10}/> {user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getRoleBadge(user.role)}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-500' : user.status === 'On Leave' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                        <span className="text-xs font-medium text-main">{user.status}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-xs text-muted font-mono">
                                    {user.lastActive || 'Never'}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => { setEditingUser(user); setShowModal(true); }}
                                          className="p-2 rounded-lg bg-glass-depth border border-glass-border text-muted hover:text-indigo-500 hover:border-indigo-500/30 transition-colors"
                                          title="Edit Details"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                          onClick={() => onDeleteUser(user.id)}
                                          className="p-2 rounded-lg bg-glass-depth border border-glass-border text-muted hover:text-red-500 hover:border-red-500/30 transition-colors"
                                          title="Remove User"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-muted italic">No users found matching "{search}"</div>
                )}
            </div>
        </div>

        {/* Add/Edit User Modal */}
        {showModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-glass-panel border border-glass-border p-6 rounded-3xl w-full max-w-lg shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-main">{editingUser ? 'Edit User' : 'Add New User'}</h2>
                        <button onClick={() => setShowModal(false)}><XCircle className="text-muted hover:text-main"/></button>
                    </div>
                    
                    <div className="space-y-5">
                        {/* Avatar Upload */}
                        <div className="flex justify-center">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-glass-border shadow-md">
                                    <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={24} />
                                </div>
                                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted uppercase ml-1">Full Name</label>
                            <input 
                              value={name}
                              onChange={e => setName(e.target.value)}
                              className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/30"
                              placeholder="Dr. Name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted uppercase ml-1">Email</label>
                            <input 
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/30"
                              placeholder="doctor@hospital.com"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <ModernSelect 
                                  label="Role"
                                  value={role}
                                  onChange={(v) => setRole(v as UserRole)}
                                  options={['Resident', 'Attending', 'Nurse', 'Intern', 'Medical Student', 'Pharmacist', 'Pharmacy Student', 'Staff', 'Admin']}
                                />
                            </div>
                            <div className="space-y-1">
                                <ModernSelect 
                                  label="Status"
                                  value={status}
                                  onChange={(v) => setStatus(v as UserStatus)}
                                  options={['Active', 'On Leave', 'Inactive']}
                                />
                            </div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-glass-border">
                            <label className="text-xs font-bold text-muted uppercase ml-1 flex items-center gap-1"><Lock size={12}/> Password</label>
                            <input 
                              type="password"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="w-full bg-glass-depth border border-glass-border rounded-xl px-4 py-2.5 text-sm text-main outline-none focus:ring-2 focus:ring-indigo-500/30"
                              placeholder={editingUser ? "Reset Password (leave blank to keep)" : "Set Password"}
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-glass-border text-muted font-bold text-sm hover:bg-glass-depth">Cancel</button>
                            <button 
                              onClick={handleSave}
                              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> {editingUser ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
