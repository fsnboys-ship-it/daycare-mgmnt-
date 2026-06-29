import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { Child, Attendance, DailyUpdate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Utensils, 
  Smile, 
  Moon, 
  FileText, 
  Check, 
  HelpCircle,
  AlertCircle,
  Coffee,
  CheckCircle2,
  CalendarCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MOODS = [
  { id: 'Happy', emoji: '😊', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { id: 'Normal', emoji: '😐', color: 'bg-slate-50 text-slate-700 border-slate-100' },
  { id: 'Sleepy', emoji: '😴', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { id: 'Active', emoji: '⚡', color: 'bg-amber-50 text-amber-700 border-amber-100' }
] as const;

export const DailyUpdates: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<Attendance[]>([]);
  const [dailyUpdatesToday, setDailyUpdatesToday] = useState<DailyUpdate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Active child being updated
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  // Form Fields State
  const [breakfast, setBreakfast] = useState<'Completed' | 'Partial' | 'Not Eaten'>('Completed');
  const [lunch, setLunch] = useState<'Completed' | 'Partial' | 'Not Eaten'>('Completed');
  const [snacks, setSnacks] = useState<'Completed' | 'Partial' | 'Not Eaten'>('Completed');
  const [napStart, setNapStart] = useState('01:00 PM');
  const [napEnd, setNapEnd] = useState('02:30 PM');
  const [mood, setMood] = useState<'Happy' | 'Normal' | 'Sleepy' | 'Active'>('Happy');
  const [teacherNotes, setTeacherNotes] = useState('');

  const fetchDailyUpdatesData = async () => {
    try {
      setLoading(true);
      const kids = await dbService.getChildren();
      setChildren(kids);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayAttendance = await dbService.getAttendanceForDate(todayStr);
      setAttendanceToday(todayAttendance);

      // We need to fetch all daily updates for kids for today
      const allUpdates: DailyUpdate[] = [];
      for (const kid of kids) {
        const updates = await dbService.getDailyUpdatesForChild(kid.id, todayStr);
        if (updates.length > 0) {
          allUpdates.push(updates[0]);
        }
      }
      setDailyUpdatesToday(allUpdates);
    } catch (e) {
      console.error('Error fetching child logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyUpdatesData();

    // Listen to daily update updates
    const unsubUpdates = dbService.subscribe('daily_updates', fetchDailyUpdatesData);
    const unsubAtt = dbService.subscribe('attendance', fetchDailyUpdatesData);

    return () => {
      unsubUpdates();
      unsubAtt();
    };
  }, []);

  const handleOpenForm = (child: Child) => {
    // Find if update already exists today
    const existing = dailyUpdatesToday.find(u => u.childId === child.id);
    
    setSelectedChild(child);
    if (existing) {
      setBreakfast(existing.meals.breakfast);
      setLunch(existing.meals.lunch);
      setSnacks(existing.meals.snacks);
      setNapStart(existing.nap.startTime);
      setNapEnd(existing.nap.endTime);
      setMood(existing.mood);
      setTeacherNotes(existing.teacherNotes);
    } else {
      // Default reset
      setBreakfast('Completed');
      setLunch('Completed');
      setSnacks('Completed');
      setNapStart('01:00 PM');
      setNapEnd('02:15 PM');
      setMood('Happy');
      setTeacherNotes('');
    }
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload: Omit<DailyUpdate, 'id' | 'timestamp'> = {
        childId: selectedChild.id,
        date: todayStr,
        meals: {
          breakfast,
          lunch,
          snacks
        },
        nap: {
          startTime: napStart,
          endTime: napEnd
        },
        mood,
        teacherNotes,
        staffId: currentUser?.uid || ''
      };

      await dbService.saveDailyUpdate(payload);
      setSelectedChild(null);
      fetchDailyUpdatesData();
    } catch (e) {
      console.error('Error saving daily activities', e);
    }
  };

  // Check if a child is present today (only present children should have daily updates)
  const isChildPresent = (childId: string): boolean => {
    const record = attendanceToday.find(a => a.childId === childId);
    return record?.status === 'Present' || record?.status === 'Picked Up';
  };

  // Get daily update object for a child
  const getChildUpdate = (childId: string): DailyUpdate | undefined => {
    return dailyUpdatesToday.find(u => u.childId === childId);
  };

  // Filter kids
  const filteredChildren = children.filter(c => {
    const isPresent = isChildPresent(c.id);
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return isPresent && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Teacher's Daily Activities Logger</h2>
        <p className="text-xs text-[#1B4332] font-semibold uppercase tracking-wider">Module 3: Daily Updates</p>
        <p className="text-xs text-slate-400 font-medium mt-1">Record food consumption, sleep nap durations, child mood and teacher notes for present children.</p>
      </div>

      {/* SEARCH AND INFORMATION ALERTS */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            id="daily-updates-search"
            type="text"
            placeholder="Search active present kids..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200/80 focus:border-[#1B4332] rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800"
          />
        </div>

        <div className="p-4 bg-amber-50/50 rounded-2xl border border-blue-100/40 flex gap-3 text-xs text-slate-600">
          <CalendarCheck className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">Attendance sync enabled</p>
            <p className="mt-0.5">Only children marked as <span className="font-semibold text-emerald-700">Present</span> or <span className="font-semibold text-indigo-700">Picked Up</span> in today's attendance roster are displayed here for logs.</p>
          </div>
        </div>
      </div>

      {/* KIDS LIST GRID */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing activity records...</p>
        </div>
      ) : filteredChildren.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200 text-slate-400">
          <Smile className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-500" />
          <p className="font-bold text-sm text-slate-800">No Present Children Today</p>
          <p className="text-xs text-slate-400 mt-1">Make sure you have marked children as 'Present' in the Attendance tab first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChildren.map((child) => {
            const update = getChildUpdate(child.id);
            const isLogged = update !== undefined;

            return (
              <motion.div
                key={child.id}
                whileHover={{ y: -2 }}
                className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between"
              >
                
                {/* Profile detail */}
                <div className="flex gap-4">
                  <img 
                    src={child.photoUrl} 
                    alt={child.name} 
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">{child.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Parent: {child.parentName}</p>
                    
                    {/* Logged status feedback */}
                    <div className="mt-2.5">
                      {isLogged ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700">
                          <Check className="w-3 h-3 text-emerald-500" />
                          Logs Saved • Mood: {update.mood}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          No logs today
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Micro summary preview of logged parameters */}
                {isLogged && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Meals:</span>
                      <span className="font-semibold text-slate-700 text-[10px]">
                        B: {update.meals.breakfast} | L: {update.meals.lunch}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Nap duration:</span>
                      <span className="font-semibold text-slate-700 text-[10px]">
                        {update.nap.startTime} - {update.nap.endTime}
                      </span>
                    </div>
                    {update.teacherNotes && (
                      <p className="text-[10px] text-slate-500 line-clamp-1 italic mt-1 border-t border-slate-200/60 pt-1">
                        "{update.teacherNotes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Operations footer */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <button
                    id={`update-logs-btn-${child.id}`}
                    onClick={() => handleOpenForm(child)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex justify-center items-center gap-1.5 border ${
                      isLogged 
                        ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700' 
                        : 'bg-[#1B4332] hover:bg-[#3273d4] border-[#1B4332] text-white shadow-sm shadow-blue-100'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isLogged ? 'Edit Daily Logs' : 'Log Daily Activities'}</span>
                  </button>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE LOGGING MODAL */}
      <AnimatePresence>
        {selectedChild && (
          <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50" onClick={() => setSelectedChild(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8"
              >
                
                {/* Header info */}
                <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-between">
                  <div className="flex gap-3.5 items-center">
                    <img 
                      src={selectedChild.photoUrl} 
                      alt="" 
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm leading-none">Record logs: {selectedChild.name}</h3>
                      <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mt-1.5">Today's Daily Activity Sheet</p>
                    </div>
                  </div>
                  <button
                    id="close-logs-modal"
                    onClick={() => setSelectedChild(null)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleSaveUpdate} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  
                  {/* MEAL INTAKE LOGS */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Utensils className="w-4 h-4 text-[#1B4332]" />
                      Meals Log
                    </h4>

                    {/* Meal selector matrix */}
                    <div className="space-y-3">
                      {/* Breakfast */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-slate-50 rounded-2xl">
                        <span className="text-xs font-bold text-slate-700 pl-2">Breakfast</span>
                        <div className="flex gap-1.5">
                          {(['Completed', 'Partial', 'Not Eaten'] as const).map((opt) => (
                            <button
                              key={opt}
                              id={`bf-opt-${opt}`}
                              type="button"
                              onClick={() => setBreakfast(opt)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                                breakfast === opt 
                                  ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Lunch */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-slate-50 rounded-2xl">
                        <span className="text-xs font-bold text-slate-700 pl-2">Lunch</span>
                        <div className="flex gap-1.5">
                          {(['Completed', 'Partial', 'Not Eaten'] as const).map((opt) => (
                            <button
                              key={opt}
                              id={`lunch-opt-${opt}`}
                              type="button"
                              onClick={() => setLunch(opt)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                                lunch === opt 
                                  ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Snacks */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-slate-50 rounded-2xl">
                        <span className="text-xs font-bold text-slate-700 pl-2">Snacks</span>
                        <div className="flex gap-1.5">
                          {(['Completed', 'Partial', 'Not Eaten'] as const).map((opt) => (
                            <button
                              key={opt}
                              id={`snacks-opt-${opt}`}
                              type="button"
                              onClick={() => setSnacks(opt)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                                snacks === opt 
                                  ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NAP TIME LOGS */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      Sleep & Nap Interval
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 pl-1">Nap Start Time</label>
                        <input
                          id="nap-start-input"
                          type="text"
                          value={napStart}
                          onChange={(e) => setNapStart(e.target.value)}
                          placeholder="e.g. 01:00 PM"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#1B4332] rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 pl-1">Nap End Time</label>
                        <input
                          id="nap-end-input"
                          type="text"
                          value={napEnd}
                          onChange={(e) => setNapEnd(e.target.value)}
                          placeholder="e.g. 02:15 PM"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#1B4332] rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* MOOD SELECTOR */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <Smile className="w-4 h-4 text-amber-500" />
                      Emotional & Energy State
                    </h4>

                    <div className="grid grid-cols-4 gap-2">
                      {MOODS.map((md) => {
                        const isSel = mood === md.id;
                        return (
                          <button
                            key={md.id}
                            id={`mood-btn-${md.id}`}
                            type="button"
                            onClick={() => setMood(md.id)}
                            className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                              isSel 
                                ? `${md.color} ring-4 ring-blue-50 font-bold scale-[1.03]` 
                                : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xl mb-1">{md.emoji}</span>
                            <span className="text-[10px]">{md.id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* TEACHER NOTES */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <FileText className="w-4 h-4 text-[#1B4332]" />
                      Coordinating Notes
                    </h4>
                    
                    <textarea
                      id="notes-input"
                      value={teacherNotes}
                      onChange={(e) => setTeacherNotes(e.target.value)}
                      placeholder="e.g. Loved finger painting, shared snacks with Riya, slept well..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] focus:bg-white rounded-2xl text-xs font-medium outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      id="cancel-logs-btn"
                      type="button"
                      onClick={() => setSelectedChild(null)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Dismiss
                    </button>
                    <button
                      id="submit-logs-btn"
                      type="submit"
                      className="flex-1 py-3 bg-[#1B4332] hover:bg-[#3273d4] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all cursor-pointer text-center"
                    >
                      Save Daily Log
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
