
import React, { useState } from 'react';
import { Layout as LayoutIcon, ArrowRight, Mail, Lock, ChevronLeft, Facebook, User } from 'lucide-react';
import { supabase } from '../services/supabase';
import { toast } from 'sonner';

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onBack, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!isLogin && !fullName) newErrors.fullName = 'Full name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin) {
      const emailName = email.split('@')[0].toLowerCase();
      const firstName = fullName.split(' ')[0].toLowerCase();
      
      // Professional constraints for Signup
      if (password.length < 8) {
        newErrors.password = 'Minimum 8 characters required';
      } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
        newErrors.password = 'Must include upper and lower case';
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        newErrors.password = 'Must include a special character';
      } else if (emailName.length >= 4 && password.toLowerCase().includes(emailName)) {
        newErrors.password = 'Cannot contain your email name';
      } else if (firstName.length >= 4 && password.toLowerCase().includes(firstName)) {
        newErrors.password = 'Cannot contain your first name';
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 characters required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Welcome back!');
        onLoginSuccess();
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;

        // Create user profile in public.User table
        if (data.user) {
          const { error: profileError } = await supabase
            .from('User')
            .upsert([
              {
                id: data.user.id,
                email: data.user.email,
                name: fullName
              }
            ]);
          if (profileError) console.error('Error creating profile:', profileError);
        }

        toast.success('Account created! Please check your email.');
        // If auto-signed in, trigger success
        if (data.session) onLoginSuccess();
        else setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col h-screen overflow-hidden animate-in fade-in duration-500">

      {/* Top Header Layer - Fixed position, no blur to prevent rendering issues */}
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex justify-between items-center absolute top-0 left-0 right-0 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 group transition-all"
        >
          <ChevronLeft size={18} className="text-primary/40 group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40 group-hover:text-primary transition-colors">BACK TO STORE</span>
        </button>

        <div className="w-8 h-8 md:w-10 md:h-10 bg-highlight rounded-xl flex items-center justify-center text-background rotate-[-8deg] shadow-xl">
          <LayoutIcon size={18} className="md:size-[20px]" />
        </div>
      </div>

      {/* Centered Form Content - Perfectly centered with no scroll */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6 md:space-y-8 animate-in slide-in-from-bottom-8 duration-700">

          {/* Titles - Scaled for better vertical fit */}
          <div className="space-y-1 text-center">
            <h2 className="text-3xl md:text-5xl font-serif text-primary tracking-tight leading-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-body/50 text-[10px] md:text-sm font-medium">Please enter your PlanPro Passport details.</p>
          </div>

          {/* Form - Tighter spacing to fit within height */}
          <form className="space-y-3 md:space-y-5" onSubmit={handleSubmit}>

            {!isLogin && (
              <div className="space-y-1 md:space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary/50 ml-1">FULL NAME</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className={`w-full pl-6 pr-6 py-3.5 md:py-4 bg-secondary border ${errors.fullName ? 'border-red-500/50' : 'border-text/10'} focus:border-primary/50 rounded-[20px] md:rounded-[24px] outline-none transition-all text-sm font-medium text-text placeholder:text-text/20 shadow-sm`}
                    required
                  />
                  {errors.fullName && <p className="text-[10px] text-red-400 font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.fullName}</p>}
                </div>
              </div>
            )}

            <div className="space-y-1 md:space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary/50 ml-1">EMAIL ADDRESS</label>
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`w-full pl-6 pr-6 py-3.5 md:py-4 bg-background border ${errors.email ? 'border-red-500/50' : 'border-text/10'} focus:border-primary/50 rounded-[20px] md:rounded-[24px] outline-none transition-all text-sm font-medium text-text placeholder:text-text/20 shadow-sm`}
                  required
                />
                {errors.email && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.email}</p>}
              </div>
            </div>

            <div className="space-y-1 md:space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary/50 ml-1">PASSWORD</label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-6 pr-6 py-3.5 md:py-4 bg-background border ${errors.password ? 'border-red-500/50' : 'border-text/10'} focus:border-primary/50 rounded-[20px] md:rounded-[24px] outline-none transition-all text-sm font-medium text-text placeholder:text-text/20 shadow-sm`}
                  required
                />
                {errors.password && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.password}</p>}
                
                {/* Real-time Password Requirements Checklist for Signup */}
                {!isLogin && password.length > 0 && (
                  <div className="mt-3 px-2 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className={`text-[9px] font-bold flex items-center gap-1.5 ${password.length >= 8 ? 'text-green-500' : 'text-primary/30'}`}>
                      <div className={`w-1 h-1 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-primary/30'}`} />
                      8+ CHARACTERS
                    </div>
                    <div className={`text-[9px] font-bold flex items-center gap-1.5 ${( /[A-Z]/.test(password) && /[a-z]/.test(password) ) ? 'text-green-500' : 'text-primary/30'}`}>
                      <div className={`w-1 h-1 rounded-full ${( /[A-Z]/.test(password) && /[a-z]/.test(password) ) ? 'bg-green-500' : 'bg-primary/30'}`} />
                      UPPER & LOWER CASE
                    </div>
                    <div className={`text-[9px] font-bold flex items-center gap-1.5 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-500' : 'text-primary/30'}`}>
                      <div className={`w-1 h-1 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bg-green-500' : 'bg-primary/30'}`} />
                      SPECIAL CHARACTER
                    </div>
                    <div className={`text-[9px] font-bold flex items-center gap-1.5 ${(!password.toLowerCase().includes(email.split('@')[0].toLowerCase()) || email.split('@')[0].length < 4) ? 'text-green-500' : 'text-red-400'}`}>
                      <div className={`w-1 h-1 rounded-full ${(!password.toLowerCase().includes(email.split('@')[0].toLowerCase()) || email.split('@')[0].length < 4) ? 'bg-green-500' : 'bg-red-400'}`} />
                      NO PERSONAL INFO
                    </div>
                    <div className={`text-[9px] font-bold flex items-center gap-1.5 ${password === confirmPassword && confirmPassword.length > 0 ? 'text-green-500' : 'text-primary/30'}`}>
                      <div className={`w-1 h-1 rounded-full ${password === confirmPassword && confirmPassword.length > 0 ? 'bg-green-500' : 'bg-primary/30'}`} />
                      PASSWORDS MATCH
                    </div>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-4 duration-700">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 px-4">Confirm Password</label>
                  <div className="relative group">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-6 pr-6 py-3.5 md:py-4 bg-background border ${errors.confirmPassword ? 'border-red-500/50' : 'border-text/10'} focus:border-primary/50 rounded-[20px] md:rounded-[24px] outline-none transition-all text-sm font-medium text-text placeholder:text-text/20 shadow-sm`}
                      required
                    />
                    {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 text-[10px] md:text-[11px] px-1 py-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded-md border-primary/10 text-primary focus:ring-primary/20 transition-all cursor-pointer appearance-none bg-secondary border checked:bg-primary"
                />
                <span className="text-body/50 font-semibold group-hover:text-primary transition-colors">Remember me</span>
              </label>
              {isLogin && <button type="button" className="font-bold text-primary hover:opacity-60 transition-opacity">Forgot Password?</button>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 md:py-4 bg-highlight text-background rounded-[20px] md:rounded-[24px] font-bold uppercase tracking-widest text-[10px] md:text-[11px] flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-highlight/10 group mt-2 disabled:opacity-50"
            >
              {loading ? 'PROCESSING...' : (isLogin ? 'SIGN IN' : 'JOIN PLANPRO')} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Switch & Social */}
          <div className="space-y-6 md:space-y-8 pt-2">
            <p className="text-[11px] md:text-sm font-medium text-body/60 text-center">
              {isLogin ? "Don't have an account?" : "Already a member?"} {' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-extrabold hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
