import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Lock, Mail, AlertCircle, Loader2, CheckCircle2, KeyRound, ArrowLeft, Shield } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, setCurrentPage } = useShop();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      if (res.user?.role === 'admin') {
        setCurrentPage('admin');
      } else {
        setCurrentPage('account');
      }
    } else {
      setError(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="py-12 sm:py-24 bg-[#08080A] min-h-screen flex items-center justify-center px-3 sm:px-4">
      <div className="w-full max-w-md bg-[#0F0F14] border border-[#24242E] rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full border border-[#D4AF37]/50 p-0.5 mx-auto mb-3 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <img
              src="/public/assets/aistudio/image_1656b91e_85be1a48.jpg"
              alt="RGD Crest"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
            Private Client Portal
          </span>
          <h1 className="font-brand text-2xl font-bold text-white mt-1">
            Access Your Account
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs text-neutral-400 font-medium mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs text-neutral-400">
              <label htmlFor="login-password" className="font-medium">Password</label>
              <button
                type="button"
                onClick={() => setCurrentPage('forgot-password')}
                className="text-[#D4AF37] hover:underline text-[11px] cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] hover:opacity-95 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Private Portal</span>
            )}
          </button>
        </form>

        {/* Register & Admin links */}
        <div className="mt-6 pt-5 border-t border-[#202028] space-y-3 text-center text-xs text-neutral-400">
          <div>
            <span>Not yet a registered client? </span>
            <button
              onClick={() => setCurrentPage('register')}
              className="text-[#D4AF37] font-semibold hover:underline cursor-pointer"
            >
              Create Account
            </button>
          </div>
          <div>
            <button
              onClick={() => setCurrentPage('admin')}
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Director Administration Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { register, setCurrentPage } = useShop();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    postalCode: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters and include a number or symbol.');
      return;
    }

    setIsLoading(true);
    const res = await register(form);
    setIsLoading(false);

    if (res.success) {
      setCurrentPage('account');
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  return (
    <div className="py-12 sm:py-16 bg-[#08080A] min-h-screen flex items-center justify-center px-3 sm:px-4">
      <div className="w-full max-w-lg bg-[#0F0F14] border border-[#24242E] rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
            Maison Membership
          </span>
          <h1 className="font-brand text-2xl font-bold text-white mt-1">
            Create Client Profile
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-light">
            Enjoy priority timepiece allocations, invitations to runway galas, and armored logistics.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-400 font-medium mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter full name"
              className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 font-medium mb-1">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 font-medium mb-1">Private Telephone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (212) 555-0199"
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 font-medium mb-1">Security Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 chars + number/symbol"
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C99726] hover:opacity-95 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <span>Confirm Membership Registration</span>}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-neutral-400">
          <span>Already registered? </span>
          <button
            onClick={() => setCurrentPage('login')}
            className="text-[#D4AF37] font-semibold hover:underline cursor-pointer"
          >
            Sign In Here
          </button>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { setCurrentPage, showToast } = useShop();

  const [step, setStep] = useState<'request' | 'verify' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetGrantToken, setResetGrantToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to request OTP verification code.');
      } else {
        setInfoMessage(data.message);
        setStep('verify');
        showToast('OTP recovery check processed.');
      }
    } catch {
      setError('Network error communicating with authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification code invalid or expired.');
      } else {
        setResetGrantToken(data.resetGrantToken);
        setStep('reset');
        showToast('OTP code verified.');
      }
    } catch {
      setError('Network error verifying OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetGrantToken, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Password reset failed.');
      } else {
        setStep('done');
        showToast('Password reset successfully.');
      }
    } catch {
      setError('Network error resetting password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 sm:py-24 bg-[#08080A] min-h-screen flex items-center justify-center px-3 sm:px-4">
      <div className="w-full max-w-md bg-[#0F0F14] border border-[#24242E] rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#181820] border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
            Email OTP Recovery
          </span>
          <h1 className="font-brand text-2xl font-bold text-white mt-1">
            Admin Password Recovery
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 font-light">
            {step === 'request' && 'Enter your administrator email address to receive a single-use 6-digit OTP code (5-minute validity).'}
            {step === 'verify' && 'Enter the 6-digit verification code sent to the private recovery inbox.'}
            {step === 'reset' && 'Set a new strong administrator password. All old sessions will be invalidated.'}
            {step === 'done' && 'Your password has been updated securely.'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && step === 'verify' && (
          <div className="mb-5 p-3 bg-[#15151C] border border-[#D4AF37]/30 rounded-xl text-xs text-neutral-300">
            {infoMessage}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="otp-email" className="block text-xs text-neutral-400 font-medium mb-1.5">
                Administrator Email
              </label>
              <input
                id="otp-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your admin email"
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#E6C25B] text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send 6-Digit Verification OTP</span>}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="otp-code" className="block text-xs text-neutral-400 font-medium mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full py-3 px-4 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-center font-mono text-lg tracking-[0.4em] text-[#F3E5AB] placeholder:text-neutral-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#E6C25B] disabled:opacity-50 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify Code</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('request');
                setOtp('');
                setError(null);
              }}
              className="w-full py-2 text-xs text-neutral-400 hover:text-[#D4AF37] cursor-pointer"
            >
              Use a different email or request a new code
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="reset-new-password" className="block text-xs text-neutral-400 font-medium mb-1.5">
                New Strong Password
              </label>
              <input
                id="reset-new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars with numbers & symbols"
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="block text-xs text-neutral-400 font-medium mb-1.5">
                Confirm New Password
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full py-2.5 px-3.5 bg-[#141419] border border-[#2A2A34] focus:border-[#D4AF37] rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#E6C25B] text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Reset Password</span>}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="p-6 bg-[#14141A] rounded-2xl border border-emerald-500/30 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-xs text-neutral-300">
              Your administrator password has been reset. You may now sign in with your new credentials.
            </p>
            <button
              onClick={() => setCurrentPage('admin')}
              className="mt-6 w-full py-3 bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Proceed to Admin Login
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#202028] text-center">
          <button
            onClick={() => setCurrentPage('login')}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
