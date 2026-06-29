import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { DaycareEvent, EventRegistration, Child } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Calendar, Clock, MapPin, Users, CheckCircle2,
  X, Check, Trash2, Star, CalendarDays
} from 'lucide-react';

const CLASS_TAGS = ['All', 'Toddler A', 'Toddler B', 'Nursery', 'Pre-KG', 'KG'];

export const EventsPage: React.FC = () => {
  const { currentUser, isAdmin, isStaff, isParent } = useAuth();
  const [events, setEvents] = useState<DaycareEvent[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DaycareEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState('All');

  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '09:00 AM',
    venue: '', maxSeats: '' as string | number,
    rsvpDeadline: '', targetClass: 'All',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evs, regs, kids] = await Promise.all([
        dbService.getEvents(),
        dbService.getEventRegistrations(),
        dbService.getChildren(),
      ]);
      setEvents(evs); setRegistrations(regs); setChildren(kids);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const u1 = dbService.subscribe('events', fetchData);
    const u2 = dbService.subscribe('event_registrations', fetchData);
    return () => { u1(); u2(); };
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dbService.createEvent({ ...form, maxSeats: form.maxSeats ? Number(form.maxSeats) : undefined });
      setShowModal(false);
      setForm({ title: '', description: '', date: '', time: '09:00 AM', venue: '', maxSeats: '', rsvpDeadline: '', targetClass: 'All' });
      showToast('Event created and parents notified!');
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (ev: DaycareEvent) => {
    if (!window.confirm(`Delete "${ev.title}"?`)) return;
    await dbService.deleteEvent(ev.id);
    if (selected?.id === ev.id) setSelected(null);
    showToast(`"${ev.title}" deleted.`);
  };

  const handleRSVP = async (eventId: string, status: 'Yes' | 'No') => {
    if (!currentUser) return;
    const child = children.find(c => c.id === currentUser.assignedChildId);
    if (!child) return;
    setSaving(true);
    try {
      await dbService.registerForEvent({
        eventId, childId: child.id, childName: child.name,
        parentId: currentUser.uid, parentName: currentUser.name, status,
      });
      showToast(status === 'Yes' ? 'RSVP confirmed! See you there 🎉' : 'RSVP declined.');
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const getMyRSVP = (eventId: string) => {
    if (!currentUser?.assignedChildId) return null;
    return registrations.find(r => r.eventId === eventId && r.childId === currentUser.assignedChildId)?.status || null;
  };

  const getEventRSVPs = (eventId: string) => registrations.filter(r => r.eventId === eventId && r.status === 'Yes').length;

  const today = new Date().toISOString().split('T')[0];
  const filteredEvents = events.filter(ev => filterTag === 'All' || ev.targetClass === filterTag || ev.targetClass === 'All');
  const upcoming = filteredEvents.filter(ev => ev.date >= today);
  const past = filteredEvents.filter(ev => ev.date < today);

  if (loading) return (
    <div className="text-center py-16">
      <div className="w-8 h-8 border-[3px] border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto mb-4" />
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading events...</p>
    </div>
  );

  const EventCard = ({ ev }: { ev: DaycareEvent }) => {
    const rsvpCount = getEventRSVPs(ev.id);
    const myRSVP = getMyRSVP(ev.id);
    const isPast = ev.date < today;
    const isFull = ev.maxSeats ? rsvpCount >= ev.maxSeats : false;

    return (
      <motion.div key={ev.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${isPast ? 'opacity-60' : 'border-slate-200/60'}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-slate-900">{ev.title}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700">{ev.targetClass}</span>
                {isPast && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">Past</span>}
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</p>
              <div className="flex flex-wrap gap-3 mt-2.5 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.time}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venue}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {rsvpCount}{ev.maxSeats ? `/${ev.maxSeats}` : ''} attending</span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => setSelected(ev)} className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
                <Star className="w-3.5 h-3.5" />
              </button>
              {isAdmin && (
                <button onClick={() => handleDelete(ev)} className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {isParent && !isPast && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => handleRSVP(ev.id, 'Yes')} disabled={saving || isFull}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1 ${myRSVP === 'Yes' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} disabled:opacity-50`}>
                <Check className="w-3 h-3" /> {myRSVP === 'Yes' ? 'Going ✓' : isFull ? 'Full' : 'Going'}
              </button>
              <button onClick={() => handleRSVP(ev.id, 'No')} disabled={saving}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-colors flex items-center justify-center gap-1 ${myRSVP === 'No' ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} disabled:opacity-50`}>
                <X className="w-3 h-3" /> {myRSVP === 'No' ? 'Not going' : 'Not going'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Events &amp; Programs</h2>
          <p className="text-xs text-[#1B4332] font-semibold uppercase tracking-wider">Schedule · RSVP · Attendance</p>
        </div>
        {(isAdmin || isStaff) && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-green-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-sm shadow-green-900/20 transition-colors">
            <Plus className="w-4 h-4" /> Create Event
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Upcoming', value: upcoming.length, color: 'text-green-700', bg: 'bg-amber-50', icon: CalendarDays },
          { label: 'Total RSVPs', value: registrations.filter(r => r.status === 'Yes').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Users },
          { label: 'Past events', value: past.length, color: 'text-slate-500', bg: 'bg-slate-50', icon: Calendar },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
            <div className={`w-8 h-8 ${c.bg} rounded-xl flex items-center justify-center mb-2`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
            <p className={`text-lg font-black mt-0.5 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Class filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CLASS_TAGS.map(t => (
          <button key={t} onClick={() => setFilterTag(t)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${filterTag === t ? 'bg-[#1B4332] text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-slate-200/60">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-400">No events scheduled</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Upcoming · {upcoming.length}</h3>
              <div className="space-y-3">{upcoming.map(ev => <div key={ev.id}><EventCard ev={ev} /></div>)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Past events · {past.length}</h3>
              <div className="space-y-3">{past.map(ev => <div key={ev.id}><EventCard ev={ev} /></div>)}</div>
            </div>
          )}
        </>
      )}

      {/* Event detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-gradient-to-br from-[#4F8EF7] to-indigo-600 p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-lg leading-tight">{selected.title}</h3>
                    <p className="text-blue-100 text-xs mt-1">{selected.targetClass} · {getEventRSVPs(selected.id)} attending</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">{selected.description}</p>
                {[
                  ['Date', new Date(selected.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
                  ['Time', selected.time],
                  ['Venue', selected.venue],
                  ['RSVP deadline', new Date(selected.rsvpDeadline + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
                  ['Capacity', selected.maxSeats ? `${getEventRSVPs(selected.id)} / ${selected.maxSeats}` : 'Open'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <span className="text-xs text-slate-400 font-medium">{k}</span>
                    <span className="text-xs font-bold text-slate-800 text-right">{v}</span>
                  </div>
                ))}
                {/* RSVP list for admin */}
                {isAdmin && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirmed attendees</p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {registrations.filter(r => r.eventId === selected.id && r.status === 'Yes').length === 0
                        ? <p className="text-xs text-slate-400 italic">No RSVPs yet</p>
                        : registrations.filter(r => r.eventId === selected.id && r.status === 'Yes').map(r => (
                          <div key={r.id} className="flex items-center gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {r.childName}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
                <button onClick={() => setSelected(null)} className="w-full py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-slate-900">Create new event</h3>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-3 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Event title</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Annual Sports Day"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: 'none' }} placeholder="Tell parents what to expect..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Time</label>
                    <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="09:00 AM"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Venue</label>
                    <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. Main Hall"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Max seats</label>
                    <input type="number" value={form.maxSeats} onChange={e => setForm(f => ({ ...f, maxSeats: e.target.value }))} placeholder="Leave blank = unlimited"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">RSVP deadline</label>
                    <input type="date" value={form.rsvpDeadline} onChange={e => setForm(f => ({ ...f, rsvpDeadline: e.target.value }))} required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Target class</label>
                    <select value={form.targetClass} onChange={e => setForm(f => ({ ...f, targetClass: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]">
                      {CLASS_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-2xl bg-[#1B4332] hover:bg-green-900 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Create event</>}
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
