import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { Child, Attendance, DailyUpdate, NotificationItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Heart, 
  Calendar, 
  Clock, 
  Utensils, 
  Smile, 
  Moon, 
  FileText, 
  AlertCircle, 
  ArrowRight,
  ShieldAlert,
  BellRing,
  Award,
  ChevronRight,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { motion } from 'motion/react';

export const ParentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [assignedChild, setAssignedChild] = useState<Child | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyUpdate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchParentData = async () => {
    if (!currentUser || currentUser.role !== 'parent') return;

    try {
      setLoading(true);
      
      // 1. Get Assigned child
      const childId = currentUser.assignedChildId;
      if (!childId) {
        setLoading(false);
        return; // No child assigned yet — admin needs to link this parent account
      }
      const child = await dbService.getChildById(childId);
      setAssignedChild(child);

      if (child) {
        // 2. Fetch attendance logs
        const attHistory = await dbService.getAttendanceHistoryForChild(child.id);
        setAttendanceHistory(attHistory);

        // 3. Fetch daily logs for today
        const todayStr = new Date().toISOString().split('T')[0];
        const logs = await dbService.getDailyUpdatesForChild(child.id, todayStr);
        if (logs.length > 0) {
          setDailyLogs(logs[0]);
        } else {
          setDailyLogs(null);
        }
      }
    } catch (e) {
      console.error('Error fetching parent records', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParentData();

    // Listen to changes
    const unsubAtt = dbService.subscribe('attendance', fetchParentData);
    const unsubLogs = dbService.subscribe('daily_updates', fetchParentData);
    const unsubKids = dbService.subscribe('children', fetchParentData);

    return () => {
      unsubAtt();
      unsubLogs();
      unsubKids();
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#0098db] rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing child's live updates...</p>
      </div>
    );
  }

  if (!assignedChild) {
    return (
      <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/60 max-w-md mx-auto my-8">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-extrabold text-base text-slate-900">No Assigned Child Found</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Your parent portal user profile does not specify an assigned child. Please contact the Aangan administrator to link your profile correctly.
        </p>
      </div>
    );
  }

  // Find attendance today
  const TODAY_STR = new Date().toISOString().split('T')[0];
  const attendanceToday = attendanceHistory.find(a => a.date === TODAY_STR);
  const presenceTodayStatus = attendanceToday?.status || 'Absent / Not Checked In';

  // --- COMPUTE ACTIVITY TIMELINE EVENTS ---
  // Requirement: Display chronological timeline:
  // e.g. 08:30 AM - Checked In, 10:00 AM - Breakfast, 01:00 PM - Nap, etc.
  interface TimelineEvent {
    time: string;
    label: string;
    icon: any;
    color: string;
    details?: string;
  }

  const timelineEvents: TimelineEvent[] = [];

  if (attendanceToday) {
    if (attendanceToday.checkInTime) {
      timelineEvents.push({
        time: attendanceToday.checkInTime,
        label: 'Checked In',
        icon: Clock,
        color: 'bg-emerald-100 text-emerald-700 ring-emerald-50',
        details: 'Welcome to Aangan Daycare!'
      });
    }

    if (dailyLogs) {
      if (dailyLogs.meals.breakfast && dailyLogs.meals.breakfast !== 'Not Eaten') {
        timelineEvents.push({
          time: '09:30 AM', // Approximate breakfast scheduling
          label: `Breakfast Intake: ${dailyLogs.meals.breakfast}`,
          icon: Utensils,
          color: 'bg-amber-100 text-amber-700 ring-amber-50',
          details: `Breakfast meal was marked as ${dailyLogs.meals.breakfast.toLowerCase()}.`
        });
      }

      if (dailyLogs.nap.startTime) {
        timelineEvents.push({
          time: dailyLogs.nap.startTime,
          label: 'Nap Started',
          icon: Moon,
          color: 'bg-indigo-100 text-indigo-700 ring-indigo-50',
          details: 'Placed in resting crib.'
        });
      }

      if (dailyLogs.nap.endTime) {
        timelineEvents.push({
          time: dailyLogs.nap.endTime,
          label: 'Nap Completed',
          icon: Sparkles,
          color: 'bg-indigo-100 text-indigo-700 ring-indigo-50',
          details: 'Woke up energized and hydrated.'
        });
      }

      if (dailyLogs.meals.lunch && dailyLogs.meals.lunch !== 'Not Eaten') {
        timelineEvents.push({
          time: '01:15 PM', 
          label: `Lunch Intake: ${dailyLogs.meals.lunch}`,
          icon: Utensils,
          color: 'bg-amber-100 text-amber-700 ring-amber-50',
          details: `Lunch meal was marked as ${dailyLogs.meals.lunch.toLowerCase()}.`
        });
      }

      if (dailyLogs.meals.snacks && dailyLogs.meals.snacks !== 'Not Eaten') {
        timelineEvents.push({
          time: '03:45 PM', 
          label: `Snack Intake: ${dailyLogs.meals.snacks}`,
          icon: Utensils,
          color: 'bg-amber-100 text-amber-700 ring-amber-50',
          details: `Evening milk and snacks logged as ${dailyLogs.meals.snacks.toLowerCase()}.`
        });
      }
    }

    if (attendanceToday.checkOutTime) {
      timelineEvents.push({
        time: attendanceToday.checkOutTime,
        label: `Checked Out`,
        icon: Award,
        color: 'bg-indigo-100 text-indigo-700 ring-indigo-50',
        details: `Picked up by ${attendanceToday.pickedBy || 'authorized guardian'}.`
      });
    }
  }

  // Sort timeline events chronologically (assuming simple AM/PM mapping, but they are added in structural order)

  return (
    <div className="space-y-8">
      
      {/* 1. HERO SECTION WITH CHILD DETAILS */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-100/50">
        
        {/* Abstract graphics */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-10 -mt-10" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          
          <div className="flex items-center gap-4.5">
            <img 
              src={assignedChild.photoUrl} 
              alt={assignedChild.name} 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-4 border-white shadow-lg shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/10 mb-2">
                <Heart className="w-3 h-3 text-rose-300 fill-rose-300 animate-pulse" />
                Linked Child Profile
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{assignedChild.name}</h2>
              <p className="text-xs text-blue-100 mt-1">DOB: {assignedChild.dob} • Allergies: {assignedChild.allergies || 'None'}</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right shrink-0">
            <p className="text-[10px] text-blue-100 uppercase font-black">Status Today</p>
            <h4 className="text-sm font-bold text-white mt-1 uppercase tracking-wide">
              {presenceTodayStatus}
            </h4>
            {attendanceToday?.checkInTime && (
              <p className="text-[11px] text-blue-200 mt-1">Checked In at {attendanceToday.checkInTime}</p>
            )}
          </div>

        </div>
      </div>

      {/* 2. LIVE UPDATES & TIMELINE BENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TIMELINE COLUMN */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 lg:col-span-2">
          <div className="mb-6">
            <h3 className="font-extrabold text-base text-slate-900">Today's Daily Activity Timeline</h3>
            <p className="text-xs text-slate-400 font-medium">Real-time milestones from check-in to checkout today.</p>
          </div>

          {timelineEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-xs text-slate-800 uppercase tracking-wider">No activities logged yet</p>
              <p className="text-xs mt-1">Timeline logs will propagate automatically when your child is checked in.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-blue-100 space-y-6">
              {timelineEvents.map((evt, idx) => {
                const Icon = evt.icon;
                return (
                  <div key={idx} className="relative">
                    {/* Timestamp bubble icon */}
                    <span className={`absolute -left-[35px] top-0 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white ${evt.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    
                    <div className="pl-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{evt.label}</span>
                        <span className="text-[10px] text-[#0098db] font-semibold tracking-wider uppercase px-2 py-0.5 bg-amber-50 border border-blue-100/30 rounded-md">
                          {evt.time}
                        </span>
                      </div>
                      {evt.details && (
                        <p className="text-xs text-slate-500 mt-1">{evt.details}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DETAILED VITALS COLUMN (MEALS, MOOD, NAP) */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 space-y-6">
          
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Health & Activities Vitals</h3>
            <p className="text-xs text-slate-400 font-medium">Recorded values for food & mood today.</p>
          </div>

          {!dailyLogs ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl flex-1 flex flex-col justify-center">
              <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-500" />
              <p className="font-bold text-xs text-slate-800">Logs Pending</p>
              <p className="text-xs mt-1">Daily updates logs are typically completed by coordinating teachers by early afternoon.</p>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Mood Display */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Child Mood Today</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {dailyLogs.mood === 'Happy' ? '😊' : dailyLogs.mood === 'Sleepy' ? '😴' : dailyLogs.mood === 'Active' ? '⚡' : '😐'}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Feeling {dailyLogs.mood}</h4>
                    <p className="text-[10px] text-slate-400">Class activity emotional feedback.</p>
                  </div>
                </div>
              </div>

              {/* Meals metrics */}
              <div className="space-y-2.5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1">Nutrition Details</p>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100/50">
                    <p className="text-[10px] text-slate-400">Breakfast</p>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate">{dailyLogs.meals.breakfast}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100/50">
                    <p className="text-[10px] text-slate-400">Lunch</p>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate">{dailyLogs.meals.lunch}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100/50">
                    <p className="text-[10px] text-slate-400">Snacks</p>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate">{dailyLogs.meals.snacks}</p>
                  </div>
                </div>
              </div>

              {/* Nap details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Moon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Nap Time</h4>
                    <p className="text-[10px] text-slate-400">Sleep resting details</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800">{dailyLogs.nap.startTime} - {dailyLogs.nap.endTime}</p>
                </div>
              </div>

              {/* Teacher Notes */}
              {dailyLogs.teacherNotes && (
                <div className="p-4 bg-amber-50/20 rounded-2xl border border-blue-50 flex flex-col gap-2">
                  <p className="text-[9px] text-[#0098db] font-bold uppercase tracking-wider pl-1">Teacher Notes</p>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{dailyLogs.teacherNotes}"
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* 3. HEALTH NOTES & EMERGENCY HELPER ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Child Allergy banner */}
        <div className="p-5 rounded-3xl bg-rose-50/50 border border-rose-100 flex gap-4.5 items-start">
          <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-rose-900">Registered Allergies</h4>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">{assignedChild.allergies || 'No allergies recorded for this child.'}</p>
          </div>
        </div>

        {/* Emergency instructions */}
        <div className="p-5 rounded-3xl bg-amber-50/40 border border-blue-100 flex gap-4.5 items-start">
          <div className="w-10 h-10 bg-green-100 text-[#0098db] rounded-2xl flex items-center justify-center shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">Emergency Contacts Handled</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Assigned Alternate Contact: <span className="font-semibold text-slate-700">{assignedChild.emergencyContact}</span>. If any information is incorrect, please trigger a portal request change.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
