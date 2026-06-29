import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/firebase';
import { CalendarEvent, CalendarEventType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Plus, Check, X,
  Calendar, Star, AlertCircle, IndianRupee, Bell, Gift
} from 'lucide-react';

const TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string; dot: string; icon: React.FC<{ className?: string }> }> = {
  Holiday:  { label: 'Holiday',  color: 'bg-red-100 text-red-700 border-red-200',     dot: 'bg-red-500',     icon: Star },
  Event:    { label: 'Event',    color: 'bg-green-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500',    icon: Calendar },
  FeeDue:   { label: 'Fee Due',  color: 'bg-amber-100 text-amber-700 border-amber-200',dot: 'bg-amber-500',   icon: IndianRupee },
  Birthday: { label: 'Birthday', color: 'bg-pink-100 text-pink-700 border-pink-200',   dot: 'bg-pink-500',    icon: Gift },
  Notice:   { label: 'Notice',   color: 'bg-slate-100 text-slate-700 border-slate-200',dot: 'bg-slate-400',   icon: Bell },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const CalendarPage: React.FC = () => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', date: '', type: 'Holiday' as CalendarEventType, description: '',
  });

  const fetchData = async () => {
    try { setLoading(true); setCalEvents(await dbService.getCalendarEvents()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const u = dbService.subscribe('calendar_events', fetchData);
    return () => u();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dbService.createCalendarEvent(form);
      setShowAddModal(false);
      setForm({ title: '', date: '', type: 'Holiday', description: '' });
      showToast('Calendar entry added!');
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  // Map events by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    calEvents.forEach(ev => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [calEvents]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const toDateStr = (day: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  // Month events list
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthEvents = calEvents.filter(ev => ev.date.startsWith(monthStr)).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Calendar</h2>
          <p className="text-xs text-[#0098db] font-semibold uppercase tracking-wider">Holidays · Events · Fee dues · Birthdays</p>
        </div>
        <button onClick={() => { setForm(f => ({ ...f, date: todayStr })); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-[#0098db] hover:bg-green-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-sm shadow-green-900/20 transition-colors">
          <Plus className="w-4 h-4" /> Add entry
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TYPE_CONFIG) as [CalendarEventType, typeof TYPE_CONFIG[CalendarEventType]][]).map(([type, cfg]) => (
          <span key={type} className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <h3 className="font-black text-slate-900">{MONTHS[viewMonth]} {viewYear}</h3>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1.5">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="aspect-square" />;
              const dateStr = toDateStr(day);
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button key={idx} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`aspect-square flex flex-col items-center justify-start p-1 rounded-xl transition-colors relative ${isSelected ? 'bg-[#0098db] text-white' : isToday ? 'bg-amber-50 text-[#0098db]' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <span className={`text-xs font-bold ${isToday && !isSelected ? 'font-black' : ''}`}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                      {dayEvents.slice(0, 3).map((ev, i) => (
                        <span key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : TYPE_CONFIG[ev.type]?.dot || 'bg-slate-400'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected date events */}
          {selectedDate && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
              <h4 className="font-bold text-sm text-slate-900 mb-3">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nothing scheduled</p>
              ) : selectedEvents.map(ev => {
                const cfg = TYPE_CONFIG[ev.type];
                const Icon = cfg.icon;
                return (
                  <div key={ev.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border mb-2 ${cfg.color}`}>
                    <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{ev.title}</p>
                      {ev.description && <p className="text-[10px] mt-0.5 opacity-80">{ev.description}</p>}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => { setForm(f => ({ ...f, date: selectedDate })); setShowAddModal(true); }}
                className="w-full mt-2 py-1.5 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 hover:border-[#0098db] hover:text-[#0098db] transition-colors flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Add to this date
              </button>
            </motion.div>
          )}

          {/* Month events list */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
            <h4 className="font-bold text-sm text-slate-900 mb-3">{MONTHS[viewMonth]} schedule</h4>
            {loading ? (
              <div className="text-center py-4"><div className="w-5 h-5 border-2 border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto" /></div>
            ) : monthEvents.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Nothing this month</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {monthEvents.map(ev => {
                  const cfg = TYPE_CONFIG[ev.type];
                  const Icon = cfg.icon;
                  const d = new Date(ev.date + 'T00:00:00');
                  return (
                    <button key={ev.id} onClick={() => setSelectedDate(ev.date)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors hover:opacity-90 ${cfg.color}`}>
                      <div className="flex flex-col items-center shrink-0 w-6">
                        <span className="text-[10px] font-bold opacity-70">{DAYS[d.getDay()]}</span>
                        <span className="text-sm font-black leading-none">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{ev.title}</p>
                        <p className="text-[10px] opacity-70 mt-0.5">{cfg.label}</p>
                      </div>
                      <Icon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add entry modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-black text-slate-900">Add calendar entry</h3>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="p-5 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Title</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Onam Holiday"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CalendarEventType }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db]">
                      {(Object.keys(TYPE_CONFIG) as CalendarEventType[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Note (optional)</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional detail..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db]" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-2xl bg-[#0098db] hover:bg-green-900 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Add entry</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
