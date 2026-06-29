import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, User, Phone, Briefcase, IndianRupee,
  CheckCircle2, X, Check, Edit2, Trash2, Users, Award, Clock
} from 'lucide-react';

type StaffRole = 'Lead Teacher' | 'Teacher' | 'Caregiver' | 'Helper' | 'Nurse' | 'Admin Staff' | 'Cook' | 'Security';
type StaffStatus = 'Active' | 'Part-time' | 'On Leave' | 'Inactive';

interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  email?: string;
  batchAssigned: string;
  salary: number;
  joinDate: string;
  status: StaffStatus;
  qualification?: string;
  emergencyContact?: string;
}

const ROLES: StaffRole[] = ['Lead Teacher', 'Teacher', 'Caregiver', 'Helper', 'Nurse', 'Admin Staff', 'Cook', 'Security'];
const STATUSES: StaffStatus[] = ['Active', 'Part-time', 'On Leave', 'Inactive'];
const BATCHES = ['All Batches', 'Toddler A', 'Toddler B', 'Nursery', 'Pre-KG', 'KG'];

const STAFF_STORAGE_KEY = 'aangan_staff_members';

function getStored(): StaffMember[] {
  try { return JSON.parse(localStorage.getItem(STAFF_STORAGE_KEY) || 'null') || DEFAULT_STAFF; }
  catch { return DEFAULT_STAFF; }
}
function setStored(data: StaffMember[]) {
  localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(data));
}

const DEFAULT_STAFF: StaffMember[] = [];

const STATUS_COLORS: Record<StaffStatus, string> = {
  'Active': 'bg-emerald-100 text-emerald-700',
  'Part-time': 'bg-amber-100 text-amber-700',
  'On Leave': 'bg-green-100 text-amber-700',
  'Inactive': 'bg-slate-100 text-slate-500',
};

