import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, Stethoscope, UserCheck, KeyRound, AlertCircle, Phone, Mail, ArrowLeft, RefreshCw, Lock, X, ExternalLink, Loader2 } from 'lucide-react';
import { LoginInitResponse } from '../types';

export const LoginPage: React.FC = () => {
  const { loginInit, send2FACode, verify2FA, googleVerify } = useAuth();

  // Step 1 State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Step 2 2FA State
  const [pending2FA, setPending2FA] = useState<LoginInitResponse | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [activeMethod, setActiveMethod] = useState<'sms' | 'email'>('sms');
  const [countdown, setCountdown] = useState<number>(300); // 5 minutes (300s)
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const digitRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // 5-minute timer countdown effect
  useEffect(() => {
    if (!pending2FA) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pending2FA]);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const res = await loginInit(email, password);
      if (res.requires2FA) {
        setPending2FA(res);
        setActiveMethod((res.defaultMethod as 'sms' | 'email') || 'sms');
        setCountdown(300);
        setInfoMessage(`2FA code dispatched via ${res.defaultMethod.toUpperCase()} to ${res.defaultMethod === 'sms' ? res.maskedPhone : res.maskedEmail}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreset = async (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('test123');
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const res = await loginInit(presetEmail, 'test123');
      if (res.requires2FA) {
        setPending2FA(res);
        setActiveMethod((res.defaultMethod as 'sms' | 'email') || 'sms');
        setCountdown(300);
        setInfoMessage(`2FA code dispatched via ${res.defaultMethod.toUpperCase()} to ${res.defaultMethod === 'sms' ? res.maskedPhone : res.maskedEmail}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Preset login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeGoogleLogin = async (targetEmail: string) => {
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    setShowGoogleModal(false);

    try {
      const res = await googleVerify(targetEmail.trim());
      if (res.requires2FA) {
        setPending2FA(res);
        setActiveMethod((res.defaultMethod as 'sms' | 'email') || 'sms');
        setCountdown(300);
        setInfoMessage(`Google Identity confirmed (${targetEmail.trim()}). 2FA code dispatched via ${res.defaultMethod.toUpperCase()} to ${res.defaultMethod === 'sms' ? res.maskedPhone : res.maskedEmail}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP Digits Handling
  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    // Auto advance
    if (val && index < 5) {
      digitRefs[index + 1].current?.focus();
    }

    // Auto submit if all 6 filled
    if (val && index === 5 && newDigits.every((d) => d !== '')) {
      triggerVerify2FA(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtpDigits(digits);
      digitRefs[5].current?.focus();
      triggerVerify2FA(pasteData);
    }
  };

  const triggerVerify2FA = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (!pending2FA) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await verify2FA(pending2FA.pendingToken, code);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please check your entry and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async (methodToUse: 'sms' | 'email') => {
    if (!pending2FA || resendCooldown > 0) return;

    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      await send2FACode(pending2FA.pendingToken, methodToUse);
      setActiveMethod(methodToUse);
      setResendCooldown(30);
      setInfoMessage(`A fresh 2FA code was dispatched via ${methodToUse.toUpperCase()}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend 2FA code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* STAGE 4: Ambient Vitals Pulse Signature Element (Background) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <svg className="w-full h-full" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
          <motion.path
            d="M 0 300 Q 200 300, 350 300 L 370 240 L 395 380 L 420 180 L 450 360 L 470 300 Q 600 300, 800 300 L 820 250 L 845 370 L 870 200 L 900 350 L 920 300 Q 1100 300, 1440 300"
            stroke="#14b8a6"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </svg>
        <div className="absolute inset-0 bg-radial from-teal-500/10 via-transparent to-slate-950/80" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-600 text-white shadow-xl shadow-teal-900/40 border border-teal-400/30 mb-4"
        >
          <Activity className="w-10 h-10" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Doctor Connect System</h2>
        <p className="mt-1 text-sm text-slate-400 font-medium">FastAPI + React Production-Grade Medical Platform</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl shadow-slate-950/50 rounded-2xl border border-slate-200/80 sm:px-10 text-slate-900">

          {/* Status Banners with Error Shake */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-banner"
                initial={{ opacity: 0, y: -6, x: 0 }}
                animate={{ opacity: 1, y: 0, x: [0, -4, 4, -4, 4, 0] }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="font-medium">{error}</div>
              </motion.div>
            )}

            {infoMessage && (
              <motion.div
                key="info-banner"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-start space-x-3 text-teal-800 text-sm"
              >
                <KeyRound className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="font-medium">{infoMessage}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 1: PASSWORD / GOOGLE LOGIN */}
          {!pending2FA ? (
            <div>
              <form className="space-y-5" onSubmit={handleStep1Submit}>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@doctorconnect.co.ke"
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
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 placeholder-slate-400 text-sm transition-all outline-none"
                  />
                </div>

                <motion.button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.975 }}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </motion.button>
              </form>

              {/* Google OAuth Button */}
              <div className="mt-4">
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-semibold">Or continue with</span></div>
                </div>

                <motion.button
                  id="btn-google-login"
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.975 }}
                  className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign in with Google</span>
                </motion.button>
              </div>

              {/* Quick Demo Access Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
                  Quick Staff Login Presets
                </p>

                <div className="space-y-2">
                  <motion.button
                    id="btn-login-receptionist"
                    onClick={() => handlePreset('receptionist@doctorconnect.co.ke')}
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.975 }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-teal-600 text-white"><UserCheck className="w-4 h-4" /></div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">Receptionist (Sarah Wanjiku)</div>
                        <div className="text-xs text-slate-500">2FA via SMS (+254 712 *** 678)</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-teal-700 group-hover:underline">Login &rarr;</span>
                  </motion.button>

                  <motion.button
                    id="btn-login-doctor-1"
                    onClick={() => handlePreset('dr.jane@doctorconnect.co.ke')}
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.975 }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-emerald-600 text-white"><Stethoscope className="w-4 h-4" /></div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">Doctor (Dr. Jane Muthoni)</div>
                        <div className="text-xs text-slate-500">Cardiology & Medical Records</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 group-hover:underline">Login &rarr;</span>
                  </motion.button>

                  <motion.button
                    id="btn-login-admin"
                    onClick={() => handlePreset('admin@doctorconnect.co.ke')}
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.975 }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-slate-700 text-white"><ShieldCheck className="w-4 h-4" /></div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">Clinic Admin</div>
                        <div className="text-xs text-slate-500">Staff Control, Login Events & Audit Log</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:underline">Login &rarr;</span>
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: 2FA OTP ENTRY SCREEN */
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => { setPending2FA(null); setError(null); setInfoMessage(null); }}
                  className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  <Lock className="w-3.5 h-3.5" />
                  <span>2FA Required</span>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-extrabold text-slate-900">Enter Verification Code</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Dispatched to {activeMethod === 'sms' ? pending2FA.maskedPhone : pending2FA.maskedEmail}
                </p>
              </div>

              {/* 6 Auto-Advancing Digit Boxes */}
              <div className="flex justify-center space-x-2 my-4">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={digitRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-500 bg-white shadow-sm text-slate-900 outline-none transition-all"
                  />
                ))}
              </div>

              {/* Timer Countdown */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                <span>Code expires in:</span>
                <span className={`font-mono font-bold ${countdown < 60 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                  {formatTimer(countdown)}
                </span>
              </div>

              {/* Delivery Method Selector & Resend Button */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="text-xs font-semibold text-slate-600">Receive via:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleResendCode('sms')}
                    disabled={isSubmitting || resendCooldown > 0 || !pending2FA.maskedPhone}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeMethod === 'sms'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    } disabled:opacity-50`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>SMS OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResendCode('email')}
                    disabled={isSubmitting || resendCooldown > 0}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeMethod === 'email'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    } disabled:opacity-50`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email OTP</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleResendCode(activeMethod)}
                  disabled={isSubmitting || resendCooldown > 0}
                  className="w-full flex items-center justify-center space-x-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:text-slate-400 py-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Verification Code'}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => triggerVerify2FA()}
                disabled={isSubmitting || otpDigits.some((d) => !d)}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Verifying 2FA Code...' : 'Verify & Sign In'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GOOGLE ACCOUNT SELECTOR MODAL */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 relative">
            <button
              id="btn-close-google-modal"
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sign in with Google</h3>
                <p className="text-xs text-slate-500">Choose a pre-authorized staff Google account</p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {[
                { name: 'Dr. Jane Muthoni', email: 'dr.jane@doctorconnect.co.ke', role: 'Cardiology Consultant' },
                { name: 'Sarah Wanjiku', email: 'receptionist@doctorconnect.co.ke', role: 'Lead Receptionist' },
                { name: 'Clinic Administrator', email: 'admin@doctorconnect.co.ke', role: 'System Admin' },
                { name: 'Dr. Amanda Otieno', email: 'dr.amanda@doctorconnect.co.ke', role: 'General Practitioner' }
              ].map((acc) => (
                <button
                  key={acc.email}
                  id={`btn-google-acc-${acc.email.split('@')[0]}`}
                  onClick={() => executeGoogleLogin(acc.email)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {acc.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-teal-700">{acc.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{acc.email}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-teal-600">Select &rarr;</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Or enter custom Google staff email:</label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customGoogleEmail.trim()) {
                    executeGoogleLogin(customGoogleEmail.trim());
                  }
                }}
                className="flex space-x-2"
              >
                <input
                  id="input-custom-google-email"
                  type="email"
                  required
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="user@doctorconnect.co.ke"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <button
                  id="btn-submit-custom-google"
                  type="submit"
                  disabled={isSubmitting || !customGoogleEmail.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Continue
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
