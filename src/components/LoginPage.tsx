import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, Stethoscope, UserCheck, KeyRound, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsPreset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreset = async (role: 'receptionist' | 'doctor' | 'admin', presetEmail: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginAsPreset(role, presetEmail);
    } catch (err: any) {
      setError(err.message || 'Preset login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 text-white shadow-lg mb-4">
          <Activity className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Doctor Connect</h2>
        <p className="mt-1 text-sm text-slate-600 font-medium">FastAPI + React Role-Based Clinic Management System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@medflow.co.ke"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 placeholder-slate-400 text-sm transition-all outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <span className="text-xs text-slate-400 font-mono">Default: test123</span>
              </div>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="test123"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 placeholder-slate-400 text-sm transition-all outline-none"
              />
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Quick Role Switcher for Testing
            </p>

            <div className="space-y-2">
              <button
                id="btn-login-receptionist"
                onClick={() => handlePreset('receptionist', 'receptionist@medflow.co.ke')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-teal-600 text-white">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Receptionist (Sarah Wanjiku)</div>
                    <div className="text-xs text-slate-500">Booking, Patient Registration, SMS Reminders</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-teal-700 group-hover:underline">Login &rarr;</span>
              </button>

              <button
                id="btn-login-doctor-1"
                onClick={() => handlePreset('doctor', 'dr.jane@medflow.co.ke')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Doctor (Dr. Jane Muthoni)</div>
                    <div className="text-xs text-slate-500">Cardiology Workstation & Medical Notes</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-700 group-hover:underline">Login &rarr;</span>
              </button>

              <button
                id="btn-login-doctor-2"
                onClick={() => handlePreset('doctor', 'dr.david@medflow.co.ke')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-700 text-white">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Doctor (Dr. David Ochieng)</div>
                    <div className="text-xs text-slate-500">General Practice & Family Medicine</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-700 group-hover:underline">Login &rarr;</span>
              </button>

              <button
                id="btn-login-admin"
                onClick={() => handlePreset('admin', 'admin@medflow.co.ke')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-700 text-white">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Clinic Admin (Grace Nyambura)</div>
                    <div className="text-xs text-slate-500">Daily Analytics, Workload & CSV Export</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:underline">Login &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
