import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { useCentre } from '../contexts/CentreContext';
import { Mail, Lock, AlertCircle, Leaf, Heart, Building2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { centre } = useCentre();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError(null);
    try { await login(email, password); }
    catch (err: any) { setError(err.message || 'Invalid email or password.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F3EE' }}>

      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-[46%] flex-col relative overflow-hidden" style={{ background: '#1B4332' }}>

        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ background: '#F59E0B' }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-10" style={{ background: '#F59E0B' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5" style={{ background: '#F59E0B' }} />

        {/* Logo */}
        <div className="relative z-10 p-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-900/30 overflow-hidden shrink-0">
            {centre.logoUrl
              ? <img src={centre.logoUrl} alt={centre.name} className="w-full h-full object-contain p-0.5" />
              : <Heart className="w-5 h-5 text-green-900 fill-green-900" />
            }
          </div>
          <div>
            <span className="font-black text-white text-xl tracking-tight">{centre.name}</span>
            <span className="block text-[10px] font-bold text-green-400 uppercase tracking-widest">Daycare Management</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12 pb-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 border border-green-700" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <Leaf className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Complete Daycare Management</span>
            </div>
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-4">
              {centre.name || 'Your Daycare'}
            </h2>
            <p className="text-amber-300 text-xl font-bold italic mb-4">
              {centre.slogan || 'Every child cared for.'}
            </p>
            {centre.address && (
              <p className="text-green-400 text-sm mb-1 flex items-center gap-1.5">
                <span>📍</span> {centre.address}
              </p>
            )}
            {centre.phone && (
              <p className="text-green-400 text-sm flex items-center gap-1.5">
                <span>📞</span> {centre.phone}
              </p>
            )}
            {!centre.address && !centre.phone && (
              <p className="text-green-300 text-sm leading-relaxed max-w-sm">
                Attendance, daily logs, fees, events and staff — all in one place.
              </p>
            )}
          </motion.div>

          {/* Feature pills */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 mt-10">
            {['Attendance tracking', 'Fee management', 'Daily logs', 'Parent updates', 'Staff directory', 'Incident reports'].map(f => (
              <span key={f} className="px-3 py-1.5 rounded-full text-[11px] font-bold border border-green-700 text-green-300"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                {f}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-10 py-6 border-t border-green-800/50 flex justify-between">
          <span className="text-[10px] text-green-600">© 2026 Aangan Daycare. All rights reserved.</span>
          <span className="text-[10px] text-green-600">v1.0.0</span>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#1B4332' }}>
              {centre.logoUrl
                ? <img src={centre.logoUrl} alt={centre.name} className="w-full h-full object-contain p-0.5" />
                : <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
              }
            </div>
            <span className="font-black text-green-900 text-xl">{centre.name}</span>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-black tracking-tight" style={{ color: '#1B4332' }}>Welcome back</h3>
            <p className="text-sm text-slate-400 mt-1 font-medium">Sign in to {centre.name}</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-2xl border border-red-100 bg-red-50 flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-semibold">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#1B4332' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@centre.com"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-amber-100 rounded-2xl text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-green-500 focus:ring-4 focus:ring-green-50 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#1B4332' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-amber-100 rounded-2xl text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-green-500 focus:ring-4 focus:ring-green-50 shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-black text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mt-2"
              style={{ background: '#1B4332', boxShadow: '0 4px 24px rgba(27,67,50,0.25)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in to portal'}
            </button>
          </form>

          {/* Trust indicators */}
          <div className="mt-8 flex items-center justify-center gap-4">
            {[['🔒', 'Secure login'], ['☁️', 'Cloud synced'], ['📱', 'Mobile ready']].map(([icon, label]) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-base">{icon}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
