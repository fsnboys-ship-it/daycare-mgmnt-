import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/firebase';
import { Child, Attendance, Payment } from '../types';
import { motion } from 'motion/react';
import {
  BarChart3, TrendingUp, Users, Calendar,
  FileSpreadsheet, Download, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, IndianRupee
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }

function toCSV(rows: string[][], filename: string) {
  const content = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const ReportsPage: React.FC = () => {
  const today = new Date();
  const [children, setChildren] = useState<Child[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'fees' | 'children'>('attendance');

  // Date range: default to current month
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return d.toISOString().split('T')[0];
  });
  const [rangeEnd, setRangeEnd] = useState(() => today.toISOString().split('T')[0]);

  const fetch = async () => {
    try {
      setLoading(true);
      const [kids, pays] = await Promise.all([dbService.getChildren(), dbService.getPayments()]);
      setChildren(kids);
      setPayments(pays);

      // Fetch attendance for date range (capped at 90 days to prevent browser hang)
      const startD = new Date(rangeStart + 'T00:00:00');
      const endD = new Date(rangeEnd + 'T00:00:00');
      const diffDays = Math.ceil((endD.getTime() - startD.getTime()) / 86400000);
      const cappedEnd = diffDays > 90 ? new Date(startD.getTime() + 90 * 86400000) : endD;
      const attList: Attendance[] = [];
      for (let d = new Date(startD); d <= cappedEnd; d.setDate(d.getDate() + 1)) {
        const str = d.toISOString().split('T')[0];
        const dayAtt = await dbService.getAttendanceForDate(str);
        attList.push(...dayAtt);
      }
      setAllAttendance(attList);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [rangeStart, rangeEnd]);

  // -- Attendance stats --
  const attByChild = useMemo(() => {
    const map: Record<string, { name: string; present: number; absent: number; late: number; total: number }> = {};
    children.forEach(c => { map[c.id] = { name: c.name, present: 0, absent: 0, late: 0, total: 0 }; });
    allAttendance.forEach(a => {
      if (!map[a.childId]) return;
      map[a.childId].total++;
      if (a.status === 'Present' || a.status === 'Picked Up') map[a.childId].present++;
      else if (a.status === 'Absent') map[a.childId].absent++;
      else if (a.status === 'Late') map[a.childId].late++;
    });
    return Object.values(map);
  }, [allAttendance, children]);

  const uniqueDates = useMemo(() => [...new Set(allAttendance.map(a => a.date))].sort(), [allAttendance]);
  const totalPresent = allAttendance.filter(a => a.status === 'Present' || a.status === 'Picked Up').length;
  const totalAbsent = allAttendance.filter(a => a.status === 'Absent').length;
  const avgRate = uniqueDates.length > 0 && children.length > 0
    ? Math.round((totalPresent / (uniqueDates.length * children.length)) * 100)
    : 0;

  // -- Fee stats --
  const feeStats = useMemo(() => {
    const inRange = payments.filter(p => p.dueDate >= rangeStart && p.dueDate <= rangeEnd);
    return {
      total: inRange.reduce((s, p) => s + p.amount, 0),
      collected: inRange.reduce((s, p) => s + p.paidAmount, 0),
      pending: inRange.reduce((s, p) => s + p.pendingAmount, 0),
      paid: inRange.filter(p => p.status === 'Paid').length,
      overdue: inRange.filter(p => p.status !== 'Paid' && new Date(p.dueDate) < today).length,
    };
  }, [payments, rangeStart, rangeEnd]);

  // -- Children stats --
  const genderStats = useMemo(() => ({
    male: children.filter(c => c.gender === 'Male').length,
    female: children.filter(c => c.gender === 'Female').length,
    other: children.filter(c => c.gender !== 'Male' && c.gender !== 'Female').length,
  }), [children]);

  const batchStats = useMemo(() => {
    const map: Record<string, number> = {};
    children.forEach(c => { map[c.batch || 'Unassigned'] = (map[c.batch || 'Unassigned'] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [children]);

  // -- CSV exports --
  const exportAttendanceCSV = () => {
    const header = ['Child Name', 'Date', 'Status', 'Check-in Time', 'Check-out Time'];
    const rows = allAttendance.map(a => [a.childName || '', a.date, a.status, a.checkInTime || '', a.checkOutTime || '']);
    toCSV([header, ...rows], `aangan_attendance_${rangeStart}_to_${rangeEnd}.csv`);
  };

  const exportFeeCSV = () => {
    const inRange = payments.filter(p => p.dueDate >= rangeStart && p.dueDate <= rangeEnd);
    const header = ['Student', 'Fee Name', 'Amount', 'Paid', 'Pending', 'Due Date', 'Payment Date', 'Method', 'Status', 'Receipt'];
    const rows = inRange.map(p => [p.childName, p.feeName, p.amount, p.paidAmount, p.pendingAmount, p.dueDate, p.paymentDate || '', p.paymentMethod || '', p.status, p.receiptId || '']);
    toCSV([header, ...rows], `aangan_fees_${rangeStart}_to_${rangeEnd}.csv`);
  };

  const exportChildrenCSV = () => {
    const header = ['Name', 'DOB', 'Gender', 'Batch', 'Parent', 'Phone', 'Blood Group', 'Enrollment Date'];
    const rows = children.map(c => [c.name, c.dob || '', c.gender || '', c.batch || '', c.parentName || '', c.parentPhone || '', c.bloodGroup || '', c.enrollmentDate || '']);
    toCSV([header, ...rows], `aangan_children_directory.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Reports &amp; Analytics</h2>
          <p className="text-xs text-[#0098db] font-semibold uppercase tracking-wider">Attendance · Fees · Enrollment · Export</p>
        </div>
      </div>

      {/* Date range picker */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">From</label>
          <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#0098db]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">To</label>
          <input type="date" value={rangeEnd} min={rangeStart} onChange={e => setRangeEnd(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#0098db]" />
        </div>
        {/* Quick shortcuts */}
        <div className="flex gap-1.5 ml-auto">
          {[
            { label: 'Today', start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] },
            { label: 'This month', start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0], end: today.toISOString().split('T')[0] },
            { label: 'Last month', start: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0], end: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0] },
          ].map(q => (
            <button key={q.label} onClick={() => { setRangeStart(q.start); setRangeEnd(q.end); }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-[#0098db] hover:text-white text-[10px] font-bold text-slate-600 transition-colors">
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {(['attendance', 'fees', 'children'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize ${activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'attendance' ? 'Attendance' : t === 'fees' ? 'Fees' : 'Children'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-[3px] border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Generating report...</p>
        </div>
      ) : (
        <>
          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'School days', value: uniqueDates.length, icon: Calendar, color: 'text-green-700', bg: 'bg-amber-50' },
                  { label: 'Avg attendance', value: `${avgRate}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Present records', value: totalPresent, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Absent records', value: totalAbsent, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
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

              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">Per-student attendance</h3>
                  <button onClick={exportAttendanceCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition-colors">
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                </div>
                {attByChild.length === 0 ? (
                  <p className="text-center py-10 text-xs text-slate-400">No attendance data for this period</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {attByChild.sort((a, b) => b.present - a.present).map(row => {
                      const rate = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
                      return (
                        <div key={row.name} className="flex items-center gap-4 px-5 py-3">
                          <div className="w-7 h-7 rounded-xl bg-amber-50 text-[#0098db] text-[10px] font-black flex items-center justify-center shrink-0">
                            {row.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{row.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-600 rounded-full" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 shrink-0">{rate}%</span>
                            </div>
                          </div>
                          <div className="flex gap-3 text-[10px] shrink-0">
                            <span className="text-emerald-600 font-bold">{row.present}P</span>
                            <span className="text-rose-600 font-bold">{row.absent}A</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FEES TAB */}
          {activeTab === 'fees' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total billed', value: formatINR(feeStats.total), icon: IndianRupee, color: 'text-slate-700', bg: 'bg-slate-50' },
                  { label: 'Collected', value: formatINR(feeStats.collected), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Pending', value: formatINR(feeStats.pending), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Overdue', value: feeStats.overdue, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
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

              {/* Collection rate bar */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700">Collection rate</p>
                  <p className="text-xs font-black text-emerald-600">
                    {feeStats.total > 0 ? Math.round((feeStats.collected / feeStats.total) * 100) : 0}%
                  </p>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full transition-all"
                    style={{ width: `${feeStats.total > 0 ? (feeStats.collected / feeStats.total) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">Payment register</h3>
                  <button onClick={exportFeeCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition-colors">
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {payments.filter(p => p.dueDate >= rangeStart && p.dueDate <= rangeEnd).length === 0 ? (
                    <p className="text-center py-10 text-xs text-slate-400">No payments in this period</p>
                  ) : payments.filter(p => p.dueDate >= rangeStart && p.dueDate <= rangeEnd).map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.childName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.feeName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900">{formatINR(p.amount)}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${p.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CHILDREN TAB */}
          {activeTab === 'children' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total enrolled', value: children.length, icon: Users, color: 'text-green-700', bg: 'bg-amber-50' },
                  { label: 'Boys', value: genderStats.male, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Girls', value: genderStats.female, icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
                  { label: 'Batches', value: batchStats.length, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-900 mb-3">Students by batch</h4>
                  <div className="space-y-2.5">
                    {batchStats.map(([batch, count]) => (
                      <div key={batch}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700">{batch}</span>
                          <span className="font-black text-slate-900">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0098db] rounded-full" style={{ width: `${children.length > 0 ? (count / children.length) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-sm text-slate-900">Full directory</h4>
                    <button onClick={exportChildrenCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition-colors">
                      <Download className="w-3 h-3" /> Export CSV
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {children.map(c => (
                      <div key={c.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50">
                        <div className="w-6 h-6 rounded-lg bg-green-100 text-[#0098db] text-[9px] font-black flex items-center justify-center shrink-0">
                          {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{c.batch || 'No batch'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