const AVATAR_COLORS = ['bg-green-100 text-green-700', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-teal-100 text-teal-600', 'bg-amber-100 text-amber-600', 'bg-indigo-100 text-indigo-600'];

const emptyForm = (): Omit<StaffMember, 'id'> => ({
  name: '', role: 'Teacher', phone: '', email: '', batchAssigned: 'All Batches',
  salary: 0, joinDate: new Date().toISOString().split('T')[0], status: 'Active',
  qualification: '', emergencyContact: '',
});

export const StaffPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<Omit<StaffMember, 'id'>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { setStaff(getStored()); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const openAdd = () => { setEditTarget(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (s: StaffMember) => { setEditTarget(s); setForm({ name: s.name, role: s.role, phone: s.phone, email: s.email || '', batchAssigned: s.batchAssigned, salary: s.salary, joinDate: s.joinDate, status: s.status, qualification: s.qualification || '', emergencyContact: s.emergencyContact || '' }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const current = getStored();
      if (editTarget) {
        const updated = current.map(s => s.id === editTarget.id ? { ...form, id: editTarget.id } : s);
        setStored(updated); setStaff(updated);
        if (selectedStaff?.id === editTarget.id) setSelectedStaff({ ...form, id: editTarget.id });
        showToast(`${form.name}'s profile updated!`);
      } else {
        const newS: StaffMember = { ...form, id: 'staff-' + Date.now() };
        const updated = [...current, newS];
        setStored(updated); setStaff(updated);
        showToast(`${form.name} added to staff!`);
      }
      setShowModal(false);
    } finally { setSaving(false); }
  };

  const handleDelete = (s: StaffMember) => {
    if (!window.confirm(`Remove ${s.name} from staff?`)) return;
    const updated = getStored().filter(m => m.id !== s.id);
    setStored(updated); setStaff(updated);
    if (selectedStaff?.id === s.id) setSelectedStaff(null);
    showToast(`${s.name} removed.`);
  };

  const filtered = staff.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'All' || s.role === filterRole;
    return matchSearch && matchRole;
  });

  const activeCount = staff.filter(s => s.status === 'Active').length;
  const totalSalary = staff.filter(s => s.status !== 'Inactive').reduce((a, s) => a + s.salary, 0);
  const ratio = staff.filter(s => s.status === 'Active' || s.status === 'Part-time').length;

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
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Staff Management</h2>
          <p className="text-xs text-[#1B4332] font-semibold uppercase tracking-wider">Directory · Roles · Salary</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-[#1B4332] hover:bg-green-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-sm shadow-green-900/20 transition-colors">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total staff', value: staff.length, icon: Users, color: 'text-green-700', bg: 'bg-amber-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'On duty', value: ratio, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Monthly payroll', value: '₹' + totalSalary.toLocaleString('en-IN'), icon: IndianRupee, color: 'text-purple-600', bg: 'bg-purple-50' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or role..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-green-50 transition-all" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-[#1B4332] transition-all">
          <option value="All">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Staff grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-14 bg-white rounded-3xl border border-slate-200/60">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">No staff found</p>
          </div>
        ) : filtered.map((s, i) => {
          const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          const avColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedStaff(s)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl ${avColor} text-sm font-black flex items-center justify-center shrink-0`}>{initials}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{s.role}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${STATUS_COLORS[s.status]}`}>{s.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Batch</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{s.batchAssigned}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Salary</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">₹{s.salary.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <Phone className="w-3 h-3" /> {s.phone}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Staff detail panel */}
      <AnimatePresence>
        {selectedStaff && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelectedStaff(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-gradient-to-br from-[#4F8EF7] to-indigo-600 p-5 text-white text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/20 text-white text-xl font-black flex items-center justify-center mx-auto mb-2">
                  {selectedStaff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <h3 className="font-black text-lg">{selectedStaff.name}</h3>
                <p className="text-blue-100 text-xs">{selectedStaff.role}</p>
                <span className={`inline-block mt-2 text-[10px] font-bold px-3 py-1 rounded-full ${STATUS_COLORS[selectedStaff.status]}`}>{selectedStaff.status}</span>
              </div>
              <div className="p-5 space-y-2.5">
                {[
                  ['Batch', selectedStaff.batchAssigned],
                  ['Phone', selectedStaff.phone],
                  ['Email', selectedStaff.email || '—'],
                  ['Qualification', selectedStaff.qualification || '—'],
                  ['Monthly salary', '₹' + selectedStaff.salary.toLocaleString('en-IN')],
                  ['Join date', new Date(selectedStaff.joinDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
                  ['Emergency contact', selectedStaff.emergencyContact || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-400 font-medium">{k}</span>
                    <span className="text-xs font-bold text-slate-800 text-right max-w-[60%] truncate">{v}</span>
                  </div>
                ))}
                {isAdmin && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { openEdit(selectedStaff); setSelectedStaff(null); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl bg-amber-50 hover:bg-green-100 text-green-700 text-xs font-bold transition-colors">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(selectedStaff)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )}
                <button onClick={() => setSelectedStaff(null)}
                  className="w-full py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <h3 className="font-black text-slate-900">{editTarget ? 'Edit staff profile' : 'Add new staff member'}</h3>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-3 overflow-y-auto">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Full name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Staff member's name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-green-50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Role</label>
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as StaffRole }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]">
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StaffStatus }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required placeholder="Mobile number"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Salary (₹)</label>
                    <input type="number" min="1" value={form.salary || ''} onChange={e => setForm(f => ({ ...f, salary: Math.max(0, Number(e.target.value)) }))} placeholder="Monthly"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Batch assigned</label>
                    <select value={form.batchAssigned} onChange={e => setForm(f => ({ ...f, batchAssigned: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]">
                      {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Join date</label>
                    <input type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Qualification</label>
                  <input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="e.g. B.Ed, Diploma in ECE"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Optional"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Emergency contact</label>
                    <input value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} placeholder="Optional"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#1B4332]" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-2xl bg-[#1B4332] hover:bg-green-900 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> {editTarget ? 'Save changes' : 'Add staff'}</>}
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
