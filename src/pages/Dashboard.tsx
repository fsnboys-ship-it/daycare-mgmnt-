import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/firebase';
import { 
  Child, 
  Attendance, 
  NotificationItem, 
  ActivityLog,
  Payment,
  DaycareEvent,
  IncidentReport,
  EventRegistration
} from '../types';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  Luggage, 
  Clock, 
  Megaphone, 
  ChevronRight, 
  Plus, 
  CalendarCheck,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Wallet,
  DollarSign,
  CheckCircle2,
  UserPlus,
  FileText,
  Check,
  HeartHandshake,
  Home
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onAddChildClick: () => void;
  onCreateNotificationClick: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  setActiveTab, 
  onAddChildClick,
  onCreateNotificationClick
}) => {
  const { currentUser, isAdmin, isStaff, isParent } = useAuth();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<Attendance[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  // Phase 2 states
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<DaycareEvent[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [eventRegs, setEventRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const kids = await dbService.getChildren();
      setChildren(kids);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayAttendance = await dbService.getAttendanceForDate(todayStr);
      setAttendanceToday(todayAttendance);

      const recentActs = await dbService.getRecentActivities();
      setActivities(recentActs);

      const allNotifications = await dbService.getNotifications();
      let publishedNots = allNotifications.filter(n => n.status === 'Published');
      if (isParent) {
        // Parents see broad announcements and child-specific ones meant for their child
        publishedNots = publishedNots.filter(n => 
          n.targetAudience === 'All Parents' || 
          (n.targetAudience === 'Selected Child' && n.targetId === currentUser?.assignedChildId)
        );
      } else {
        // Admins and Staff see relevant notifications (not child-specific check-ins/check-outs)
        publishedNots = publishedNots.filter(n => 
          n.type !== 'ChildSpecific' && 
          n.targetAudience !== 'Selected Child' &&
          n.createdBy !== currentUser?.uid
        );
      }
      setNotifications(publishedNots);

      // Fetch Phase 2 data collections
      const assignedChildId = currentUser?.assignedChildId;
      const allPayments = isParent && assignedChildId
        ? await dbService.getPaymentsForChild(assignedChildId)
        : await dbService.getPayments();
      setPayments(allPayments);

      const allEvents = await dbService.getEvents();
      setEvents(allEvents);

      const allIncidents = isParent && assignedChildId
        ? await dbService.getIncidentReports(assignedChildId)
        : await dbService.getIncidentReports();
      setIncidents(allIncidents);

      const allRegs = await dbService.getEventRegistrations();
      setEventRegs(allRegs);
    } catch (e) {
      console.error('Error reading dashboard statistics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time events
    const unsubChildren = dbService.subscribe('children', fetchDashboardData);
    const unsubAtt = dbService.subscribe('attendance', fetchDashboardData);
    const unsubAct = dbService.subscribe('activities', fetchDashboardData);
    const unsubNots = dbService.subscribe('notifications', fetchDashboardData);
    const unsubPayments = dbService.subscribe('payments', fetchDashboardData);
    const unsubEvents = dbService.subscribe('events', fetchDashboardData);
    const unsubIncidents = dbService.subscribe('incident_reports', fetchDashboardData);
    const unsubRegs = dbService.subscribe('event_registrations', fetchDashboardData);

    return () => {
      unsubChildren();
      unsubAtt();
      unsubAct();
      unsubNots();
      unsubPayments();
      unsubEvents();
      unsubIncidents();
      unsubRegs();
    };
  }, []);

  // Compute stats
  const totalChildren = children.length;
  const presentToday = attendanceToday.filter(a => a.attendanceStatus === 'Present' || a.status === 'Present' || a.status === 'Picked Up').length;
  const absentToday = attendanceToday.filter(a => a.attendanceStatus === 'Absent' || a.status === 'Absent').length;
  
  const currentlyInCenter = attendanceToday.filter(a => 
    (a.attendanceStatus === 'Present' || a.status === 'Present') && 
    (a.departureStatus === 'In Center' || !a.departureStatus || a.departureStatus === null) && 
    a.status !== 'Picked Up'
  ).length;

  const earlyPickups = attendanceToday.filter(a => a.departureStatus === 'Early Pickup').length;
  
  const regularPickups = attendanceToday.filter(a => 
    a.departureStatus === 'Picked Up' || (a.status === 'Picked Up' && a.departureStatus !== 'Early Pickup')
  ).length;

  const unmarkedCount = totalChildren - (presentToday + absentToday);

  // Phase 2 calculations
  const totalBilled = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalCollected = payments.reduce((acc, p) => acc + p.paidAmount, 0);
  const totalPending = payments.reduce((acc, p) => acc + p.pendingAmount, 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEventsList = events.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const activeIncidentsList = incidents.filter(i => i.status !== 'Resolved' || !i.parentAcknowledged);
  const pendingAcksCount = incidents.filter(i => isParent && !i.parentAcknowledged).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gathering Daycare Stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hello, {currentUser?.name.split(' ')[0]}!
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
            Role: {currentUser?.role} • Today is {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              id="dash-add-child-btn"
              onClick={onAddChildClick}
              className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#3d7edc] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-100 hover:shadow-green-900/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Child</span>
            </button>
            <button
              id="dash-create-not-btn"
              onClick={onCreateNotificationClick}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              <span>New Notice</span>
            </button>
          </div>
        )}
      </div>

      {/* DASHBOARD STATISTICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Total Children */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4 cursor-pointer"
          onClick={() => setActiveTab('children')}
        >
          <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-[#1B4332] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Children</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">{totalChildren}</h3>
          </div>
        </motion.div>

        {/* Present Today */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4 cursor-pointer"
          onClick={() => setActiveTab('attendance')}
        >
          <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Present Today</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">{presentToday}</h3>
          </div>
        </motion.div>

        {/* Absent Today */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4 cursor-pointer"
          onClick={() => setActiveTab('attendance')}
        >
          <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
            <UserMinus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Absent Today</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              {absentToday}
              {unmarkedCount > 0 && (
                <span className="text-[9px] font-normal text-slate-400 ml-1.5 pl-1 border-l border-slate-200">
                  {unmarkedCount} unmarked
                </span>
              )}
            </h3>
          </div>
        </motion.div>

        {/* Currently In Center */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4 cursor-pointer"
          onClick={() => setActiveTab('attendance')}
        >
          <div className="w-10 h-10 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">In Center</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">{currentlyInCenter}</h3>
          </div>
        </motion.div>

        {/* Early Pickups */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4 cursor-pointer"
          onClick={() => setActiveTab('attendance')}
        >
          <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Early Pickups</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">{earlyPickups}</h3>
          </div>
        </motion.div>

        {/* Regular Pickups */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-5 bg-white rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4 cursor-pointer"
          onClick={() => setActiveTab('attendance')}
        >
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
            <Luggage className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reg. Pickups</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">{regularPickups}</h3>
          </div>
        </motion.div>

      </div>

      {/* PHASE 2 ADVANCED OPERATIONAL WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* WIDGET 1: PENDING FEES & PAYMENT SUMMARY */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                    {isParent ? 'My Outstanding Fees' : 'Fee Collection Summary'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {isParent ? 'Assigned and Outstanding' : 'All-Student Billings'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('fees')}
                className="text-xs font-bold text-[#1B4332] hover:underline cursor-pointer bg-transparent border-none"
              >
                {isParent ? 'Pay' : 'Details'}
              </button>
            </div>

            {/* Content for Parent vs Admin/Staff */}
            {isParent ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total Pending</p>
                    <p className="text-2xl font-black text-rose-600 tracking-tight mt-0.5">
                      ₹{totalPending.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Collected</p>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">
                      ₹{totalCollected.toLocaleString()}
                    </p>
                  </div>
                </div>

                {payments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">No pending payments</p>
                ) : (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {payments.slice(0, 3).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-2 rounded-xl bg-slate-50/50 border border-slate-100 text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{p.feeName}</p>
                          <p className="text-[10px] text-slate-400">Due: {p.dueDate ? new Date(p.dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${p.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{p.pendingAmount.toLocaleString()}
                          </p>
                          <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase rounded ${
                            p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : p.status === 'Partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-2xl">
                    <p className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">Collected</p>
                    <p className="text-base font-black text-emerald-600 mt-1">₹{totalCollected.toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-2xl">
                    <p className="text-[9px] text-rose-700 font-bold uppercase tracking-wider">Pending</p>
                    <p className="text-base font-black text-rose-600 mt-1">₹{totalPending.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Collection Rate</span>
                    <span>{totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full" 
                      style={{ width: `${totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between font-medium">
                  <span>Total Billings: ₹{totalBilled.toLocaleString()}</span>
                  <span>{payments.length} Payments Tracked</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WIDGET 2: UPCOMING EVENTS & REGISTRATIONS */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">Upcoming Programs</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Events & Parent RSVP</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('events')}
                className="text-xs font-bold text-[#1B4332] hover:underline cursor-pointer bg-transparent border-none"
              >
                Calendar
              </button>
            </div>

            <div className="space-y-3">
              {upcomingEventsList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-150 rounded-2xl">
                  <p className="text-xs">No upcoming events listed</p>
                </div>
              ) : (
                upcomingEventsList.slice(0, 2).map(e => {
                  const regCount = eventRegs.filter(r => r.eventId === e.id).length;
                  const isRegistered = eventRegs.some(r => r.eventId === e.id && isParent && r.childId === currentUser?.assignedChildId);
                  
                  return (
                    <div key={e.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex flex-col items-center justify-center shrink-0 text-slate-700 font-black">
                        <span className="text-[9px] uppercase font-bold text-indigo-600">
                          {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' }) : '—'}
                        </span>
                        <span className="text-xs -mt-1">
                          {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric' }) : '—'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{e.title}</h4>
                          <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase shrink-0 ${
                            e.type === 'Holiday' ? 'bg-red-50 text-red-700' : e.type === 'Celebration' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {e.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{e.description}</p>
                        
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/50">
                          <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {e.startTime} - {e.endTime}
                          </span>
                          {isParent ? (
                            <span className={`text-[8px] font-bold flex items-center gap-0.5 ${
                              isRegistered ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                              {isRegistered ? (
                                <>
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  RSVP Yes
                                </>
                              ) : (
                                'RSVP Pending'
                              )}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {regCount} RSVP(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* WIDGET 3: RECENT INCIDENTS & SAFETY STATUS */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">
                    {isParent ? 'Incident Logs' : 'Recent Health Alerts'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {isParent ? 'Requires Acknowledgment' : 'Safety Logs & Signoffs'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('incidents')}
                className="text-xs font-bold text-[#1B4332] hover:underline cursor-pointer bg-transparent border-none"
              >
                {isParent && pendingAcksCount > 0 ? `Sign (${pendingAcksCount})` : 'All'}
              </button>
            </div>

            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-150 rounded-2xl flex flex-col justify-center items-center">
                  <HeartHandshake className="w-6 h-6 text-emerald-500 mb-1" />
                  <p className="text-xs">All children are safe and sound</p>
                </div>
              ) : (
                incidents.slice(0, 2).map(inc => (
                  <div key={inc.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-800">{inc.childName}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{inc.date ? new Date(inc.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                    </div>
                    <p className="font-bold text-[11px] text-rose-600 mt-1">{inc.incidentType}</p>
                    <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">{inc.description}</p>
                    
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        inc.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {inc.status}
                      </span>
                      {isParent ? (
                        inc.parentAcknowledged ? (
                          <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            Signed
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              await dbService.acknowledgeIncident(inc.id, 'Parent Acknowledged');
                              fetchDashboardData();
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Sign report
                          </button>
                        )
                      ) : (
                        <span className={`text-[8px] font-bold ${inc.parentAcknowledged ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {inc.parentAcknowledged ? 'Signed' : 'Pending Sign'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* RECENT ACTIVITIES & NOTIFICATIONS BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RECENT ACTIVITIES TIMELINE */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">Recent Daily Activities</h3>
              <p className="text-xs text-slate-400 font-medium">Real-time status updates of child check-ins & teacher logs.</p>
            </div>
            <button
              id="view-all-activities-btn"
              onClick={() => setActiveTab('attendance')}
              className="text-[#1B4332] hover:text-[#3273d4] hover:underline text-xs font-bold cursor-pointer flex items-center gap-1"
            >
              <span>Manage Attendance</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-35" />
                <p className="text-xs">No recent activity logged today</p>
              </div>
            ) : (
              <div className="relative pl-5 border-l-2 border-blue-100 space-y-6">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="relative">
                    {/* Timestamp bullet circle */}
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#1B4332] ring-4 ring-white" />
                    
                    <div className="flex items-start gap-3.5">
                      {act.childPhoto ? (
                        <img 
                          src={act.childPhoto} 
                          alt={act.childName} 
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-green-100 text-[#1B4332] rounded-xl flex items-center justify-center font-bold text-xs shrink-0">
                          {act.childName.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{act.childName}</h4>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {act.timestamp ? new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{act.details}</p>
                        
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase rounded tracking-wide ${
                            act.type === 'check_in' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : act.type === 'check_out' 
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {act.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LATEST ANNOUNCEMENTS & BROADS */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">Active Notices</h3>
              <p className="text-xs text-slate-400 font-medium">Global broadcast messages</p>
            </div>
            <button
              id="view-all-notices-btn"
              onClick={() => setActiveTab('notifications')}
              className="text-[#1B4332] hover:text-[#3273d4] hover:underline text-xs font-bold cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="flex-1 space-y-4">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl flex-1 flex flex-col justify-center">
                <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-35" />
                <p className="text-xs">No notifications are currently active</p>
              </div>
            ) : (
              notifications.slice(0, 3).map((not) => (
                <div 
                  key={not.id} 
                  className={`p-4 rounded-2xl border ${
                    not.priority === 'Urgent' 
                      ? 'bg-red-50/50 border-red-100' 
                      : not.priority === 'Important' 
                      ? 'bg-amber-50/40 border-amber-100' 
                      : 'bg-amber-50/30 border-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                      not.priority === 'Urgent' 
                        ? 'bg-red-100 text-red-700' 
                        : not.priority === 'Important' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-green-100 text-amber-700'
                    }`}>
                      {not.priority}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {not.createdAt ? new Date(not.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{not.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">{not.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* QUICK WORKFLOW ACCESS FOR STAFF & ADMIN */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl border border-blue-100/60 p-6">
        <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#1B4332]" />
          Recommended Operational Workflows
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            id="workflow-chk"
            onClick={() => setActiveTab('attendance')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200/50 rounded-2xl cursor-pointer transition-all flex items-start gap-3 shadow-sm shadow-slate-100/50"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-800">Check In / Check Out</h4>
              <p className="text-xs text-slate-500 mt-1 leading-normal">Instantly mark kids as present, or record parent pickup details.</p>
            </div>
          </div>

          <div 
            id="workflow-log"
            onClick={() => setActiveTab('updates')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200/50 rounded-2xl cursor-pointer transition-all flex items-start gap-3 shadow-sm shadow-slate-100/50"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-800">Daily Health & Meal Logs</h4>
              <p className="text-xs text-slate-500 mt-1 leading-normal">Log snack consumption, naps durations, moods, and teacher logs.</p>
            </div>
          </div>

          <div 
            id="workflow-dir"
            onClick={() => setActiveTab('children')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200/50 rounded-2xl cursor-pointer transition-all flex items-start gap-3 shadow-sm shadow-slate-100/50"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-[#1B4332] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-800">Children Management</h4>
              <p className="text-xs text-slate-500 mt-1 leading-normal">Register children profile, update emergency contacts, allergies etc.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
