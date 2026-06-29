import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { Child, Attendance, ActivityLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserCheck, 
  UserMinus, 
  Luggage, 
  Search, 
  Users,
  AlertCircle,
  Calendar,
  ClipboardCheck,
  User,
  HeartHandshake,
  Heart,
  HelpCircle,
  ArrowRight,
  Sparkles,
  History,
  Grid,
  List,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AttendancePage: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<Attendance[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'rollcall' | 'pickups' | 'sheet' | 'trail'>('rollcall');
  const [trailFilter, setTrailFilter] = useState<'all' | 'check_in' | 'absent' | 'check_out'>('all');
  
  // Edit mode for Roll Call
  const [isEditMode, setIsEditMode] = useState(false);

  // Mobile layout and visual view states
  const [rollCallView, setRollCallView] = useState<'grid' | 'list'>('grid');
  const [pickupsView, setPickupsView] = useState<'grid' | 'list'>('grid');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Pickup Modals state
  const [pickupChild, setPickupChild] = useState<Child | null>(null);
  const [pickupType, setPickupType] = useState<'Picked Up' | 'Early Pickup' | null>(null);
  const [pickedBy, setPickedBy] = useState('');
  const [relationship, setRelationship] = useState('Mother');
  const [pickupReason, setPickupReason] = useState('Doctor Appointment');
  const [customReason, setCustomReason] = useState('');

  // Bulk Relieving state
  const [showBulkRelieveConfirm, setShowBulkRelieveConfirm] = useState(false);
  const [bulkPickedBy, setBulkPickedBy] = useState('Authorized Parent/Guardian');
  const [bulkRelationship, setBulkRelationship] = useState('Authorized Guardian');

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const kids = await dbService.getChildren();
      setChildren(kids);

      const todayAttendance = await dbService.getAttendanceForDate(todayStr);
      setAttendanceToday(todayAttendance);

      // Fetch recent marking/activity trail
      const activities = await dbService.getRecentActivities(50);
      setRecentActivities(activities);

      // If attendance has been taken today, pre-populate selected child IDs
      if (todayAttendance.length > 0) {
        const presentIds = todayAttendance
          .filter(a => a.attendanceStatus === 'Present' || a.status === 'Present' || a.status === 'Picked Up')
          .map(a => a.childId);
        setSelectedChildIds(presentIds);
      } else {
        setSelectedChildIds([]);
      }
    } catch (e) {
      console.error('Error fetching attendance logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();

    // Subscribe to attendance real-time events
    const unsubAtt = dbService.subscribe('attendance', fetchAttendanceData);
    const unsubKids = dbService.subscribe('children', fetchAttendanceData);
    const unsubActs = dbService.subscribe('activities', fetchAttendanceData);

    return () => {
      unsubAtt();
      unsubKids();
      unsubActs();
    };
  }, []);

  // Handle Morning Roll Call Submission
  const handleSaveAttendance = async () => {
    try {
      const teacherId = currentUser?.uid || 'teacher-id';
      await dbService.saveDailyAttendance(selectedChildIds, teacherId);
      setIsEditMode(false);
      setSuccessToast(`Successfully saved attendance for ${selectedChildIds.length} present children!`);
      // Switch to the pickups tab or sheet tab after successfully saving
      setActiveSubTab('pickups');
    } catch (e) {
      console.error('Failed to save attendance', e);
    }
  };

  // Mark all present and save
  const handleMarkAllPresentAndSave = async () => {
    try {
      const teacherId = currentUser?.uid || 'teacher-id';
      const allIds = children.map(c => c.id);
      await dbService.saveDailyAttendance(allIds, teacherId);
      setSelectedChildIds(allIds);
      setIsEditMode(false);
      setSuccessToast('Instant Attendance: All students marked present!');
      setActiveSubTab('pickups');
    } catch (e) {
      console.error('Failed to mark all present and save', e);
    }
  };

  // Quick 1-Tap release child to primary parent
  const handleQuickRelease = async (child: Child) => {
    try {
      await dbService.recordPickup(
        child.id,
        child.parentName,
        'Authorized Guardian',
        'Picked Up',
        'Quick mobile release'
      );
      setSuccessToast(`Released ${child.name} to ${child.parentName}!`);
    } catch (e) {
      console.error('Failed to quick release child', e);
    }
  };

  // Submit bulk release
  const handleBulkRelieveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (childrenInCenter.length === 0) return;

    try {
      const ids = childrenInCenter.map(c => c.id);
      await dbService.recordBulkPickup(ids, bulkPickedBy, bulkRelationship, 'Picked Up', 'Class-wide release');
      setShowBulkRelieveConfirm(false);
      setBulkPickedBy('Authorized Parent/Guardian');
      setBulkRelationship('Authorized Guardian');
      setSuccessToast(`Successfully released all ${ids.length} students!`);
    } catch (err) {
      console.error('Bulk relieving failed', err);
    }
  };

  // Toggle child selection
  const toggleChildSelection = (childId: string) => {
    setSelectedChildIds(prev => 
      prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
    );
  };

  // Select all or deselect all
  const handleSelectAll = () => {
    setSelectedChildIds(children.map(c => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedChildIds([]);
  };

  // Submit Pickup Form
  const handlePickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupChild || !pickupType || !pickedBy || !relationship) return;
    if (pickupType === 'Early Pickup' && pickupReason === 'Other' && !customReason.trim()) return;

    const finalReason = pickupType === 'Early Pickup' 
      ? (pickupReason === 'Other' ? customReason.trim() : pickupReason) 
      : '';

    try {
      await dbService.recordPickup(
        pickupChild.id,
        pickedBy,
        relationship,
        pickupType,
        finalReason
      );

      setSuccessToast(`Recorded departure for ${pickupChild.name} successfully!`);

      // Clear form state
      setPickupChild(null);
      setPickupType(null);
      setPickedBy('');
      setRelationship('Mother');
      setPickupReason('Doctor Appointment');
      setCustomReason('');
    } catch (e) {
      console.error('Pickup submission failed', e);
    }
  };

  // Helper to find attendance record for today
  const getChildRecordToday = (childId: string): Attendance | undefined => {
    return attendanceToday.find(a => a.childId === childId);
  };

  // Children Currently "In Center" (Present and not checked out)
  const childrenInCenter = children.filter(c => {
    const record = getChildRecordToday(c.id);
    if (!record) return false;
    
    // Checked in/Present today, but not checked out/picked up
    const isPresent = record.attendanceStatus === 'Present' || record.status === 'Present';
    const isNotPickedUp = record.departureStatus === 'In Center' || !record.departureStatus || record.departureStatus === null;
    const isExplicitlyOut = record.departureStatus === 'Picked Up' || record.departureStatus === 'Early Pickup' || record.status === 'Picked Up';
    
    return isPresent && isNotPickedUp && !isExplicitlyOut;
  });

  const matchesSearch = (c: Child) => {
    return c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           c.parentName.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Is attendance taken today?
  const isAttendanceTakenToday = attendanceToday.length > 0;

  // Filtered trail of daily attendance updates
  const filteredTrail = recentActivities.filter(act => {
    const isAttendanceRelated = act.type === 'check_in' || act.type === 'check_out' || act.type === 'absent';
    if (!isAttendanceRelated) return false;

    const matchesSearchText = act.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              act.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = trailFilter === 'all' || act.type === trailFilter;

    return matchesSearchText && matchesType;
  });

  return (
    <div className="space-y-6">

      {/* Visual Success Toast for Mobile/Tablet feedback */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black tracking-wide text-white">Action Complete</p>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-snug">{successToast}</p>
            </div>
            <button 
              onClick={() => setSuccessToast(null)}
              className="text-slate-400 hover:text-white text-[10px] font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#1B4332]" />
            Attendance & Pickup Control
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Take unified morning roll calls, register regular departures, and authorize special early departures.
          </p>
        </div>
        
        {/* Date Display Badge */}
        <div className="bg-[#1B4332]/10 text-[#1B4332] px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-2 text-xs font-bold self-start">
          <Calendar className="w-4 h-4" />
          <span>Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* MOBILE-OPTIMIZED HEADCOUNT SUMMARY STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Total Kids</span>
          <span className="text-lg font-black text-slate-800 mt-1">{children.length}</span>
        </div>
        <div className="bg-emerald-50/40 border border-emerald-100 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wide">In Classroom</span>
          <span className="text-lg font-black text-emerald-700 mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-green-600 rounded-full animate-pulse shrink-0" />
            {childrenInCenter.length}
          </span>
        </div>
        <div className="bg-amber-50/40 border border-blue-100 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wide">Present Today</span>
          <span className="text-lg font-black text-amber-700 mt-1 animate-pulse-subtle">
            {attendanceToday.filter(a => a.status === 'Present' || a.status === 'Picked Up' || a.attendanceStatus === 'Present').length}
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-200/50 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Checked-Out</span>
          <span className="text-lg font-black text-slate-700 mt-1">
            {attendanceToday.filter(a => a.departureStatus === 'Picked Up' || a.departureStatus === 'Early Pickup' || a.status === 'Picked Up').length}
          </span>
        </div>
      </div>

      {/* TOP SUB-TAB NAVIGATION */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-full max-w-2xl overflow-x-auto">
        <button
          onClick={() => {
            setActiveSubTab('rollcall');
            setIsEditMode(false);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'rollcall' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Morning Roll Call</span>
        </button>
        <button
          onClick={() => setActiveSubTab('pickups')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer relative ${
            activeSubTab === 'pickups' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Luggage className="w-4 h-4" />
          <span>Release & Pickups</span>
          {childrenInCenter.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white animate-pulse">
              {childrenInCenter.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('sheet')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'sheet' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Status Sheet</span>
        </button>
        <button
          onClick={() => setActiveSubTab('trail')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'trail' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Attendance Trail</span>
        </button>
      </div>

      {/* SEARCH BAR (For non-rollcall lists or general checkups) */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input
          id="child-attendance-search"
          type="text"
          placeholder="Search students by Name or Parent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200/80 focus:border-[#1B4332] rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800 focus:ring-4 focus:ring-blue-100/30"
        />
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Synchronizing roster logs...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: MORNING ROLL CALL */}
          {activeSubTab === 'rollcall' && (
            <div className="space-y-6">
              
              {/* If already taken and not in edit mode */}
              {isAttendanceTakenToday && !isEditMode ? (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Attendance Logged for Today!</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Attendance was saved successfully. All unselected children have been automatically registered as **Absent**, and present children are marked **In Center**.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center items-center text-xs font-bold text-slate-700 py-1">
                    <span className="px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-emerald-700">
                      Present Today: {attendanceToday.filter(a => a.attendanceStatus === 'Present' || a.status === 'Present' || a.status === 'Picked Up').length} children
                    </span>
                    <span className="px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-rose-700">
                      Absent Today: {attendanceToday.filter(a => a.attendanceStatus === 'Absent' || a.status === 'Absent').length} children
                    </span>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveSubTab('pickups')}
                      className="px-5 py-2.5 bg-[#1B4332] hover:bg-green-900 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Manage Pickups</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Edit Roll Call
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                  
                  {/* Warning / Instructions Header */}
                  <div className="bg-slate-50 p-5 border-b border-slate-150 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#1B4332] shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Take Daily Attendance</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Select all students who are physically present in the classroom today. When you click **Save Attendance**, the system will log present students and **automatically mark all unselected students as Absent** in real time.
                      </p>
                    </div>
                  </div>

                  {/* Multi-Selection Control Controls */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Bulk Actions:</span>
                      <button 
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-[#1B4332] hover:underline cursor-pointer bg-transparent border-none"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 text-xs">•</span>
                      <button 
                        onClick={handleDeselectAll}
                        className="text-xs font-bold text-slate-500 hover:underline cursor-pointer bg-transparent border-none"
                      >
                        Deselect All
                      </button>
                      <span className="text-slate-300 text-xs">•</span>
                      <button 
                        onClick={handleMarkAllPresentAndSave}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer bg-transparent border-none"
                        title="Mark everyone present and save attendance instantly"
                      >
                        <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Instant Mark All Present</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* View Switcher */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                          onClick={() => setRollCallView('grid')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            rollCallView === 'grid' 
                              ? 'bg-white text-[#1B4332] shadow-xs' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Grid View (Tap Faceboard)"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRollCallView('list')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            rollCallView === 'list' 
                              ? 'bg-white text-[#1B4332] shadow-xs' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="List View (Compact Detailed Rows)"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs font-bold text-slate-600 shrink-0">
                        Selected: <span className="text-green-700">{selectedChildIds.length}</span> of {children.length}
                      </div>
                    </div>
                  </div>

                  {/* Children Selection List */}
                  <div className="max-h-[480px] overflow-y-auto">
                    {children.filter(matchesSearch).length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <p className="text-xs font-medium">No children found matching search terms</p>
                      </div>
                    ) : rollCallView === 'grid' ? (
                      /* HIGHLY MOBILE FRIENDLY GRID VIEW WITH BOUNCE FEEDBACK */
                      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5 p-5">
                        {children.filter(matchesSearch).map((child) => {
                          const isSelected = selectedChildIds.includes(child.id);
                          return (
                            <motion.div
                              key={child.id}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => toggleChildSelection(child.id)}
                              className={`relative rounded-2xl border-2 p-4 flex flex-col items-center text-center cursor-pointer transition-all select-none ${
                                isSelected 
                                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm shadow-emerald-50' 
                                  : 'bg-white border-slate-200/70 hover:border-slate-300'
                              }`}
                            >
                              <div className="relative">
                                <img 
                                  src={child.photoUrl} 
                                  alt={child.name} 
                                  className={`w-14 h-14 rounded-2xl object-cover border-2 shadow-sm transition-all duration-300 ${
                                    isSelected ? 'border-emerald-400 scale-105' : 'border-slate-100'
                                  }`}
                                  referrerPolicy="no-referrer"
                                />
                                {isSelected && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                                    <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                )}
                              </div>

                              <div className="mt-3.5 min-w-0 w-full">
                                <h4 className={`font-black text-xs truncate leading-tight ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                                  {child.name}
                                </h4>
                                <p className="text-[9px] text-slate-400 font-bold mt-1 truncate">
                                  {child.parentName}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      /* STANDARD LIST VIEW WITH LARGER TAP TARGETS */
                      <div className="divide-y divide-slate-100">
                        {children.filter(matchesSearch).map((child) => {
                          const isSelected = selectedChildIds.includes(child.id);
                          return (
                            <div 
                              key={child.id}
                              onClick={() => toggleChildSelection(child.id)}
                              className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-amber-50/25' : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <img 
                                  src={child.photoUrl} 
                                  alt={child.name} 
                                  className="w-11 h-11 rounded-xl object-cover border border-slate-150 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-xs text-slate-900 truncate">{child.name}</h4>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Parent: {child.parentName}</p>
                                </div>
                              </div>

                              {/* Checkbox target */}
                              <div className="shrink-0 pl-4">
                                <div className={`w-6.5 h-6.5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                  isSelected 
                                    ? 'bg-[#1B4332] border-[#1B4332] text-white' 
                                    : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <CheckCircle className="w-4 h-4 text-white stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Submission Footer */}
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 flex-wrap">
                    {isEditMode && (
                      <button
                        onClick={() => setIsEditMode(false)}
                        className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      onClick={handleMarkAllPresentAndSave}
                      className="px-6 py-3 bg-amber-50 hover:bg-green-100 text-amber-700 border border-amber-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-green-700 animate-pulse" />
                      <span>Mark All Present & Save</span>
                    </button>
                    <button
                      onClick={handleSaveAttendance}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Save Selected Attendance</span>
                    </button>
                  </div>

                  {(!isAttendanceTakenToday || isEditMode) && (
                    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] z-40 bg-white/95 backdrop-blur-md border border-slate-200/80 p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3">
                      <div className="text-[11px] font-extrabold text-slate-500 pl-1.5 shrink-0">
                        Selected: <span className="text-[#1B4332] font-black">{selectedChildIds.length}</span> / {children.length}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleMarkAllPresentAndSave}
                          className="px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 font-black text-[10px] rounded-xl cursor-pointer shrink-0"
                        >
                          All Present
                        </button>
                        <button
                          onClick={handleSaveAttendance}
                          className="px-4 py-2 bg-[#1B4332] text-white font-black text-[10px] rounded-xl shadow-md cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Save Roll Call</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* TAB 2: RELEASE & PICKUPS (Pickup Screen UI) */}
          {activeSubTab === 'pickups' && (
            <div className="space-y-4">
              
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-sm text-slate-800 tracking-tight flex items-center gap-1.5">
                    <Clock className="w-5 h-5 text-[#1B4332]" />
                    Children Currently In Center
                  </h3>

                  {/* View Toggles for Pickups */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setPickupsView('grid')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        pickupsView === 'grid' 
                          ? 'bg-white text-[#1B4332] shadow-xs' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="Grid View"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPickupsView('list')}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        pickupsView === 'list' 
                          ? 'bg-white text-[#1B4332] shadow-xs' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {childrenInCenter.length} In Classroom
                  </span>
                  {childrenInCenter.length > 0 && (
                    <button
                      onClick={() => setShowBulkRelieveConfirm(true)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Luggage className="w-3.5 h-3.5" />
                      <span>Relieve All Students</span>
                    </button>
                  )}
                </div>
              </div>

              {childrenInCenter.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center text-slate-400 space-y-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">No Children Currently In Center</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      All checked-in children have been released, or morning roll call hasn't been submitted yet. Please check the **Morning Roll Call** tab to log presence.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSubTab('rollcall')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Go to Morning Roll Call
                  </button>
                </div>
              ) : pickupsView === 'grid' ? (
                /* RESPONSIVE GRID VIEW WITH 1-TAP QUICK RELEASE */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {childrenInCenter.filter(matchesSearch).map((child) => {
                    const record = getChildRecordToday(child.id);
                    return (
                      <motion.div
                        key={child.id}
                        layout
                        whileHover={{ y: -2 }}
                        className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between space-y-4"
                      >
                        <div className="flex gap-4">
                          <img 
                            src={child.photoUrl} 
                            alt={child.name} 
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">{child.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Parent: {child.parentName}</p>
                            
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                                In Center
                              </span>
                              {record?.checkInTime && (
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  Arrived: {record.checkInTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* PICKUP ACTIONS */}
                        <div className="pt-3.5 border-t border-slate-150 flex flex-col gap-2">
                          {/* Primary 1-Tap Quick Release */}
                          <button
                            onClick={() => handleQuickRelease(child)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex justify-center items-center gap-1.5"
                            title={`Instant checkout to ${child.parentName}`}
                          >
                            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                            <span>1-Tap Release to Parent</span>
                          </button>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setPickupChild(child);
                                setPickupType('Picked Up');
                                setPickedBy(child.parentName); // Prefill with Parent
                              }}
                              className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-xl border border-indigo-200 transition-colors cursor-pointer flex justify-center items-center gap-1"
                            >
                              <Luggage className="w-3 h-3" />
                              <span>Custom</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setPickupChild(child);
                                setPickupType('Early Pickup');
                                setPickedBy(child.parentName);
                              }}
                              className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] rounded-xl border border-amber-200 transition-colors cursor-pointer flex justify-center items-center gap-1 shrink-0"
                              title="Early Pickup"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Early</span>
                            </button>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* HIGHLY COMPACT LIST ROW VIEW FOR RAPID SCROLLING AND TAP ACTIONS */
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden divide-y divide-slate-150">
                  {childrenInCenter.filter(matchesSearch).map((child) => {
                    const record = getChildRecordToday(child.id);
                    return (
                      <div key={child.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={child.photoUrl} 
                            alt={child.name} 
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs text-slate-900 truncate">{child.name}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold truncate">Parent: {child.parentName}</p>
                            {record?.checkInTime && (
                              <p className="text-[9px] text-slate-500 font-bold mt-0.5">Arrived at: {record.checkInTime}</p>
                            )}
                          </div>
                        </div>

                        {/* Quick Release Action Bar */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuickRelease(child)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <CheckCircle className="w-3 h-3 stroke-[2.5]" />
                            <span>1-Tap Release</span>
                          </button>
                          <button
                            onClick={() => {
                              setPickupChild(child);
                              setPickupType('Picked Up');
                              setPickedBy(child.parentName);
                            }}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-slate-150 rounded-xl transition-all cursor-pointer"
                            title="Custom Pickup Details"
                          >
                            <Luggage className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setPickupChild(child);
                              setPickupType('Early Pickup');
                              setPickedBy(child.parentName);
                            }}
                            className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-slate-150 rounded-xl transition-all cursor-pointer"
                            title="Early Departure"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: TODAY'S STATUS SHEET (Roster list of everything today) */}
          {activeSubTab === 'sheet' && (
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Student Roll Log</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Overview of daily presence & checkout categories</p>
                </div>
                <div className="text-[10px] text-slate-500 font-bold">
                  {attendanceToday.length} of {children.length} records populated
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {children.filter(matchesSearch).map((child) => {
                  const record = getChildRecordToday(child.id);
                  const isMarked = !!record;
                  const isPresent = record?.attendanceStatus === 'Present' || record?.status === 'Present' || record?.status === 'Picked Up';
                  const departureStatus = record?.departureStatus;

                  return (
                    <div key={child.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      
                      {/* Left: Child profile */}
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={child.photoUrl} 
                          alt={child.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{child.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Parent: {child.parentName}</p>
                        </div>
                      </div>

                      {/* Middle: Attendance Status & Departure Details */}
                      <div className="flex flex-wrap items-center gap-3">
                        
                        {/* Attendance status badge */}
                        {!isMarked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <HelpCircle className="w-3 h-3" />
                            Unmarked Today
                          </span>
                        ) : isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <UserCheck className="w-3 h-3" />
                            Attendance: Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            <UserMinus className="w-3 h-3" />
                            Attendance: Absent
                          </span>
                        )}

                        {/* Departure Status Detail */}
                        {isMarked && isPresent && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-300 text-xs">|</span>
                            
                            {departureStatus === 'In Center' || !departureStatus ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-blue-100">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                Current: In Center
                              </span>
                            ) : departureStatus === 'Picked Up' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Luggage className="w-3 h-3" />
                                Current: Picked Up
                              </span>
                            ) : departureStatus === 'Early Pickup' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                <Clock className="w-3 h-3 animate-pulse" />
                                Current: Early Pickup
                              </span>
                            ) : null}
                          </div>
                        )}

                      </div>

                      {/* Right: Detailed text summary for pickup */}
                      {isMarked && isPresent && departureStatus && departureStatus !== 'In Center' && (
                        <div className="text-[10px] text-slate-500 max-w-xs bg-slate-50 p-2 rounded-xl border border-slate-100 self-start sm:self-center">
                          <p className="font-semibold text-slate-700 uppercase tracking-wide text-[8px] mb-0.5">Pickup Details:</p>
                          <p>
                            <span className="font-medium text-slate-600">By:</span> {record.pickedBy} ({record.relationship})
                          </p>
                          {record.checkOutTime && (
                            <p>
                              <span className="font-medium text-slate-600">Time:</span> {record.checkOutTime}
                            </p>
                          )}
                          {departureStatus === 'Early Pickup' && record.pickupReason && (
                            <p>
                              <span className="font-medium text-slate-600">Reason:</span> {record.pickupReason}
                            </p>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 4: ATTENDANCE & MARKING AUDIT TRAIL */}
          {activeSubTab === 'trail' && (
            <div className="space-y-6">
              
              {/* Filter pills inside Trail tab */}
              <div className="flex flex-wrap gap-2">
                <button
                  id="trail-filter-all"
                  onClick={() => setTrailFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    trailFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  All Entries ({recentActivities.filter(a => ['check_in', 'check_out', 'absent'].includes(a.type)).length})
                </button>
                <button
                  id="trail-filter-present"
                  onClick={() => setTrailFilter('check_in')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    trailFilter === 'check_in'
                      ? 'bg-emerald-600 text-white shadow-sm animate-pulse-subtle'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/50'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Present Today ({recentActivities.filter(a => a.type === 'check_in').length})
                </button>
                <button
                  id="trail-filter-absent"
                  onClick={() => setTrailFilter('absent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    trailFilter === 'absent'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100/50'
                  }`}
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Absent Today ({recentActivities.filter(a => a.type === 'absent').length})
                </button>
                <button
                  id="trail-filter-checkout"
                  onClick={() => setTrailFilter('check_out')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    trailFilter === 'check_out'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100/50'
                  }`}
                >
                  <Luggage className="w-3.5 h-3.5" />
                  Pickups & Releases ({recentActivities.filter(a => a.type === 'check_out').length})
                </button>
              </div>

              {/* Main Trail List Card */}
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Chronological Marking Log</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Audit trail of daily check-ins, absences, and pickup actions.</p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">
                    Showing {filteredTrail.length} records
                  </div>
                </div>

                {filteredTrail.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs text-slate-400 font-bold">No marking trail logs match your query</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Try changing the filter categories or search term above.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l border-slate-100 space-y-8 py-2">
                    {filteredTrail.map((act) => {
                      const isCheckIn = act.type === 'check_in';
                      const isAbsent = act.type === 'absent';
                      const isCheckOut = act.type === 'check_out';

                      let badgeBg = 'bg-slate-100 text-slate-700 border border-slate-200';
                      let icon = <History className="w-3 h-3" />;
                      
                      if (isCheckIn) {
                        badgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                        icon = <UserCheck className="w-3 h-3" />;
                      } else if (isAbsent) {
                        badgeBg = 'bg-rose-50 text-rose-700 border border-rose-100';
                        icon = <UserMinus className="w-3 h-3" />;
                      } else if (isCheckOut) {
                        badgeBg = 'bg-indigo-50 text-indigo-700 border border-indigo-100';
                        icon = <Luggage className="w-3 h-3" />;
                      }

                      return (
                        <div key={act.id} className="relative">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm text-white ${
                            isCheckIn ? 'bg-emerald-500' : isAbsent ? 'bg-rose-500' : 'bg-indigo-500'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex items-start gap-3.5">
                              {/* Child Photo */}
                              {act.childPhoto ? (
                                <img 
                                  src={act.childPhoto} 
                                  alt={act.childName} 
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                                  {act.childName.charAt(0)}
                                </div>
                              )}

                              <div>
                                <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                  {act.childName}
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${badgeBg}`}>
                                    {icon}
                                    {isCheckIn ? 'Checked-In' : isAbsent ? 'Absent' : 'Released / Out'}
                                  </span>
                                </h5>
                                <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                                  {act.details}
                                </p>
                              </div>
                            </div>

                            {/* Timestamp & Operator Badge */}
                            <div className="text-left sm:text-right shrink-0">
                              <span className="text-[10px] text-slate-400 font-bold block">
                                {act.timestamp ? new Date(act.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—'} at {act.timestamp ? new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 font-bold text-[8px] uppercase tracking-wider rounded">
                                Operator: {currentUser?.displayName || 'Authorized Staff'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* POPUP MODAL FOR RELEASE & PICKUP RECORDING */}
      <AnimatePresence>
        {pickupChild && pickupType && (
          <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50" onClick={() => setPickupChild(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 space-y-4"
              >
                {/* Header info */}
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                    pickupType === 'Early Pickup' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {pickupType === 'Early Pickup' ? (
                      <Clock className="w-6 h-6 animate-pulse" />
                    ) : (
                      <Luggage className="w-6 h-6" />
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {pickupType === 'Early Pickup' ? 'Record Early Checkout' : 'Record Regular Pickup'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Child: <span className="font-bold text-slate-600">{pickupChild.name}</span>
                  </p>
                </div>

                <form onSubmit={handlePickupSubmit} className="space-y-4 pt-2">
                  
                  {/* Picked By Input */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 pl-1">Authorized Person *</label>
                    <input
                      id="pickup-person-input"
                      type="text"
                      required
                      placeholder="e.g. Rohini Gupta"
                      value={pickedBy}
                      onChange={(e) => setPickedBy(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>

                  {/* Relationship dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 pl-1">Relationship to Child *</label>
                    <select
                      id="relationship-select"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] rounded-xl text-xs font-semibold outline-none text-slate-700"
                    >
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Uncle">Uncle</option>
                      <option value="Aunt">Aunt</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other Authorized Person</option>
                    </select>
                  </div>

                  {/* Early pickup reason (Shown only for Early Pickup) */}
                  {pickupType === 'Early Pickup' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 pl-1">Reason for Early Departure *</label>
                        <select
                          id="early-reason-select"
                          value={pickupReason}
                          onChange={(e) => setPickupReason(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] rounded-xl text-xs font-semibold outline-none text-slate-700"
                        >
                          <option value="Doctor Appointment">Doctor Appointment</option>
                          <option value="Family Emergency">Family Emergency</option>
                          <option value="Parent Request">Parent Request</option>
                          <option value="Sick Child">Sick Child / Unwell</option>
                          <option value="Other">Other (Specify below)</option>
                        </select>
                      </div>

                      {pickupReason === 'Other' && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 pl-1">Specify Custom Reason *</label>
                          <input
                            id="custom-reason-input"
                            type="text"
                            required
                            placeholder="e.g. Early family vacation travel"
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Checkout Time:</span>
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      id="cancel-pickup-btn"
                      type="button"
                      onClick={() => {
                        setPickupChild(null);
                        setPickupType(null);
                        setPickedBy('');
                        setRelationship('Mother');
                        setPickupReason('Doctor Appointment');
                        setCustomReason('');
                      }}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      id="submit-pickup-btn"
                      type="submit"
                      className={`flex-1 py-3 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        pickupType === 'Early Pickup' 
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-100' 
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100'
                      }`}
                    >
                      Record Release
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          </>
        )}

        {showBulkRelieveConfirm && (
          <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50" onClick={() => setShowBulkRelieveConfirm(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 space-y-4"
              >
                {/* Header info */}
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <Luggage className="w-6 h-6 animate-bounce" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Bulk Release All Students
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Releasing <span className="font-black text-indigo-600">{childrenInCenter.length} students</span> currently in classroom.
                  </p>
                </div>

                {/* List scroll of students being released */}
                <div className="max-h-[140px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase pl-1">Students to be Checked-Out:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {childrenInCenter.map(c => (
                      <div key={c.id} className="flex items-center gap-1.5 p-1 bg-white border border-slate-100 rounded-lg">
                        <img src={c.photoUrl} alt={c.name} className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        <span className="text-[10px] text-slate-700 font-bold truncate">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleBulkRelieveSubmit} className="space-y-4 pt-2">
                  
                  {/* Picked By Input */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 pl-1">Authorized Person *</label>
                    <input
                      id="bulk-pickup-person-input"
                      type="text"
                      required
                      placeholder="e.g. Parents / Authorized Guardians"
                      value={bulkPickedBy}
                      onChange={(e) => setBulkPickedBy(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>

                  {/* Relationship dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 pl-1">Relationship to Children *</label>
                    <select
                      id="bulk-relationship-select"
                      value={bulkRelationship}
                      onChange={(e) => setBulkRelationship(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#1B4332] rounded-xl text-xs font-semibold outline-none text-slate-700"
                    >
                      <option value="Authorized Guardian">Authorized Guardian/Parent</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Other">Other Authorized Person</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Checkout Time:</span>
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      id="cancel-bulk-pickup-btn"
                      type="button"
                      onClick={() => {
                        setShowBulkRelieveConfirm(false);
                        setBulkPickedBy('Authorized Parent/Guardian');
                        setBulkRelationship('Authorized Guardian');
                      }}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      id="submit-bulk-pickup-btn"
                      type="submit"
                      className="flex-1 py-3 text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Relieve All
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
