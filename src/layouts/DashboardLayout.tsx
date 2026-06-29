import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCentre } from '../contexts/CentreContext';
import { dbService, subscribeToPushNotifications } from '../services/firebase';
import { NotificationItem } from '../types';
import {
  LayoutDashboard, Users, CalendarCheck, Clock, Megaphone,
  BarChart3, Settings, LogOut, Menu, X, Bell, Check,
  ShieldCheck, User, Activity, HeartHandshake, AlertOctagon,
  CreditCard, UserCog, Calendar, AlertTriangle, Star, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff', 'parent'] },
    ]
  },
  {
    label: 'Children',
    items: [
      { id: 'children',    label: 'Children',    icon: Users,        roles: ['admin', 'staff'] },
      { id: 'attendance',  label: 'Attendance',  icon: CalendarCheck, roles: ['admin', 'staff'] },
      { id: 'updates',     label: 'Daily Logs',  icon: Clock,        roles: ['admin', 'staff'] },
      { id: 'incidents',   label: 'Incidents',   icon: AlertTriangle, roles: ['admin', 'staff', 'parent'] },
    ]
  },
  {
    label: 'Finance & People',
    items: [
      { id: 'fees',    label: 'Fees & Billing', icon: CreditCard, roles: ['admin'] },
      { id: 'staff',   label: 'Staff',          icon: UserCog,    roles: ['admin'] },
    ]
  },
  {
    label: 'Engage',
    items: [
      { id: 'events',        label: 'Events',        icon: Star,      roles: ['admin', 'staff', 'parent'] },
      { id: 'calendar',      label: 'Calendar',      icon: Calendar,  roles: ['admin', 'staff', 'parent'] },
      { id: 'notifications', label: 'Announcements', icon: Megaphone, roles: ['admin', 'staff'] },
    ]
  },
  {
    label: 'Admin',
    items: [
      { id: 'reports',  label: 'Reports',  icon: BarChart3, roles: ['admin'] },
      { id: 'settings', label: 'Settings', icon: Settings,  roles: ['admin', 'staff', 'parent'] },
    ]
  },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, logout, isAdmin } = useAuth();
  const { centre } = useCentre();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<(NotificationItem & { read: boolean; unreadId: string })[]>([]);
  const [showBell, setShowBell] = useState(false);
  const [popupAnnouncements, setPopupAnnouncements] = useState<NotificationItem[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const fetchNotifications = async () => {
      if (currentUser.role === 'parent') {
        const nots = await dbService.getUserNotifications(currentUser.uid);
        setNotifications(nots);
        const unreadPopups = nots.filter(n => !n.read && (n.type === 'General' || n.type === 'Emergency' || n.type === 'Payment'));
        if (unreadPopups.length > 0) {
          setPopupAnnouncements(unreadPopups);
          const seen = sessionStorage.getItem(`pt_popup_shown_${currentUser.uid}`);
          if (!seen) { setShowPopup(true); sessionStorage.setItem(`pt_popup_shown_${currentUser.uid}`, 'true'); }
        }
      } else {
        const allNots = await dbService.getNotifications();
        const recent = allNots
          .filter(n => n.status === 'Published')
          .filter(n => n.type !== 'ChildSpecific' && n.targetAudience !== 'Selected Child')
          .filter(n => n.createdBy !== currentUser.uid)
          .map(n => ({ ...n, read: sessionStorage.getItem(`admin_read_${n.id}`) === 'true', unreadId: n.id }));
        setNotifications(recent);
      }
    };
    fetchNotifications();
    const u1 = dbService.subscribe('user_notifications', fetchNotifications);
    const u2 = dbService.subscribe('notifications', fetchNotifications);
    const u3 = subscribeToPushNotifications((title, message) => {
      setToast({ title, message });
      fetchNotifications();
      setTimeout(() => setToast(null), 4000);
    });
    return () => { u1(); u2(); u3(); };
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    for (const item of notifications.filter(n => !n.read)) {
      if (currentUser.role === 'parent') await dbService.markNotificationAsRead(item.unreadId);
      else sessionStorage.setItem(`admin_read_${item.unreadId}`, 'true');
    }
    if (currentUser.role === 'parent') {
      setNotifications(await dbService.getUserNotifications(currentUser.uid));
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
    setShowBell(false);
  };

  const handleMarkSingleRead = async (unreadId: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'parent') {
      await dbService.markNotificationAsRead(unreadId);
      setNotifications(await dbService.getUserNotifications(currentUser.uid));
    } else {
      sessionStorage.setItem(`admin_read_${unreadId}`, 'true');
      setNotifications(prev => prev.map(n => n.unreadId === unreadId ? { ...n, read: true } : n));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => i.roles.includes(currentUser?.role || ''))
  })).filter(g => g.items.length > 0);

  const userInitial = (currentUser?.name || 'U').charAt(0).toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-green-800/40">
        <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shadow-md shadow-amber-900/30 shrink-0 overflow-hidden">
          {centre.logoUrl
            ? <img src={centre.logoUrl} alt={centre.name} className="w-full h-full object-contain p-0.5" />
            : <HeartHandshake className="w-5 h-5 text-green-900" />
          }
        </div>
        <div className="min-w-0">
          <h1 className="font-black text-base text-white tracking-tight leading-tight truncate">{centre.name}</h1>
          {centre.slogan
            ? <p className="text-[10px] text-amber-300 mt-0.5 truncate italic">{centre.slogan}</p>
            : <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mt-0.5">Daycare Suite</p>
          }
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {visibleGroups.map(group => (
          <div key={group.label}>
            <p className="text-[9px] font-black text-green-500 uppercase tracking-widest px-3 mb-1.5">{group.label}</p>
            {group.items.map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-0.5 ${
                    active
                      ? 'bg-amber-400 text-green-900 shadow-md shadow-amber-900/20'
                      : 'text-green-200 hover:bg-green-800/50 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-green-900' : 'text-green-400'}`} />
                  <span className="truncate">{item.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-green-700" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-green-800/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-green-700 flex items-center justify-center text-amber-300 font-black text-sm shrink-0">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">{currentUser?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-green-800/60 hover:bg-red-900/60 text-green-300 hover:text-red-300 text-xs font-bold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F3EE' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 sticky top-0 h-screen" style={{ background: '#0098db' }}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed inset-y-0 left-0 w-64 z-50 flex flex-col md:hidden shadow-2xl"
              style={{ background: '#0098db' }}>
              <button onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-green-800/60 flex items-center justify-center text-green-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-amber-100/60 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm shadow-amber-50">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-green-800 hover:bg-green-50 md:hidden">
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb hint */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {visibleGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Dashboard'}
              </span>
            </div>
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center overflow-hidden shrink-0">
                {centre.logoUrl
                  ? <img src={centre.logoUrl} alt={centre.name} className="w-full h-full object-contain p-0.5" />
                  : <HeartHandshake className="w-3.5 h-3.5 text-green-900" />
                }
              </div>
              <span className="font-black text-green-900 text-base truncate max-w-[140px]">{centre.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode badge */}
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border"
              style={{ background: '#F0F9FF', color: '#0284C7', borderColor: '#BAE6FD' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {dbService.isRealFirebase() ? 'Firebase Live' : 'Offline Mode'}
            </span>

            {/* Bell */}
            <div className="relative">
              <button onClick={() => setShowBell(b => !b)}
                className="relative w-9 h-9 rounded-xl border border-amber-100 bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-700 transition-colors">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showBell && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowBell(false)} />
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-amber-100 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-amber-50 flex items-center justify-between bg-amber-50/50">
                        <span className="text-xs font-black text-green-900">Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-amber-600 hover:text-amber-700">Mark all read</button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-amber-50">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Megaphone className="w-7 h-7 mx-auto mb-2 text-amber-300" />
                            <p className="text-xs font-bold text-slate-400">All caught up!</p>
                          </div>
                        ) : notifications.map(not => {
                          let Icon = Megaphone;
                          let iconStyle = 'bg-blue-50 text-blue-500';
                          if (not.type === 'Emergency' || not.priority === 'Urgent') { Icon = AlertOctagon; iconStyle = 'bg-red-50 text-red-500'; }
                          else if (not.type === 'Payment') { Icon = CreditCard; iconStyle = 'bg-amber-50 text-amber-600'; }
                          else if (not.type === 'ChildSpecific') { Icon = User; iconStyle = 'bg-green-50 text-green-600'; }
                          return (
                            <div key={not.id} className={`flex gap-3 px-4 py-3 transition-colors ${not.read ? 'bg-white' : 'bg-amber-50/40'}`}>
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconStyle}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs truncate ${not.read ? 'font-semibold text-slate-600' : 'font-black text-slate-900'}`}>{not.title}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{not.message}</p>
                              </div>
                              {!not.read && (
                                <button onClick={() => handleMarkSingleRead(not.unreadId)}
                                  className="w-6 h-6 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 shrink-0 mt-0.5">
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-amber-100">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0"
                style={{ background: '#0098db' }}>
                {userInitial}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[100px]">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{currentUser?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Push toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 max-w-xs bg-green-900 text-white p-4 rounded-2xl shadow-2xl flex gap-3 items-start border border-green-700" aria-label={`Notification from ${centre.name}`}>
            <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-green-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Notification</p>
              <p className="text-xs font-bold text-white mt-0.5 truncate">{toast.title}</p>
              <p className="text-[10px] text-green-300 mt-0.5 line-clamp-2">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-green-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup modal */}
      <AnimatePresence>
        {showPopup && popupAnnouncements.length > 0 && (
          <>
            <div className="fixed inset-0 bg-green-950/60 backdrop-blur-sm z-50" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-5 flex items-center gap-3" style={{ background: '#0098db' }}>
                  <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-green-900" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base">Daycare Announcements</h3>
                    <p className="text-[10px] text-green-300 mt-0.5">Please review before continuing</p>
                  </div>
                </div>
                <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
                  {popupAnnouncements.map(ann => (
                    <div key={ann.id} className="p-4 rounded-2xl border border-amber-100 bg-amber-50/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${ann.priority === 'Urgent' ? 'bg-red-100 text-red-700' : ann.priority === 'Important' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {ann.priority}
                        </span>
                        <span className="text-[10px] text-slate-400">{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
                      </div>
                      <h4 className="font-black text-sm text-slate-900">{ann.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ann.message}</p>
                      <button onClick={() => handleMarkSingleRead(ann.unreadId).then(() => setPopupAnnouncements(prev => prev.filter(a => a.id !== ann.id)))}
                        className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-green-700 hover:text-green-900">
                        <Check className="w-3 h-3" /> Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-amber-100 flex justify-end">
                  <button onClick={() => setShowPopup(false)}
                    className="px-5 py-2 rounded-xl text-xs font-black text-white transition-colors"
                    style={{ background: '#0098db' }}>
                    Enter Portal
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
