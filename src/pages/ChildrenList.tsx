import React, { useState, useEffect } from 'react';
import { dbService } from '../services/firebase';
import { Child } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Phone, 
  Heart, 
  User, 
  ShieldAlert, 
  Calendar, 
  Droplet, 
  Upload, 
  FileText,
  X,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Preset avatar photos for children to make registration quick & gorgeous!
const PRESET_CHILD_PHOTOS = [
  '', // No photo — will use initials avatar
];

interface ChildrenListProps {
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
}

export const ChildrenList: React.FC<ChildrenListProps> = ({ 
  showAddForm, 
  setShowAddForm 
}) => {
  const { isAdmin } = useAuth();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Detailed profile modal state
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  // Edit form state
  const [editingChild, setEditingChild] = useState<Child | null>(null);

  // Add/Edit Form fields state
  const [formName, setFormName] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formAdmissionDate, setFormAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [formBloodGroup, setFormBloodGroup] = useState('O+');
  const [formAllergies, setFormAllergies] = useState('');
  const [formMedicalNotes, setFormMedicalNotes] = useState('');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formEmergencyContact, setFormEmergencyContact] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState(PRESET_CHILD_PHOTOS[0]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const data = await dbService.getChildren();
      setChildren(data);
    } catch (e) {
      console.error('Error loading children', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
    
    // Subscribe to dynamic database updates
    const unsub = dbService.subscribe('children', fetchChildren);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormDob('');
    setFormGender('Male');
    setFormAdmissionDate(new Date().toISOString().split('T')[0]);
    setFormBloodGroup('O+');
    setFormAllergies('');
    setFormMedicalNotes('');
    setFormParentName('');
    setFormParentPhone('');
    setFormEmergencyContact('');
    setFormPhotoUrl(PRESET_CHILD_PHOTOS[Math.floor(Math.random() * PRESET_CHILD_PHOTOS.length)]);
    setEditingChild(null);
  };

  const handleOpenEdit = (child: Child) => {
    setEditingChild(child);
    setFormName(child.name);
    setFormDob(child.dob);
    setFormGender(child.gender);
    setFormAdmissionDate(child.admissionDate);
    setFormBloodGroup(child.bloodGroup);
    setFormAllergies(child.allergies);
    setFormMedicalNotes(child.medicalNotes);
    setFormParentName(child.parentName);
    setFormParentPhone(child.parentPhone);
    setFormEmergencyContact(child.emergencyContact);
    setFormPhotoUrl(child.photoUrl);
    setShowAddForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDob || !formParentName || !formParentPhone || !formEmergencyContact) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    const payload = {
      name: formName,
      dob: formDob,
      gender: formGender,
      admissionDate: formAdmissionDate,
      bloodGroup: formBloodGroup,
      allergies: formAllergies || 'None',
      medicalNotes: formMedicalNotes || 'None',
      parentName: formParentName,
      parentPhone: formParentPhone,
      emergencyContact: formEmergencyContact,
      photoUrl: formPhotoUrl
    };

    try {
      if (editingChild) {
        await dbService.updateChild(editingChild.id, payload);
      } else {
        await dbService.createChild(payload);
      }
      resetForm();
      setShowAddForm(false);
    } catch (e) {
      console.error('Error saving child profile', e);
    }
  };

  const handleDelete = async (childId: string) => {
    if (confirm('Are you absolutely sure you want to remove this child from the enrollment records? This operation is irreversible.')) {
      try {
        await dbService.deleteChild(childId);
        if (selectedChild?.id === childId) {
          setSelectedChild(null);
        }
      } catch (e) {
        console.error('Error deleting child', e);
      }
    }
  };

  // Convert uploaded image to base64 dataUrl
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter children based on search query
  const filteredChildren = children.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.parentPhone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Children Directory</h2>
          <p className="text-xs text-slate-400 font-medium">Manage student registrations, parents, emergency records, & allergies.</p>
        </div>

        {!showAddForm && isAdmin && (
          <button
            id="register-child-trigger"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="px-4 py-2.5 bg-[#0098db] hover:bg-[#3d7edc] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Child</span>
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      {!showAddForm && (
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            id="child-search"
            type="text"
            placeholder="Search by Child Name, Parent Name, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200/80 focus:border-[#0098db] rounded-2xl text-xs font-semibold outline-none transition-all text-slate-800 focus:ring-4 focus:ring-blue-100/50"
          />
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-blue-100 border-t-[#4F8EF7] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing child registry...</p>
        </div>
      ) : showAddForm ? (
        
        // ADD / EDIT FORM
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-bold text-base text-slate-900">
              {editingChild ? `Modify Profile: ${editingChild.name}` : 'Enroll New Daycare Candidate'}
            </h3>
            <button
              id="cancel-child-form"
              onClick={() => {
                resetForm();
                setShowAddForm(false);
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* CHILD PHOTO SELECTOR */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 pl-1">Child Profile Photo</label>
              <div className="flex flex-wrap items-center gap-6">
                <img 
                  src={formPhotoUrl} 
                  alt="Child avatar preview" 
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-100 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                
                {/* Preset Options */}
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Select from preset portraits:</p>
                  <div className="flex gap-2">
                    {PRESET_CHILD_PHOTOS.map((ph, idx) => (
                      <button
                        key={idx}
                        id={`preset-photo-btn-${idx}`}
                        type="button"
                        onClick={() => setFormPhotoUrl(ph)}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                          formPhotoUrl === ph ? 'border-[#0098db] scale-105' : 'border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={ph} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 border border-slate-200 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Custom File</span>
                      <input 
                        id="photo-file-upload"
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Mandatory child basic info */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Full Name *</label>
                <input
                  id="child-form-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Date Of Birth *</label>
                <input
                  id="child-form-dob"
                  type="date"
                  required
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Gender *</label>
                <select
                  id="child-form-gender"
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Daycare metadata */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Admission Date *</label>
                <input
                  id="child-form-adm"
                  type="date"
                  required
                  value={formAdmissionDate}
                  onChange={(e) => setFormAdmissionDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Blood Group</label>
                <input
                  id="child-form-blood"
                  type="text"
                  value={formBloodGroup}
                  onChange={(e) => setFormBloodGroup(e.target.value)}
                  placeholder="e.g. O+, A-, B+"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                />
              </div>

              {/* Parents details */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Parent Full Name *</label>
                <input
                  id="child-form-parent"
                  type="text"
                  required
                  value={formParentName}
                  onChange={(e) => setFormParentName(e.target.value)}
                  placeholder="Father or Mother Name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Parent Phone Number *</label>
                <input
                  id="child-form-phone"
                  type="tel"
                  required
                  value={formParentPhone}
                  onChange={(e) => setFormParentPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Emergency Contact Number *</label>
                <input
                  id="child-form-emergency"
                  type="tel"
                  required
                  value={formEmergencyContact}
                  onChange={(e) => setFormEmergencyContact(e.target.value)}
                  placeholder="e.g. Guard or Neighbor phone"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                />
              </div>

            </div>

            {/* Health descriptors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Food or Drug Allergies</label>
                <textarea
                  id="child-form-allergies"
                  value={formAllergies}
                  onChange={(e) => setFormAllergies(e.target.value)}
                  placeholder="e.g. Severely allergic to peanuts/milk..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 pl-1">Medical or Medication Notes</label>
                <textarea
                  id="child-form-notes"
                  value={formMedicalNotes}
                  onChange={(e) => setFormMedicalNotes(e.target.value)}
                  placeholder="e.g. Inhaler stored in blue locker, prone to fever..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#0098db] focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                id="cancel-child-enroll"
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddForm(false);
                }}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-child-btn"
                type="submit"
                className="px-6 py-3 bg-[#0098db] hover:bg-[#3d7edc] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all cursor-pointer"
              >
                {editingChild ? 'Update Child Profile' : 'Complete Admission'}
              </button>
            </div>

          </form>
        </motion.div>

      ) : (
        
        // CARD LIST GRID
        <>
          {filteredChildren.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200 text-slate-400">
              <User className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-500" />
              <p className="font-bold text-sm text-slate-800">No Children Found</p>
              <p className="text-xs text-slate-400 mt-1">Try modifying your query or enroll a new child to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChildren.map((child) => (
                <motion.div
                  key={child.id}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between"
                >
                  <div className="flex gap-4">
                    <img 
                      src={child.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(child.name)}&background=EFF6FF&color=3B82F6`}
                      alt={child.name}
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(child.name)}&background=EFF6FF&color=3B82F6`; }}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate leading-tight">{child.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{child.gender} • DOB: {child.dob}</p>
                      
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-[#0098db] border border-blue-100/30">
                          <Droplet className="w-2.5 h-2.5 shrink-0" />
                          Blood: {child.bloodGroup}
                        </span>
                        
                        {child.allergies && child.allergies !== 'None' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100/30">
                            <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
                            Allergic
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Primary Guardian</p>
                      <p className="text-xs font-bold text-slate-700 mt-0.5 truncate max-w-[130px]">{child.parentName}</p>
                    </div>
                    
                    <div className="flex gap-1.5">
                      <button
                        id={`view-profile-btn-${child.id}`}
                        onClick={() => setSelectedChild(child)}
                        className="p-2 bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-[#0098db] rounded-xl border border-slate-200/50 transition-colors cursor-pointer"
                        title="View Full Profile"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      
                      {isAdmin && (
                        <>
                          <button
                            id={`edit-child-btn-${child.id}`}
                            onClick={() => handleOpenEdit(child)}
                            className="p-2 bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded-xl border border-slate-200/50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete-child-btn-${child.id}`}
                            onClick={() => handleDelete(child.id)}
                            className="p-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl border border-slate-200/50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* FULL CHILD DETAILED PROFILE MODAL */}
      <AnimatePresence>
        {selectedChild && (
          <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50" onClick={() => setSelectedChild(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
              >
                
                {/* Header portrait backdrop */}
                <div className="relative bg-gradient-to-r from-blue-400 to-indigo-500 h-28 flex items-end justify-between p-6">
                  <button
                    id="close-profile-modal"
                    onClick={() => setSelectedChild(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-black/10 hover:bg-black/25 text-white transition-colors"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                  
                  {/* Profile Image overlaying boundary */}
                  <div className="flex gap-4 items-end translate-y-10 relative z-10">
                    <img 
                      src={selectedChild.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChild.name)}&background=EFF6FF&color=3B82F6`}
                      alt={selectedChild.name}
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChild.name)}&background=EFF6FF&color=3B82F6`; }}
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <div className="mb-1 text-white bg-slate-900/50 backdrop-blur-xs px-3 py-1 rounded-xl">
                      <h3 className="font-extrabold text-base leading-tight">{selectedChild.name}</h3>
                      <p className="text-[10px] font-bold text-blue-200 tracking-wider uppercase">Candidate Profile</p>
                    </div>
                  </div>
                </div>

                {/* Body info list */}
                <div className="p-6 pt-14 space-y-5">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#0098db]" />
                        {selectedChild.dob}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Admission Date</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-[#0098db]" />
                        {selectedChild.admissionDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gender</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-[#0098db]" />
                        {selectedChild.gender}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Blood Group</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Droplet className="w-3.5 h-3.5 text-rose-500" />
                        {selectedChild.bloodGroup}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">Emergency & Guardian Contacts</h4>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2.5 bg-slate-50/50 rounded-xl">
                        <span className="text-slate-500">Guardian Name:</span>
                        <span className="font-bold text-slate-800">{selectedChild.parentName}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-50/50 rounded-xl">
                        <span className="text-slate-500">Guardian Mobile:</span>
                        <a href={`tel:${selectedChild.parentPhone}`} className="font-bold text-[#0098db] hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedChild.parentPhone}
                        </a>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-50/50 rounded-xl">
                        <span className="text-slate-500">Emergency Alternate:</span>
                        <a href={`tel:${selectedChild.emergencyContact}`} className="font-bold text-[#0098db] hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedChild.emergencyContact}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">Allergies & Medical Records</h4>
                    
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-rose-50/55 border border-rose-100/60 flex items-start gap-2 text-xs">
                        <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-800">Allergies</p>
                          <p className="text-rose-700 mt-0.5">{selectedChild.allergies || 'None declared.'}</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-50/40 border border-blue-100/40 flex items-start gap-2 text-xs">
                        <Heart className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-800">Special Medical Instructions</p>
                          <p className="text-slate-600 mt-0.5">{selectedChild.medicalNotes || 'None.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  {isAdmin && (
                    <button
                      id="edit-profile-modal-btn"
                      onClick={() => {
                        handleOpenEdit(selectedChild);
                        setSelectedChild(null);
                      }}
                      className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 transition-all cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  )}
                  <button
                    id="close-profile-modal-btn"
                    onClick={() => setSelectedChild(null)}
                    className="px-4 py-2 bg-[#0098db] hover:bg-[#3273d4] text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
