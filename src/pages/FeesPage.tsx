import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/firebase';
import { Child, Fee, Payment, PaymentMethod, FeeFrequency } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Search,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  X,
  Check,
  Wallet,
  Users,
  User,
  Trash2,
  IndianRupee,
  MessageCircle,
  Filter,
  FileText,
  TrendingUp,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type FilterStatus = 'All' | 'Unpaid' | 'Partial' | 'Paid';
type ActiveView = 'payments' | 'fees';

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Online'];
const FEE_FREQUENCIES: FeeFrequency[] = ['Monthly', 'Quarterly', 'Yearly', 'One Time'];

function formatINR(amount: number) {
  return '₹' + amount.toLocaleString('en-IN');
}

function getOverdueDays(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return diff;
}

function buildWhatsAppMessage(payment: Payment, child: Child | undefined) {
  const parentName = child?.parentName || 'Parent';
  const parentPhone = child?.parentPhone?.replace(/\D/g, '') || '';
  const overdue = getOverdueDays(payment.dueDate);
  const dueLabel = overdue > 0 ? `*${overdue} days overdue*` : `due on ${new Date(payment.dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const msg = `Hello ${parentName},\n\nThis is a reminder from Aangan Daycare.\n\nFee: *${payment.feeName}*\nStudent: *${payment.childName}*\nAmount due: *${formatINR(payment.pendingAmount)}*\nStatus: ${dueLabel}\n\nKindly arrange payment at your earliest convenience. Thank you! 🙏\n\n_Aangan Daycare Management_`;
  return `https://wa.me/${parentPhone}?text=${encodeURIComponent(msg)}`;
}

