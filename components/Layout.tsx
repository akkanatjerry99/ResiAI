
import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, Phone, Moon, Sun, Lock, Search, Bell, Menu, LayoutDashboard, Sparkles, LogOut, ChevronRight, Shield, X, PanelLeftClose, PanelLeftOpen, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Patient } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPresentationMode: boolean;
  togglePresentationMode: () => void;
  onLogout: () => void;
  userAvatar?: string;
  isDarkMode: boolean;
  toggleTheme: () => void;
  aiContext?: string;
  notifications?: any[];
  onNotificationClick?: (n: any) => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
  onProfileClick?: () => void;
  isAdmin?: boolean;
  onMarkAllRead?: () => void;
  contentKey?: string;
  allPatients?: Patient[];
  currentPatient?: Patient | null;
  hideSidebar?: boolean;
  onBackToHome?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  rightPanel,
  activeTab, 
  setActiveTab,
  isPresentationMode,
  togglePresentationMode,
  onLogout,
  userAvatar = "https://i.pravatar.cc/150?u=resident",
  isDarkMode,
  toggleTheme,
  aiContext,
  notifications = [], 
  onNotificationClick,
  onSearch,
  searchQuery,
  onProfileClick,
  isAdmin = false,
  onMarkAllRead,
  contentKey,
  allPatients,
  currentPatient,
  hideSidebar = false,
  onBackToHome
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-Logout / Idle Timer (5 minutes)
  useEffect(() => {
    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        onLogout();
      }, 5 * 60 * 1000); // 5 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    resetTimer(); 

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [onLogout]);

  // Click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden text-main font-sans font-thai selection:bg-medical-teal selection:text-white" style={{ background: 'var(--bg-main-grad)' }}>
       {/* Ambient Background Effects */}
       <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
                x: [0, 50, 0],
                y: [0, 30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] bg-gradient-to-br from-blue-400/20 to-indigo-400/20 dark:from-blue-600/10 dark:to-indigo-600/10" 
          />
          <motion.div 
            animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
                x: [0, -30, 0],
                y: [0, -50, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] bg-gradient-to-tl from-cyan-400/20 to-teal-400/20 dark:from-cyan-600/10 dark:to-teal-600/10" 
          />
       </div>

         {/* AI Assistant Panel removed */}

      {/* Modern Floating Sidebar - Desktop */}
      <AnimatePresence mode="wait">
      {isSidebarOpen && !hideSidebar && (
        <motion.aside 
            initial={{ x: -100, opacity: 0, width: 0, marginLeft: 0 }}
            animate={{ 
                x: 0, 
                opacity: 1, 
                width: '5.5rem',
                marginLeft: '1rem',
            }}
            exit={{ x: -100, opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="hidden md:flex flex-col items-center py-6 gap-6 bg-glass-panel/80 border border-white/20 z-[60] backdrop-blur-2xl shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative rounded-[2.5rem] my-4 h-[calc(100vh-2rem)]"
        >
            <motion.div 
                whileHover={{ scale: 1.1, rotate: 180 }}
                transition={{ duration: 0.5, type: "spring" }}
                onClick={() => setActiveTab('list')}
                className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30 cursor-pointer shrink-0 mb-4 flex items-center justify-center text-white"
                title="ResiFlow AI"
            >
                <Command className="w-6 h-6" />
            </motion.div>
            
            <nav className="flex-1 flex flex-col gap-4 w-full items-center overflow-y-auto overflow-x-hidden scrollbar-none py-2 px-2">
                <NavItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'list'} onClick={() => setActiveTab('list')} />
                <NavItem icon={<Phone />} label="Directory" active={activeTab === 'directory'} onClick={() => setActiveTab('directory')} />
                {isAdmin && (
                    <NavItem icon={<Shield />} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} color="red" />
                )}
                <NavItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </nav>

            <div className="flex flex-col gap-4 w-full items-center shrink-0 pt-4 pb-2">
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleTheme}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-glass-depth/50 hover:bg-glass-panel text-muted hover:text-main transition-colors border border-transparent hover:border-glass-border"
                    title="Toggle Theme"
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </motion.button>
                
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onLogout}
                    className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-500 transition-colors flex items-center justify-center border border-red-500/10 hover:border-red-500/30"
                    title="Logout"
                >
                    <LogOut size={18} />
                </motion.button>
            </div>
        </motion.aside>
      )}
      </AnimatePresence>

      {/* Mobile Sidebar (Drawer) */}
      <AnimatePresence>
      {mobileMenuOpen && !hideSidebar && (
        <>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] md:hidden bg-black/40 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-y-0 left-0 z-[101] w-[80%] max-w-[300px] bg-glass-panel border-r border-glass-border shadow-2xl backdrop-blur-2xl flex flex-col md:hidden"
            >
                <div className="p-6 border-b border-glass-border flex justify-between items-center">
                    <div 
                        className="flex items-center gap-3 cursor-pointer" 
                        onClick={() => { setActiveTab('list'); setMobileMenuOpen(false); }}
                    >
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md">
                            <LayoutDashboard className="text-white w-5 h-5" />
                        </div>
                        <span className="font-heading font-light text-lg text-main tracking-wide">ResiFlow</span>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="text-muted hover:text-main">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <MobileSidebarItem icon={<Users />} label="Patients" active={activeTab === 'list'} onClick={() => { setActiveTab('list'); setMobileMenuOpen(false); }} />
                    <MobileSidebarItem icon={<Phone />} label="Directory" active={activeTab === 'directory'} onClick={() => { setActiveTab('directory'); setMobileMenuOpen(false); }} />
                    {isAdmin && (
                        <MobileSidebarItem icon={<Shield />} label="Admin Console" active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }} />
                    )}
                    <MobileSidebarItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} />
                </div>

                <div className="p-4 border-t border-glass-border space-y-3 bg-glass-depth/50">
                    <button 
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-glass-panel border border-glass-border text-main font-medium"
                    >
                        <span className="flex items-center gap-2 text-sm"><Sun size={16}/> Theme</span>
                        {isDarkMode ? <Moon size={16}/> : <Sun size={16}/>}
                    </button>
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-medium"
                    >
                        <span className="flex items-center gap-2 text-sm"><LogOut size={16}/> Logout</span>
                    </button>
                </div>
            </motion.div>
        </>
      )}
      </AnimatePresence>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-full">
        
        {/* Top Header Bar */}
        <motion.header 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between bg-transparent shrink-0 relative z-40 mt-2 md:mt-4 mx-4 md:mx-0 rounded-2xl"
        >
           {/* Mobile Menu Button - Hide if sidebar hidden */}
           {!hideSidebar && (
               <button className="md:hidden p-2 text-main bg-glass-panel border border-glass-border rounded-xl mr-2 shadow-sm" onClick={() => setMobileMenuOpen(true)}>
                  <Menu size={20} />
               </button>
           )}

           {/* Desktop Sidebar Toggle - Hide if sidebar hidden */}
           {!hideSidebar && (
               <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -ml-2">
                    {!isSidebarOpen && (
                        <motion.button 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-3 bg-white dark:bg-slate-800 text-main rounded-r-xl shadow-lg border border-l-0 border-glass-border hover:pl-4 transition-all"
                            title="Show Sidebar"
                        >
                            <PanelLeftOpen size={20} />
                        </motion.button>
                    )}
               </div>
           )}

           {currentPatient ? (
               <div className="flex-1 flex items-center px-2 md:px-4 animate-in fade-in slide-in-from-left-4 overflow-hidden bg-glass-panel/80 backdrop-blur-xl border border-glass-border rounded-2xl p-2 md:mr-4 shadow-sm">
                   <div className="flex flex-col min-w-0 w-full">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-wider whitespace-nowrap mb-0.5">
                           <span 
                               className="hover:text-indigo-500 cursor-pointer transition-colors flex items-center gap-1" 
                               onClick={() => {
                                   if (onBackToHome) {
                                       onBackToHome();
                                   } else {
                                       setActiveTab('list');
                                   }
                               }}
                           >
                               <Users size={12} /> Patients
                           </span>
                           <ChevronRight size={10} />
                           <span className="bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded border border-indigo-500/20">
                               Rm {currentPatient.roomNumber}
                           </span>
                       </div>
                       <div className="text-base md:text-lg font-heading font-light text-main leading-tight truncate flex items-center gap-2">
                           <span className="truncate">{currentPatient.name}</span>
                           <span className="text-xs font-light text-muted opacity-80 shrink-0 bg-glass-depth px-1.5 rounded">{currentPatient.age}{currentPatient.gender}</span>
                       </div>
                   </div>
               </div>
           ) : (
               <div className="hidden md:flex items-center gap-3 bg-glass-panel/80 backdrop-blur-xl border border-glass-border px-4 py-3 rounded-2xl w-96 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all shadow-sm">
                  <Search size={18} className="text-muted" />
                  <input 
                    type="text"
                    value={searchQuery || ''}
                    placeholder="Search patients, HN, or room..." 
                    onChange={(e) => onSearch?.(e.target.value)}
                    className="bg-transparent border-none outline-none text-main text-sm w-full placeholder-muted/70 font-thai"
                  />
               </div>
           )}

           {/* Mobile Search (only if no patient selected) */}
           {!currentPatient && (
               <div className="md:hidden flex-1 px-2">
                    <div className="flex items-center gap-2 bg-glass-panel/90 border border-glass-border px-3 py-2.5 rounded-xl w-full shadow-sm">
                        <Search size={16} className="text-muted" />
                        <input 
                            type="text"
                            value={searchQuery || ''}
                            placeholder="Search..." 
                            onChange={(e) => onSearch?.(e.target.value)}
                            className="bg-transparent border-none outline-none text-main text-sm w-full"
                        />
                    </div>
               </div>
           )}

           <div className="flex items-center gap-2 md:gap-4 ml-2 shrink-0 bg-glass-panel/80 backdrop-blur-xl border border-glass-border rounded-2xl p-1.5 shadow-sm">
              
              {!hideSidebar && (
                  <button 
                      className="hidden md:flex p-2.5 text-muted hover:text-main hover:bg-glass-depth rounded-xl transition-all"
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                  >
                      {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                  </button>
              )}

              {!hideSidebar && <div className="w-px h-6 bg-glass-border hidden md:block"></div>}

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAssistant(!showAssistant)}
                className={`
                    p-2 md:p-2.5 rounded-xl border transition-all relative overflow-hidden group
                    ${showAssistant 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-600 border-blue-500/50 text-white shadow-lg shadow-blue-500/30' 
                        : 'bg-glass-depth border-transparent text-main hover:bg-white/50 dark:hover:bg-white/10 hover:text-blue-500'}
                `}
              >
                  <Sparkles size={20} className={showAssistant ? 'animate-pulse' : ''} />
              </motion.button>

              <div className="relative" ref={notificationRef}>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`
                        p-2 md:p-2.5 rounded-xl transition-all relative
                        ${showNotifications ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-glass-depth hover:bg-white/50 dark:hover:bg-white/10 text-main'}
                    `}
                  >
                      <Bell size={20} />
                      {notifications.length > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-white dark:ring-slate-900"></span>}
                  </motion.button>

                  <AnimatePresence>
                  {showNotifications && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-3 w-72 md:w-80 bg-white/95 dark:bg-slate-900/95 border border-glass-border rounded-2xl shadow-2xl backdrop-blur-2xl z-[100] overflow-hidden ring-1 ring-black/5 max-w-[90vw]"
                      >
                          <div className="p-4 border-b border-glass-border flex justify-between items-center bg-indigo-50/50 dark:bg-slate-800/50">
                              <h3 className="font-heading font-light text-main tracking-wide">Notifications</h3>
                              <button 
                                onClick={onMarkAllRead}
                                className="text-[10px] text-blue-500 hover:text-blue-600 font-bold"
                              >
                                Mark all read
                              </button>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto bg-slate-50 dark:bg-slate-900">
                              {notifications.length === 0 ? (
                                  <div className="p-8 text-center text-muted text-sm">No new notifications</div>
                              ) : (
                                  notifications.map(n => (
                                      <div 
                                        key={n.id} 
                                        className="p-3 border-b border-glass-border/30 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex gap-3 relative group cursor-pointer bg-white/50 dark:bg-slate-800/50"
                                        onClick={() => {
                                            onNotificationClick?.(n);
                                            setShowNotifications(false);
                                        }}
                                      >
                                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'alert' ? 'bg-red-500' : n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                          <div className="flex-1 min-w-0">
                                              <div className="text-sm font-bold text-main truncate">{n.title}</div>
                                              <div className="text-xs text-muted mt-0.5 leading-snug line-clamp-2">{n.desc}</div>
                                              <div className="text-[10px] text-muted/70 mt-1.5">{n.time}</div>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </motion.div>
                  )}
                  </AnimatePresence>
              </div>

              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative cursor-pointer group hidden sm:block ml-2"
                onClick={onProfileClick}
              >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 p-[2px]">
                     <img src={userAvatar} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-white/20" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
              </motion.div>
           </div>
        </motion.header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden relative">
            {/* Main Content - Improved Scroll Container: No forced overflow, let children decide */}
            <main className="flex-1 relative h-full flex flex-col min-w-0">
                <AnimatePresence mode='wait'>
                    <motion.div 
                        key={contentKey || activeTab} 
                        className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                       {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Right Sidebar (Desktop Only) */}
            {rightPanel && !hideSidebar && (
               <motion.aside 
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="hidden xl:flex w-80 flex-col border border-glass-border bg-glass-panel/50 backdrop-blur-xl p-6 overflow-y-auto shrink-0 gap-8 z-20 rounded-[2.5rem] my-4 mr-4 shadow-xl"
               >
                  {rightPanel}
               </motion.aside>
            )}
        </div>
      </div>

      {/* Mobile Bottom Nav (Refined) */}
      {!hideSidebar && (
          <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-glass-panel/95 backdrop-blur-2xl border border-glass-border rounded-3xl flex justify-around items-center px-4 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.15)] ring-1 ring-white/10">
            <MobileNavItem icon={<Users />} label="Patients" active={activeTab === 'list'} onClick={() => setActiveTab('list')} />
            <div className="relative -top-6">
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAssistant(true)}
                    className="p-4 rounded-full shadow-xl shadow-blue-500/30 border-2 border-white/20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white active:scale-95 transition-all"
                >
                    <Sparkles size={24} />
                </motion.button>
            </div>
            <MobileNavItem icon={<Phone />} label="Directory" active={activeTab === 'directory'} onClick={() => setActiveTab('directory')} />
          </nav>
      )}
    </div>
  );
};

