'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, ShieldCheck, KeyRound, User, Sparkles, Building2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent, customUser?: string) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const userToLogin = customUser || username;
    const passToLogin = customUser ? 'password123' : password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userToLogin, password: passToLogin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }

      // Check role redirection
      if (data.user.role === 'CLEANER') {
        router.push('/housekeeping/cleaner-portal');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم');
      setLoading(false);
    }
  };

  const testRoles = [
    { username: 'admin', title: 'مسؤول النظام', role: 'ADMIN', color: 'from-amber-600 to-amber-800' },
    { username: 'reception', title: 'موظف الاستقبال', role: 'RECEPTIONIST', color: 'from-emerald-600 to-emerald-800' },
    { username: 'cleaner1', title: 'المنظف', role: 'CLEANER', color: 'from-blue-600 to-blue-800' },
    { username: 'cushion_manager', title: 'مدير الكوشن', role: 'CUSHION_MANAGER', color: 'from-purple-600 to-purple-800' },
    { username: 'supervisor', title: 'مشرفة النظافة', role: 'HOUSEKEEPING_SUPERVISOR', color: 'from-teal-600 to-teal-800' },
    { username: 'accountant', title: 'المحاسب المالي', role: 'ACCOUNTANT', color: 'from-cyan-600 to-cyan-800' },
    { username: 'maintenance', title: 'فني الصيانة', role: 'MAINTENANCE_TECH', color: 'from-orange-600 to-orange-800' },
    { username: 'chef_pos', title: 'خدمات المطاعم', role: 'RESTAURANT_STAFF', color: 'from-rose-600 to-rose-800' },
  ];

  return (
    <div className="min-h-screen bg-[#0A1B17] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-gold-400 to-gold-600 flex items-center justify-center mx-auto shadow-xl shadow-gold-500/20 mb-4 border border-gold-300/40">
            <Crown className="w-9 h-9 text-slate-950" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">فندق قصر الرياض الدولي</h1>
          <p className="text-sm text-gold-300/90 mt-1 font-medium">النظام المؤسسي لإدارة الفنادق الكبرى (PMS)</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 px-2.5 py-0.5 rounded-full font-semibold">
              متوافق مع ZATCA و شموس
            </span>
            <span className="text-[11px] bg-gold-950/80 text-gold-300 border border-gold-700/50 px-2.5 py-0.5 rounded-full font-semibold">
              160 غرفة جاهزة
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#122b25]/90 border border-emerald-800/40 rounded-2xl p-4 sm:p-7 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1.5">اسم المستخدم</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin أو reception أو cleaner1..."
                  required
                  className="w-full bg-[#091714] border border-emerald-800/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400 transition pl-10"
                />
                <User className="w-4 h-4 text-emerald-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#091714] border border-emerald-800/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400 transition pl-10"
                />
                <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-l from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-slate-950 font-black rounded-xl shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تسجيل الدخول للنظام</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Access Roles Selector */}
          <div className="mt-6 pt-5 border-t border-emerald-900/60">
            <p className="text-[11px] font-bold text-gray-400 text-center mb-3">
              ⚡ تجربة الأدوار الوظيفية بنقرة واحدة (كلمة المرور: password123)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {testRoles.map((r) => (
                <button
                  key={r.username}
                  type="button"
                  onClick={() => {
                    setUsername(r.username);
                    setPassword('password123');
                    handleLogin(undefined, r.username);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0c1e1a] border border-emerald-900/60 hover:border-gold-500/40 text-right transition group"
                >
                  <span className="text-xs text-gray-200 font-semibold group-hover:text-gold-300">{r.title}</span>
                  <span className="text-[10px] text-gray-500 font-mono">{r.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-emerald-500/60 mt-6 font-medium">
          قصر الرياض الدولي لإدارة الفنادق • نظام تشغيلي حقيقي مؤسسي
        </p>
      </div>
    </div>
  );
}

