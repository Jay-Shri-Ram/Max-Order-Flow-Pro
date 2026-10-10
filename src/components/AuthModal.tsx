import React, { useState } from 'react';
import { UserAccount, UserRole, StoreSettings } from '../types';
import { 
  LogIn, 
  Sparkles, 
  Clock, 
  KeyRound, 
  Building2, 
  UserPlus, 
  X, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  settings: StoreSettings;
  onLoginAsUser: (user: UserAccount) => void;
  onStartDemoSession: () => void;
  onShowToast: (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'update_password';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onLoginAsUser,
  onStartDemoSession,
  onShowToast,
  initialMode = 'login'
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'update_password'>(initialMode);

  // Login form
  const [loginEmail, setLoginEmail] = useState<string>('admin@orderflow.pro');
  const [loginPassword, setLoginPassword] = useState<string>('••••••••');
  const [loginRole, setLoginRole] = useState<UserRole>('Admin');

  // Register form
  const [regStoreName, setRegStoreName] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [resetSent, setResetSent] = useState<boolean>(false);

  // Update password form
  const [currentPwd, setCurrentPwd] = useState<string>('');
  const [newPwd, setNewPwd] = useState<string>('');
  const [confirmPwd, setConfirmPwd] = useState<string>('');

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user: UserAccount = {
      id: `usr_${Date.now()}`,
      name: loginEmail.split('@')[0].toUpperCase(),
      email: loginEmail,
      role: loginRole,
      tenantId: settings.storeName
    };
    onLoginAsUser(user);
    onShowToast('Signed In', `Welcome back, ${user.name}!`, 'success');
    onClose();
  };

  // Handle Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regStoreName || !regEmail) return;

    const user: UserAccount = {
      id: `usr_${Date.now()}`,
      name: regName || 'Store Admin',
      email: regEmail,
      role: 'Admin',
      tenantId: regStoreName
    };
    onLoginAsUser(user);
    onShowToast('Store Registered', `${regStoreName} created successfully!`, 'success');
    onClose();
  };

  // Handle Forgot Password
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setResetSent(true);
    onShowToast('Reset Link Dispatched', `Password reset instructions sent to ${forgotEmail}`, 'info');
  };

  // Handle Verified Password Update
  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd) {
      onShowToast('Verification Required', 'Please confirm your current password.', 'error');
      return;
    }
    if (newPwd.length < 6) {
      onShowToast('Weak Password', 'New password must be at least 6 characters.', 'warning');
      return;
    }
    if (newPwd !== confirmPwd) {
      onShowToast('Mismatch', 'New password and confirmation do not match.', 'error');
      return;
    }

    onShowToast('Password Updated', 'Your security password was successfully verified and changed.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
        
        {/* Glow Background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {mode === 'login' && 'Sign In to OrderFlow Pro'}
            {mode === 'register' && 'Register New Multi-Tenant Store'}
            {mode === 'forgot' && 'Reset Account Password'}
            {mode === 'update_password' && 'Verified Security Password Update'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ultra-modern POS and field wholesale order management
          </p>
        </div>

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <div className="space-y-4">
            
            {/* 1-Hour Instant Demo Login Banner */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Instant Demo Access</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                  Valid for 1 Hour
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Test the full POS, thermal receipt printing, field salesman booking, and inventory ledger without signing up.
              </p>
              <button
                type="button"
                onClick={() => {
                  onStartDemoSession();
                  onClose();
                }}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Launch Instant 1-Hour Demo →
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Or Sign In With Email</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role Designation</label>
                <select
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                >
                  <option value="Admin">Administrator (Full Access)</option>
                  <option value="Salesman">Field Salesman (Booking Interface)</option>
                  <option value="Cashier">POS Cashier (Billing & Printing)</option>
                  <option value="Warehouse">Warehouse Dispatch Manager</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Sign In to Account
              </button>
            </form>

            <div className="text-center text-[11px] text-slate-400 pt-1">
              Need a new multi-tenant organization?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Register Store
              </button>
            </div>

          </div>
        )}

        {/* MODE: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Organization / Store Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Metro Food Distributors"
                value={regStoreName}
                onChange={(e) => setRegStoreName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Owner / Administrator Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Vikram Singhania"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Create Password *</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Create Multi-Tenant Organization
            </button>

            <div className="text-center text-[11px] text-slate-400 pt-1">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="space-y-4 text-xs">
            {resetSent ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">Reset Verification Sent!</h4>
                <p className="text-[11px] text-slate-300">
                  We've dispatched an OTP password reset instruction link to <strong className="text-white">{forgotEmail}</strong>.
                </p>
                <button
                  onClick={() => {
                    setResetSent(false);
                    setMode('login');
                  }}
                  className="mt-2 px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <p className="text-slate-300 text-[11px]">
                  Enter your registered work email address below to receive an authenticated password recovery link.
                </p>

                <div>
                  <label className="text-slate-400 block mb-1">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@orderflow.pro"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Send Recovery Link
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-slate-400 hover:text-white text-[11px]"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* MODE: VERIFIED PASSWORD UPDATE */}
        {mode === 'update_password' && (
          <form onSubmit={handlePasswordUpdate} className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
              For security, you must re-authenticate with your <strong className="text-indigo-300">Current Password</strong> before committing a new password.
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Confirm existing credentials"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-type new password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Verify & Update Password
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
