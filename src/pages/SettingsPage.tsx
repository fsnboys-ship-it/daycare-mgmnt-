import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCentre } from '../contexts/CentreContext';
import { UserProfile } from '../types';
import {
  User, Mail, Shield, Check, ToggleLeft, BellRing,
  Users, Upload, Building2, Phone, MapPin, Type,
  Image, X, CheckCircle2, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MAX_LOGO_BYTES = 300 * 1024; // 300 KB max for localStorage safety

export const SettingsPage: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const { centre, updateCentre } = useCentre();

  const [staffList, setStaffList]           = useState<UserProfile[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [sandboxLogs, setSandboxLogs]       = useState(true);
  const [toast, setToast]                   = useState<string | null>(null);

  // Centre branding form state
  const [centreName, setCentreName]     = useState(centre.name);
  const [centreSlogan, setCentreSlogan] = useState(centre.slogan);
  const [centreAddress, setCentreAddress] = useState(centre.address);
  const [centrePhone, setCentrePhone]   = useState(centre.phone);
  const [centreEmail, setCentreEmail]   = useState(centre.email);
  const [logoPreview, setLogoPreview]   = useState(centre.logoUrl);
  const [logoError, setLogoError]       = useState<string | null>(null);
  const [brandSaving, setBrandSaving]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync form when context loads
  useEffect(() => {
    setCentreName(centre.name);
    setCentreSlogan(centre.slogan);
    setCentreAddress(centre.address);
    setCentrePhone(centre.phone);
    setCentreEmail(centre.email);
    setLogoPreview(centre.logoUrl);
  }, [centre]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aangan_users');
      const users: UserProfile[] = raw ? JSON.parse(raw) : [];
      setStaffList(users);
    } catch { setStaffList([]); }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Handle logo file pick
  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);

    if (!file.type.startsWith('image/')) {
      setLogoError('Please select an image file (PNG, JPG, SVG, WEBP).');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(`Image too large. Max size is 300 KB. Your file is ${Math.round(file.size / 1024)} KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setLogoError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centreName.trim()) return;
    setBrandSaving(true);
    try {
      updateCentre({
        name:    centreName.trim(),
        slogan:  centreSlogan.trim(),
        logoUrl: logoPreview,
        address: centreAddress.trim(),
        phone:   centrePhone.trim(),
        email:   centreEmail.trim(),
      });
      showToast('Centre branding saved! Login page and sidebar updated.');
    } finally {
      setBrandSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Settings</h2>
        <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Centre branding · Profile · Preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── CENTRE BRANDING ── */}
        {isAdmin && (
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3" style={{ background: '#F7F3EE' }}>
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Centre Branding</h3>
                <p className="text-[10px] text-slate-400">Logo and name appear on the login screen and throughout the app</p>
              </div>
            </div>

            <form onSubmit={handleSaveBranding} className="p-6 space-y-5">

              {/* Logo upload */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">
                  Centre Logo
                </label>
                <div className="flex items-start gap-4">
                  {/* Preview box */}
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="Centre logo" className="w-full h-full object-contain p-1" />
                        <button type="button" onClick={handleRemoveLogo}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center">
                        <Image className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                        <p className="text-[9px] text-slate-400 font-bold">No logo</p>
                      </div>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div className="flex-1">
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" id="logo-upload" />
                    <label htmlFor="logo-upload"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-xs font-bold text-slate-700 cursor-pointer transition-colors w-fit">
                      <Upload className="w-3.5 h-3.5" /> Upload logo
                    </label>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                      PNG, JPG, SVG or WEBP · Max 300 KB<br />
                      Recommended: square, at least 200×200 px
                    </p>
                    {logoError && (
                      <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1">
                        <X className="w-3 h-3" /> {logoError}
                      </p>
                    )}
                    {logoPreview && !logoError && (
                      <p className="text-[10px] text-green-700 font-bold mt-2 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Logo ready — save to apply
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Centre name + slogan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Centre name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input value={centreName} onChange={e => setCentreName(e.target.value)} required
                      placeholder="e.g. Sunshine Daycare"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-green-600 focus:ring-2 focus:ring-green-50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Tagline / slogan
                  </label>
                  <div className="relative">
                    <Pencil className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input value={centreSlogan} onChange={e => setCentreSlogan(e.target.value)}
                      placeholder="e.g. Where little ones shine"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-green-600 focus:ring-2 focus:ring-green-50 transition-all" />
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input value={centreAddress} onChange={e => setCentreAddress(e.target.value)}
                      placeholder="City, State"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-green-600 focus:ring-2 focus:ring-green-50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input value={centrePhone} onChange={e => setCentrePhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-green-600 focus:ring-2 focus:ring-green-50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="email" value={centreEmail} onChange={e => setCentreEmail(e.target.value)}
                      placeholder="info@centre.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-green-600 focus:ring-2 focus:ring-green-50 transition-all" />
                  </div>
                </div>
              </div>

              {/* Preview card */}
              <div className="rounded-2xl border border-dashed border-amber-200 p-4" style={{ background: '#F7F3EE' }}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Login page preview</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-amber-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview
                      ? <img src={logoPreview} alt="preview" className="w-full h-full object-contain p-0.5" />
                      : <Building2 className="w-5 h-5 text-slate-300" />
                    }
                  </div>
                  <div>
                    <p className="font-black text-base text-slate-900 leading-tight">{centreName || 'Centre name'}</p>
                    <p className="text-xs text-amber-600 mt-0.5 italic">{centreSlogan || 'Your tagline here'}</p>
                    {centreAddress && <p className="text-[10px] text-slate-400 mt-0.5">{centreAddress}</p>}
                  </div>
                </div>
              </div>

              <button type="submit" disabled={brandSaving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black text-white transition-colors disabled:opacity-60"
                style={{ background: '#1B4332' }}>
                {brandSaving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Check className="w-4 h-4" /> Save branding</>
                }
              </button>
            </form>
          </div>
        )}

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">

          {/* My profile card */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0"
                style={{ background: '#1B4332' }}>
                {currentUser?.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm text-slate-900 truncate">{currentUser?.name}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase rounded-lg bg-green-100 text-green-800 tracking-wider">
                  {currentUser?.role}
                </span>
              </div>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-600 truncate">{currentUser?.email}</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50">
                <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-600">
                  {currentUser?.role === 'admin' ? 'Administrative access' : currentUser?.role === 'staff' ? 'Teacher access' : 'Guardian portal'}
                </span>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferences</h4>
            {[
              { id: 'notif', icon: BellRing, label: 'Push notifications', sub: 'Simulate real-time alerts', val: notificationEnabled, set: setNotificationEnabled },
              { id: 'storage', icon: ToggleLeft, label: 'Local sync', sub: 'Persist data in localStorage', val: sandboxLogs, set: setSandboxLogs },
            ].map(p => (
              <label key={p.id} htmlFor={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-amber-50/50 transition-colors">
                <p.icon className="w-4 h-4 text-green-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">{p.label}</p>
                  <p className="text-[10px] text-slate-400">{p.sub}</p>
                </div>
                <input id={p.id} type="checkbox" checked={p.val} onChange={() => p.set(!p.val)}
                  className="w-4 h-4 accent-green-700 shrink-0" />
              </label>
            ))}
          </div>

          {/* User list */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> System users
            </h4>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {staffList.length === 0
                ? <p className="text-xs text-slate-400 italic text-center py-4">No users yet</p>
                : staffList.map(u => (
                  <div key={u.uid} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-green-100 text-green-800 font-black text-xs flex items-center justify-center shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase shrink-0 ${
                      u.role === 'admin' ? 'bg-red-50 text-red-700' : u.role === 'staff' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                    }`}>{u.role}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