// Modern Glass Nav Item (Squircle Style)
const NavItem = ({ icon, label, active, onClick, color = "blue" }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, color?: string }) => {
  return (
    <div className="relative group flex flex-col items-center">
        <button
            onClick={onClick}
            className={`
                relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300
                ${active 
                    ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-300 shadow-[0_4px_12px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/10' 
                    : 'text-muted/70 hover:text-main hover:bg-glass-depth'}
            `}
        >
            <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 22, strokeWidth: active ? 2.5 : 2 })}
            </div>
            
            {active && (
                <motion.div 
                    layoutId="active-pill-dot"
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-500"
                />
            )}
        </button>
        {/* Tooltip Label */}
        <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900/90 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 backdrop-blur-sm shadow-lg">
            {label}
            {/* Arrow */}
            <div className="absolute top-1/2 right-full -mt-1 -mr-px border-4 border-transparent border-r-gray-900/90"></div>
        </div>
    </div>
  );
};

const MobileNavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${
        active ? 'text-blue-500 scale-110 bg-blue-500/10' : 'text-muted hover:text-main'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 24, strokeWidth: active ? 2.5 : 2 })}
      {active && <span className="text-[9px] font-bold mt-0.5">{label}</span>}
    </button>
);

const MobileSidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
        active 
          ? 'bg-blue-500/10 text-blue-600 font-bold border border-blue-500/20' 
          : 'text-muted hover:bg-glass-depth hover:text-main'
      }`}
    >
        {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
        <span className="text-sm">{label}</span>
        {active && <ChevronRight size={16} className="ml-auto" />}
    </motion.button>
);

export default Layout;