export const FeesPage: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  const [children, setChildren] = useState<Child[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('payments');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Create Fee modal state
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeFormName, setFeeFormName] = useState('Monthly Tuition');
  const [feeFormAmount, setFeeFormAmount] = useState('');
  const [feeFormDueDate, setFeeFormDueDate] = useState('');
  const [feeFormFreq, setFeeFormFreq] = useState<FeeFrequency>('Monthly');
  const [feeFormTarget, setFeeFormTarget] = useState<'Individual' | 'Entire Class'>('Entire Class');
  const [feeFormChildId, setFeeFormChildId] = useState('');
  const [feeFormSaving, setFeeFormSaving] = useState(false);

  // Record Payment modal state
  const [paymentTarget, setPaymentTarget] = useState<Payment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Receipt preview state
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kids, allFees, allPayments] = await Promise.all([
        dbService.getChildren(),
        dbService.getFees(),
        dbService.getPayments()
      ]);
      setChildren(kids);
      setFees(allFees);
      setPayments(allPayments);
    } catch (e) {
      console.error('Failed to load fee data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const u1 = dbService.subscribe('fees', fetchData);
    const u2 = dbService.subscribe('payments', fetchData);
    const u3 = dbService.subscribe('children', fetchData);
    return () => { u1(); u2(); u3(); };
  }, []);

  // --- Derived stats ---
  const totalDue = useMemo(() => payments.filter(p => p.status !== 'Paid').reduce((s, p) => s + p.pendingAmount, 0), [payments]);
  const totalCollected = useMemo(() => payments.reduce((s, p) => s + p.paidAmount, 0), [payments]);
  const overdueCount = useMemo(() => payments.filter(p => p.status !== 'Paid' && getOverdueDays(p.dueDate) > 0).length, [payments]);
  const paidCount = useMemo(() => payments.filter(p => p.status === 'Paid').length, [payments]);

  // --- Filtered payments list ---
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchSearch = !searchTerm ||
        p.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.feeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchStatus;
    }).sort((a, b) => {
      // Overdue first, then Partial, then Unpaid, then Paid
      const order: Record<string, number> = { Unpaid: 0, Partial: 1, Paid: 2 };
      const aOverdue = a.status !== 'Paid' && getOverdueDays(a.dueDate) > 0 ? -1 : order[a.status] ?? 3;
      const bOverdue = b.status !== 'Paid' && getOverdueDays(b.dueDate) > 0 ? -1 : order[b.status] ?? 3;
      return aOverdue - bOverdue;
    });
  }, [payments, searchTerm, filterStatus]);

  // --- Create Fee ---
  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeFormName || !feeFormAmount || !feeFormDueDate) return;
    if (feeFormTarget === 'Individual' && !feeFormChildId) return;
    setFeeFormSaving(true);
    try {
      const newFee = await dbService.createFee({
        name: feeFormName,
        amount: Number(feeFormAmount),
        dueDate: feeFormDueDate,
        frequency: feeFormFreq,
        targetType: feeFormTarget,
        targetId: feeFormTarget === 'Individual' ? feeFormChildId : undefined,
      });

      // Auto-generate payment records
      const targetKids = feeFormTarget === 'Entire Class'
        ? children
        : children.filter(c => c.id === feeFormChildId);

      const newPayments = targetKids.map(child => ({
        feeId: newFee.id,
        feeName: newFee.name,
        childId: child.id,
        childName: child.name,
        amount: newFee.amount,
        paidAmount: 0,
        pendingAmount: newFee.amount,
        dueDate: newFee.dueDate,
        status: 'Unpaid' as const,
      }));
      await dbService.addPayments(newPayments);

      setShowFeeModal(false);
      setFeeFormName('Monthly Tuition');
      setFeeFormAmount('');
      setFeeFormDueDate('');
      setFeeFormFreq('Monthly');
      setFeeFormTarget('Entire Class');
      setFeeFormChildId('');
      showToast(`Fee "${newFee.name}" created for ${targetKids.length} student${targetKids.length !== 1 ? 's' : ''}!`);
    } catch (e) {
      console.error('Failed to create fee', e);
    } finally {
      setFeeFormSaving(false);
    }
  };

  // --- Record Payment ---
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget || !payAmount) return;
    const amt = Number(payAmount);
    if (amt <= 0 || amt > paymentTarget.pendingAmount) return;
    setPaymentSaving(true);
    try {
      await dbService.recordPayment(paymentTarget.id, amt, payMethod);
      setPaymentTarget(null);
      setPayAmount('');
      setPayMethod('Cash');
      showToast(`Payment of ${formatINR(amt)} recorded for ${paymentTarget.childName}!`);
    } catch (e) {
      console.error('Failed to record payment', e);
    } finally {
      setPaymentSaving(false);
    }
  };

  // --- Delete Fee ---
  const handleDeleteFee = async (feeId: string, feeName: string) => {
    if (!window.confirm(`Delete fee "${feeName}"? This will remove all related payment records.`)) return;
    await dbService.deleteFee(feeId);
    showToast(`Fee "${feeName}" deleted.`);
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-[3px] border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading fee records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Fees &amp; Billing</h2>
          <p className="text-xs text-[#0098db] font-semibold uppercase tracking-wider">Fee Register · Payment Tracking</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowFeeModal(true)}
            className="flex items-center gap-2 bg-[#0098db] hover:bg-green-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-sm shadow-green-900/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Fee
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total pending', value: formatINR(totalDue), icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Collected', value: formatINR(totalCollected), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Overdue invoices', value: String(overdueCount), icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Fully paid', value: String(paidCount), icon: CheckCircle2, color: 'text-green-700', bg: 'bg-amber-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm">
            <div className={`w-8 h-8 ${card.bg} rounded-xl flex items-center justify-center mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
            <p className={`text-lg font-black mt-0.5 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {(['payments', 'fees'] as ActiveView[]).map(v => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize ${
              activeView === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {v === 'payments' ? 'Payment Register' : 'Fee Structures'}
          </button>
        ))}
      </div>

      {/* PAYMENT REGISTER VIEW */}
      {activeView === 'payments' && (
        <div className="space-y-4">
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student or fee name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium outline-none focus:border-[#0098db] focus:ring-2 focus:ring-green-50 transition-all"
              />
            </div>
            <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1">
              {(['All', 'Unpaid', 'Partial', 'Paid'] as FilterStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-colors ${
                    filterStatus === s
                      ? s === 'Unpaid' ? 'bg-rose-500 text-white'
                      : s === 'Partial' ? 'bg-amber-500 text-white'
                      : s === 'Paid' ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Payments list */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-3xl border border-slate-200/60">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">No payment records found</p>
              <p className="text-xs text-slate-300 mt-1">Create a fee structure to generate payment records</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Student</span>
                <span>Fee</span>
                <span>Amount</span>
                <span>Due date</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => {
                  const child = children.find(c => c.id === payment.childId);
                  const overdueDays = getOverdueDays(payment.dueDate);
                  const isOverdue = payment.status !== 'Paid' && overdueDays > 0;
                  const initials = payment.childName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`px-5 py-3.5 ${isOverdue ? 'bg-rose-50/30' : ''}`}
                    >
                      {/* Mobile layout */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#0098db] text-xs font-black flex items-center justify-center">{initials}</div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{payment.childName}</p>
                              <p className="text-[10px] text-slate-400">{payment.feeName}</p>
                            </div>
                          </div>
                          <StatusBadge status={payment.status} overdue={isOverdue} overdueDays={overdueDays} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-black text-slate-900">{formatINR(payment.amount)}</p>
                            {payment.paidAmount > 0 && <p className="text-[10px] text-emerald-600">Paid: {formatINR(payment.paidAmount)}</p>}
                          </div>
                          <div className="flex gap-1.5">
                            {payment.status !== 'Paid' && (
                              <>
                                <button
                                  onClick={() => { setPaymentTarget(payment); setPayAmount(String(payment.pendingAmount)); }}
                                  className="flex items-center gap-1 bg-[#0098db] hover:bg-green-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-colors"
                                >
                                  <IndianRupee className="w-3 h-3" /> Pay
                                </button>
                                <a
                                  href={buildWhatsAppMessage(payment, child)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-colors"
                                >
                                  <MessageCircle className="w-3 h-3" /> WA
                                </a>
                              </>
                            )}
                            {payment.receiptId && (
                              <button
                                onClick={() => setReceiptPayment(payment)}
                                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-colors"
                              >
                                <FileText className="w-3 h-3" /> Receipt
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desktop table row */}
                      <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 items-center">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#0098db] text-xs font-black flex items-center justify-center shrink-0">{initials}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{payment.childName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{child?.parentName || '—'}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 font-medium truncate">{payment.feeName}</p>
                        <div>
                          <p className="text-xs font-black text-slate-900">{formatINR(payment.amount)}</p>
                          {payment.pendingAmount > 0 && payment.pendingAmount < payment.amount && (
                            <p className="text-[10px] text-rose-500">Pending: {formatINR(payment.pendingAmount)}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-slate-700">{new Date(payment.dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                          {isOverdue && <p className="text-[10px] text-rose-500 font-bold">{overdueDays}d overdue</p>}
                        </div>
                        <StatusBadge status={payment.status} overdue={isOverdue} overdueDays={overdueDays} />
                        <div className="flex gap-1.5 justify-end">
                          {payment.status !== 'Paid' && (
                            <>
                              <button
                                onClick={() => { setPaymentTarget(payment); setPayAmount(String(payment.pendingAmount)); }}
                                title="Record payment"
                                className="w-7 h-7 rounded-xl bg-[#0098db] hover:bg-green-900 text-white flex items-center justify-center transition-colors"
                              >
                                <IndianRupee className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={buildWhatsAppMessage(payment, child)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Send WhatsApp reminder"
                                className="w-7 h-7 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          {payment.receiptId && (
                            <button
                              onClick={() => setReceiptPayment(payment)}
                              title="View receipt"
                              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FEE STRUCTURES VIEW */}
      {activeView === 'fees' && (
        <div className="space-y-3">
          {fees.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-3xl border border-slate-200/60">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">No fee structures yet</p>
              <p className="text-xs text-slate-300 mt-1">Click "Create Fee" to add your first fee structure</p>
            </div>
          ) : (
            fees.map(fee => {
              const relatedPayments = payments.filter(p => p.feeId === fee.id);
              const collected = relatedPayments.reduce((s, p) => s + p.paidAmount, 0);
              const total = relatedPayments.reduce((s, p) => s + p.amount, 0);
              const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

              return (
                <motion.div
                  key={fee.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5 text-[#0098db]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900">{fee.name}</h4>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700">{formatINR(fee.amount)}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">{fee.frequency}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 flex items-center gap-1">
                            {fee.targetType === 'Entire Class' ? <><Users className="w-2.5 h-2.5" /> All students</> : <><User className="w-2.5 h-2.5" /> Individual</>}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 flex items-center gap-1">
                            <CalendarDays className="w-2.5 h-2.5" />
                            Due {new Date(fee.dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span>Collection progress</span>
                            <span className="font-bold text-slate-700">{formatINR(collected)} / {formatINR(total)} ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-600 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteFee(fee.id, fee.name)}
                        className="w-7 h-7 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors shrink-0 mt-0.5"
                        title="Delete fee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* CREATE FEE MODAL */}
      <AnimatePresence>
        {showFeeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowFeeModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-900">Create fee structure</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Auto-generates payment records for all assigned students</p>
                </div>
                <button onClick={() => setShowFeeModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateFee} className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Fee name</label>
                  <input
                    type="text"
                    value={feeFormName}
                    onChange={e => setFeeFormName(e.target.value)}
                    placeholder="e.g. Monthly Tuition"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db] focus:ring-2 focus:ring-green-50 transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={feeFormAmount}
                      onChange={e => setFeeFormAmount(e.target.value)}
                      placeholder="e.g. 3500"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db] focus:ring-2 focus:ring-green-50 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Due date</label>
                    <input
                      type="date"
                      value={feeFormDueDate}
                      onChange={e => setFeeFormDueDate(e.target.value)}
                      min={todayStr}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db] focus:ring-2 focus:ring-green-50 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Frequency</label>
                    <select
                      value={feeFormFreq}
                      onChange={e => setFeeFormFreq(e.target.value as FeeFrequency)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db] focus:ring-2 focus:ring-green-50 transition-all"
                    >
                      {FEE_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Applies to</label>
                    <select
                      value={feeFormTarget}
                      onChange={e => setFeeFormTarget(e.target.value as 'Individual' | 'Entire Class')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db] focus:ring-2 focus:ring-green-50 transition-all"
                    >
                      <option value="Entire Class">All students</option>
                      <option value="Individual">One student</option>
                    </select>
                  </div>
                </div>
                {feeFormTarget === 'Individual' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Select student</label>
                    <select
                      value={feeFormChildId}
                      onChange={e => setFeeFormChildId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db] focus:ring-2 focus:ring-green-50 transition-all"
                      required
                    >
                      <option value="">Choose student...</option>
                      {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFeeModal(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={feeFormSaving}
                    className="flex-1 py-2.5 rounded-2xl bg-[#0098db] hover:bg-green-900 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {feeFormSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Check className="w-4 h-4" /> Create fee</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RECORD PAYMENT MODAL */}
      <AnimatePresence>
        {paymentTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setPaymentTarget(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-900">Record payment</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{paymentTarget.childName} · {paymentTarget.feeName}</p>
                </div>
                <button onClick={() => setPaymentTarget(null)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
                <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Pending amount</p>
                    <p className="text-xl font-black text-rose-600">{formatINR(paymentTarget.pendingAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Due date</p>
                    <p className="text-xs font-bold text-rose-600">{new Date(paymentTarget.dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Amount received (₹)</label>
                  <input
                    type="number"
                    min="1"
                    max={paymentTarget.pendingAmount}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-[#0098db] focus:ring-2 focus:ring-green-50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Payment method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayMethod(m)}
                        className={`py-2 rounded-2xl text-xs font-bold border transition-colors ${
                          payMethod === m
                            ? 'bg-[#0098db] text-white border-[#0098db]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentTarget(null)}
                    className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paymentSaving || !payAmount || Number(payAmount) <= 0}
                    className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {paymentSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Check className="w-4 h-4" /> Confirm payment</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {receiptPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setReceiptPayment(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              {/* Receipt header */}
              <div className="bg-[#0098db] p-5 text-white text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg">Payment Receipt</h3>
                <p className="text-blue-100 text-xs mt-0.5">Aangan Daycare Centre</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                  <span className="text-xs text-slate-500">Receipt No.</span>
                  <span className="text-xs font-black text-slate-900">{receiptPayment.receiptId}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                  <span className="text-xs text-slate-500">Student</span>
                  <span className="text-xs font-bold text-slate-900">{receiptPayment.childName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                  <span className="text-xs text-slate-500">Fee</span>
                  <span className="text-xs font-bold text-slate-900">{receiptPayment.feeName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                  <span className="text-xs text-slate-500">Paid on</span>
                  <span className="text-xs font-bold text-slate-900">
                    {receiptPayment.paymentDate ? new Date(receiptPayment.paymentDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                  <span className="text-xs text-slate-500">Method</span>
                  <span className="text-xs font-bold text-slate-900">{receiptPayment.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-black text-slate-700">Amount paid</span>
                  <span className="text-lg font-black text-emerald-600">{formatINR(receiptPayment.paidAmount)}</span>
                </div>
                {receiptPayment.pendingAmount > 0 && (
                  <div className="flex justify-between items-center py-2 bg-rose-50 rounded-2xl px-3">
                    <span className="text-xs font-bold text-rose-500">Still pending</span>
                    <span className="text-sm font-black text-rose-600">{formatINR(receiptPayment.pendingAmount)}</span>
                  </div>
                )}
                <button
                  onClick={() => setReceiptPayment(null)}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors mt-2"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Status badge sub-component
function StatusBadge({ status, overdue, overdueDays }: { status: string; overdue: boolean; overdueDays: number }) {
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-bold whitespace-nowrap">
        <AlertCircle className="w-2.5 h-2.5" /> {overdueDays}d overdue
      </span>
    );
  }
  if (status === 'Paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold">
        <CheckCircle2 className="w-2.5 h-2.5" /> Paid
      </span>
    );
  }
  if (status === 'Partial') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold">
        <Clock className="w-2.5 h-2.5" /> Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">
      <Clock className="w-2.5 h-2.5" /> Unpaid
    </span>
  );
}
