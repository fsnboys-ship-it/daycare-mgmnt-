import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { IncidentReport, IncidentType, IncidentStatus, Child } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, AlertTriangle, CheckCircle2, Clock, Search, X, Check,
  User, MapPin, FileText, Shield, AlertOctagon, Activity
} from 'lucide-react';

const INCIDENT_TYPES: IncidentType[] = ['Injury', 'Behavioral', 'Illness', 'Other'];
const STATUSES: IncidentStatus[] = ['Reported', 'Under Review', 'Resolved'];

const TYPE_STYLES: Record<IncidentType, string> = {
  Injury: 'bg-red-100 text-red-700',
  Behavioral: 'bg-amber-100 text-amber-700',
  Illness: 'bg-green-100 text-amber-700',
  Other: 'bg-slate-100 text-slate-600',
};
const STATUS_STYLES: Record<IncidentStatus, string> = {
  Reported: 'bg-rose-100 text-rose-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
};

export const IncidentsPage: React.FC = () => {
  const { currentUser, isAdmin, isStaff, isParent } = useAuth();
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    childId: '', date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type: 'Injury' as IncidentType, location: '', description: '',
    actionTaken: '', witness: '', status: 'Reported' as IncidentStatus,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kids, reps] = await Promise.all([dbService.getChildren(), dbService.getIncidentReports()]);
      setChildren(kids);
      const filtered = isParent && currentUser?.assignedChildId
        ? reps.filter(r => r.childId === currentUser.assignedChildId)
        : reps;
      setIncidents(filtered);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const u = dbService.subscribe('incident_reports', fetchData);
    return () => u();
  }, [currentUser]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childId || !form.description || !form.actionTaken) return;
    setSaving(true);
    try {
      const child = children.find(c => c.id === form.childId);
      await dbService.createIncidentReport({
        ...form,
        childName: child?.name || '',
      });
      setShowModal(false);
      setForm({ childId: '', date: new Date().toISOString().split('T')[0], time: '', type: 'Injury', location: '', description: '', actionTaken: '', witness: '', status: 'Reported' });
      showToast('Incident report created and parent notified!');
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleAcknowledge = async (inc: IncidentReport) => {
    if (!currentUser) return;
    try {
      await dbService.acknowledgeIncident(inc.id, currentUser.name);
      showToast('Incident acknowledged. Thank you.');
      setSelected(null);
    } catch (e) { console.error(e); }
  };

  const filtered = incidents.filter(i => {
    const matchSearch = !search || i.childName.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || i.type === filterType;
    const matchStatus = filterStatus === 'All' || i.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const unresolvedCount = incidents.filter(i => i.status !== 'Resolved').length;
  const unackCount = incidents.filter(i => !i.parentAcknowledged).length;

  if (loading) return (
    <div className="text-center py-16">
      <div className="w-8 h-8 border-[3px] border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto mb-4" />
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading incident reports...</p>
    </div>
  );

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
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Incident Reports</h2>
          <p className="text-xs text-[#1B4332] font-semibold uppercase tracking-wider">Safety log · Parent acknowledgment</p>
        </div>
        {(isAdmin || isStaff) && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#1B4332] hover:bg-green-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-sm shadow-green-900/20 transition-colors">
            <Plus className="w-4 h-4" /> Log Incident
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total logged', value: incidents.length, color: 'text-slate-700', bg: 'bg-slate-50', icon: FileText },
          { label: 'Unresolved', value: unresolvedCount, color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertOctagon },
          { label: 'Unacknowledged', value: unackCount, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
          { label: 'Resolved', value: incidents.filter(i => i.status === 'Resolved').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
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

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by child name or description..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-green-50" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-[#1B4332]">
          <option value="All">All types</option>
          {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-[#1B4332]">
          <option value="All">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Incidents list */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-slate-200/60">
          <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-400">No incidents found</p>
          <p className="text-xs text-slate-300 mt-1">All clear — no incidents logged for this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inc => (
            <motion.div key={inc.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${!inc.parentAcknowledged && isParent ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200/60'}`}
              onClick={() => setSelected(inc)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TYPE_STYLES[inc.type]}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{inc.childName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${TYPE_STYLES[inc.type]}`}>{inc.type}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${STATUS_STYLES[inc.status]}`}>{inc.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{inc.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {inc.date} · {inc.time}</span>
                      {inc.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {inc.location}</span>}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {inc.parentAcknowledged
                    ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Acknowledged</span>
                    : <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600"><AlertTriangle className="w-3 h-3" /> Pending ack</span>
                  }
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-black text-slate-900">Incident Report</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selected.childName} · {selected.date}</p>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto">
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${TYPE_STYLES[selected.type]}`}>{selected.type}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
                </div>
                {[
                  ['Date & time', `${selected.date} at ${selected.time}`],
                  ['Location', selected.location || '—'],
                  ['Description', selected.description],
                  ['Action taken', selected.actionTaken],
                  ['Witness', selected.witness || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="border-b border-slate-100 pb-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k}</p>
                    <p className="text-xs text-slate-800 leading-relaxed">{v}</p>
                  </div>
                ))}
                <div className={`p-3 rounded-2xl ${selected.parentAcknowledged ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 ${selected.parentAcknowledged ? 'text-emerald-600' : 'text-amber-600'}">
                    {selected.parentAcknowledged ? '✓ Parent acknowledged' : '⚠ Awaiting parent acknowledgment'}
                  </p>
                  {selected.parentAcknowledged && selected.parentAcknowledgeName && (
                    <p className="text-xs text-emerald-700">By {selected.parentAcknowledgeName}</p>
                  )}
                </div>
                {isParent && !selected.parentAcknowledged && (
                  <button onClick={() => handleAcknowledge(selected)}
                    className="w-full py-2.5 rounded-2xl bg-[#1B4332] hover:bg-green-900 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Acknowledge this incident
                  </button>
                )}
                <button onClick={() => setSelected(null)}
                  className="w-full py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Incident Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-black text-slate-900">Log new incident</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Parent will be notified automatically</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-3 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Child</label>
                  <select value={form.childId} onChange={e => setForm(f => ({ ...f, childId: e.target.value }))} required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]">
                    <option value="">Select child...</option>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Time</label>
                    <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="e.g. 10:30 AM"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as IncidentType }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]">
                      {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Location</label>
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Playground"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required rows={2}
                    placeholder="What happened?" style={{ resize: 'none' }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Action taken</label>
                  <textarea value={form.actionTaken} onChange={e => setForm(f => ({ ...f, actionTaken: e.target.value }))} required rows={2}
                    placeholder="First aid, called parents, etc." style={{ resize: 'none' }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Witness (optional)</label>
                  <input value={form.witness} onChange={e => setForm(f => ({ ...f, witness: e.target.value }))} placeholder="Staff member who witnessed"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><AlertTriangle className="w-4 h-4" /> Log incident</>}
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
