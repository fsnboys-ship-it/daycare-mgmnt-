import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { Child, NotificationItem, NotificationType, TargetAudience, NotificationPriority } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Megaphone, 
  Trash2, 
  Edit2, 
  Send, 
  FileText, 
  Users, 
  BellRing, 
  X, 
  Check, 
  Calendar, 
  AlertOctagon,
  Eye,
  Heart,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationsPageProps {
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ 
  showCreateForm, 
  setShowCreateForm 
}) => {
  const { currentUser, isAdmin } = useAuth();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'All' | 'General' | 'Payment' | 'Emergency'>('All');

  // Editing state
  const [editingNot, setEditingNot] = useState<NotificationItem | null>(null);

  // Form Fields State
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<NotificationType>('General');
  const [formTargetAudience, setFormTargetAudience] = useState<TargetAudience>('All Parents');
  const [formTargetId, setFormTargetId] = useState('');
  const [formPriority, setFormPriority] = useState<NotificationPriority>('Normal');
  const [formExpiryDate, setFormExpiryDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const nots = await dbService.getNotifications();
      setNotifications(nots);

      const kids = await dbService.getChildren();
      setChildren(kids);
    } catch (e) {
      console.error('Error fetching notices data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to notification state updates
    const unsubNots = dbService.subscribe('notifications', fetchData);
    const unsubKids = dbService.subscribe('children', fetchData);

    return () => {
      unsubNots();
      unsubKids();
    };
  }, []);

  const resetForm = () => {
    setFormTitle('');
    setFormMessage('');
    setFormType('General');
    setFormTargetAudience('All Parents');
    setFormTargetId('');
    setFormPriority('Normal');
    setFormExpiryDate('');
    setEditingNot(null);
  };

  const handleOpenEdit = (not: NotificationItem) => {
    setEditingNot(not);
    setFormTitle(not.title);
    setFormMessage(not.message);
    setFormType(not.type);
    setFormTargetAudience(not.targetAudience);
    setFormTargetId(not.targetId || '');
    setFormPriority(not.priority);
    setFormExpiryDate(not.expiryDate || '');
    setShowCreateForm(true);
  };

  const handleSave = async (e: React.FormEvent, status: 'Draft' | 'Published') => {
    e.preventDefault();
    if (!formTitle || !formMessage) {
      alert('Please fill out the Title and Message fields.');
      return;
    }

    const payload = {
      title: formTitle,
      message: formMessage,
      type: formType,
      targetAudience: formTargetAudience,
      targetId: formTargetAudience === 'Selected Child' ? formTargetId : undefined,
      priority: formPriority,
      expiryDate: formExpiryDate || undefined,
      status
    };

    try {
      if (editingNot) {
        await dbService.updateNotification(editingNot.id, payload);
      } else {
        await dbService.createNotification(payload);
      }
      resetForm();
      setShowCreateForm(false);
    } catch (e) {
      console.error('Error saving notification', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this broadcast announcement?')) {
      try {
        await dbService.deleteNotification(id);
      } catch (e) {
        console.error('Error deleting notification', e);
      }
    }
  };

  const roleFilteredNotifications = notifications.filter(n => {
    if (currentUser?.role === 'parent') {
      return n.targetAudience === 'All Parents' || 
             (n.targetAudience === 'Selected Child' && n.targetId === currentUser?.assignedChildId);
    } else {
      // Admins and Staff see broad announcements (not automated child-specific check-ins/check-outs)
      return n.type !== 'ChildSpecific' && n.targetAudience !== 'Selected Child';
    }
  });

  const filteredNotifications = roleFilteredNotifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          n.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedTypeFilter === 'All' || n.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Announcements & Notices</h2>
          <p className="text-xs text-slate-400 font-medium">Broadcast news, fee dues alerts, emergency cancellations, and child-specific reports.</p>
        </div>

        {!showCreateForm && isAdmin && (
          <button
            id="create-notice-trigger"
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#3d7edc] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Notice</span>
          </button>
        )}
      </div>

      {/* SEARCH AND DIRECT LIST FILTER */}
      {!showCreateForm && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              id="notifications-search"
              type="text"
              placeholder="Search active or drafted notices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200/80 focus:border-[#1B4332] rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800 shadow-xs"
            />
          </div>

          {/* Easy-to-use Filter Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {[
              { id: 'All', label: 'All Alerts', color: 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:bg-slate-100', activeColor: 'bg-slate-900 border-slate-900 text-white' },
              { id: 'General', label: '📢 General', color: 'border-blue-100 bg-amber-50/20 hover:bg-amber-50/40 text-amber-700', activeColor: 'bg-blue-600 border-blue-600 text-white' },
              { id: 'Payment', label: '💰 Payments', color: 'border-amber-100 bg-amber-50/20 hover:bg-amber-50/40 text-amber-700', activeColor: 'bg-amber-600 border-amber-600 text-white' },
              { id: 'Emergency', label: '🚨 Emergencies', color: 'border-rose-100 bg-rose-50/20 hover:bg-rose-50/40 text-rose-700', activeColor: 'bg-rose-600 border-rose-600 text-white' }
            ].map((cat) => {
              const isActive = selectedTypeFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedTypeFilter(cat.id as any)}
                  className={`px-4 py-2 border rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    isActive ? cat.activeColor : cat.color
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER LIST OR FORM */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing notice boards...</p>
        </div>
      ) : showCreateForm ? (
        
        // INTERACTIVE CREATION FORM
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-bold text-base text-slate-900">
              {editingNot ? 'Modify Notice Details' : 'Broadcast New Announcement'}
            </h3>
            <button
              id="cancel-notice-form"
              onClick={() => {
                resetForm();
                setShowCreateForm(false);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Notice Title *</label>
                <input
                  id="notice-form-title"
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Summer Camp Registration Open"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Notice Type *</label>
                <select
                  id="notice-form-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all"
                >
                  <option value="General">General Announcement</option>
                  <option value="Payment">Payment / Tuition Reminder</option>
                  <option value="Emergency">Emergency / Closing notice</option>
                  <option value="ChildSpecific">Child Specific Notification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Target Audience *</label>
                <select
                  id="notice-form-audience"
                  value={formTargetAudience}
                  onChange={(e) => setFormTargetAudience(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all"
                >
                  <option value="All Parents">All Parents</option>
                  <option value="All Staff">All Teachers & Staff</option>
                  <option value="Selected Child">Selected Child Parents</option>
                </select>
              </div>

              {formTargetAudience === 'Selected Child' && (
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Selected Target Child *</label>
                  <select
                    id="notice-form-target"
                    value={formTargetId}
                    onChange={(e) => setFormTargetId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all"
                  >
                    <option value="">-- Choose Candidate --</option>
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Parent: {c.parentName})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Notice Priority *</label>
                <select
                  id="notice-form-priority"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all"
                >
                  <option value="Normal">Normal</option>
                  <option value="Important">Important</option>
                  <option value="Urgent">Urgent / Action Required</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Expiry Date</label>
                <input
                  id="notice-form-expiry"
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all"
                />
              </div>

            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Notice message / details *</label>
              <textarea
                id="notice-form-message"
                required
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Write clear details of the announcement here..."
                rows={5}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] focus:bg-white rounded-2xl text-xs font-medium outline-none transition-all"
              />
            </div>

            {/* ACTION FOOTERS */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Author: {currentUser?.name}
              </span>
              <div className="flex gap-2">
                <button
                  id="save-draft-btn"
                  type="button"
                  onClick={(e) => handleSave(e, 'Draft')}
                  className="px-4 py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  id="publish-btn"
                  type="button"
                  onClick={(e) => handleSave(e, 'Published')}
                  className="px-5 py-3 bg-[#1B4332] hover:bg-[#3273d4] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-100 transition-all cursor-pointer"
                >
                  Publish Announcement
                </button>
              </div>
            </div>

          </form>
        </motion.div>

      ) : (
        
        // RENDER BROADCAST LIST
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200 text-slate-400">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-500" />
              <p className="font-bold text-sm text-slate-800">Notice Board Empty</p>
              <p className="text-xs text-slate-400 mt-1">Create an announcement to communicate changes immediately to parents.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredNotifications.map((not) => (
                <motion.div
                  key={not.id}
                  whileHover={{ y: -1 }}
                  className={`bg-white rounded-3xl border p-5 flex flex-col md:flex-row justify-between gap-4 ${
                    not.status === 'Draft' 
                      ? 'border-dashed border-slate-200 bg-slate-50/20' 
                      : 'border-slate-200/60 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {(() => {
                      let IconComponent = Megaphone;
                      let iconClass = 'bg-amber-50/50 text-[#1B4332]';
                      if (not.type === 'Emergency') {
                        IconComponent = AlertOctagon;
                        iconClass = 'bg-rose-50 text-rose-600';
                      } else if (not.type === 'Payment') {
                        IconComponent = CreditCard;
                        iconClass = 'bg-amber-50 text-amber-600';
                      }
                      return (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconClass}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">{not.title}</h4>
                        
                        {/* Status tag */}
                        <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${
                          not.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {not.status}
                        </span>

                        {/* Priority tag */}
                        {not.priority !== 'Normal' && (
                          <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${
                            not.priority === 'Urgent' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {not.priority}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-2xl">{not.message}</p>
                      
                      {/* Context metadata row */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Audience: {not.targetAudience}
                        </span>
                        {not.expiryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Expiry: {not.expiryDate}
                          </span>
                        )}
                        <span>Date: {new Date(not.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions column */}
                  {isAdmin && (
                    <div className="flex md:flex-col justify-end gap-1.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      <button
                        id={`edit-notice-btn-${not.id}`}
                        onClick={() => handleOpenEdit(not)}
                        className="p-2 bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded-xl border border-slate-200/50 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="md:hidden">Edit</span>
                      </button>
                      <button
                        id={`delete-notice-btn-${not.id}`}
                        onClick={() => handleDelete(not.id)}
                        className="p-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl border border-slate-200/50 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="md:hidden">Delete</span>
                      </button>
                    </div>
                  )}

                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
