'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  LogOut,
  UserCircle,
  Building,
  Clock,
  Sparkles,
  RefreshCw,
  ChevronDown,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  user?: {
    username: string;
    fullName: string;
    role: string;
    jobTitle: string;
  };
  onRoleSwitch?: (username: string) => void;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const quickRoles = [
    { username: 'admin', label: 'مسؤول النظام (Admin)', role: 'ADMIN' },
    { username: 'reception', label: 'موظف الاستقبال (Reception)', role: 'RECEPTIONIST' },
    { username: 'supervisor', label: 'مشرفة النظافة (Supervisor)', role: 'HOUSEKEEPING_SUPERVISOR' },
    { username: 'cleaner1', label: 'المنظف (Cleaner 1)', role: 'CLEANER' },
    { username: 'cushion_manager', label: 'مدير الكوشن (Cushion Manager)', role: 'CUSHION_MANAGER' },
    { username: 'accountant', label: 'المحاسب المالي (Accountant)', role: 'ACCOUNTANT' },
    { username: 'maintenance', label: 'فني الصيانة (Maintenance)', role: 'MAINTENANCE_TECH' },
  ];

  const handleSwitchRole = async (targetUsername: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername, password: 'password123' }),
      });
      if (res.ok) {
        if (targetUsername.startsWith('cleaner')) {
          window.location.href = '/housekeeping/cleaner-portal';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openMobileSidebar = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-sidebar'));
    }
  };

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200/80 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm w-full">
      {/* Left: Mobile Toggle & Property Info */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={openMobileSidebar}
          aria-label="فتح القائمة الرئيسية"
          className="lg:hidden p-2 text-slate-700 hover:text-emerald-800 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Branch indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-700 bg-slate-50 border border-slate-200 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold truncate">
          <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 flex-shrink-0" />
          <span className="truncate">المقر الرئيسي (الرياض)</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
        </div>

        {/* Riyadh Time (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1.5 text-slate-500 text-xs">
          <Clock className="w-3.5 h-3.5 text-gold-600" />
          <span>توقيت الرياض</span>
        </div>
      </div>

      {/* Right: Quick Role Switcher, User Card, Logout */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Quick Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-palace-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700" />
            <span className="font-bold hidden xs:inline">تبديل الدور</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute left-0 mt-2 w-56 sm:w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                اختر الحساب للتجربة الفورية:
              </div>
              {quickRoles.map((r) => (
                <button
                  key={r.username}
                  onClick={() => {
                    setRoleMenuOpen(false);
                    handleSwitchRole(r.username);
                  }}
                  className={`w-full text-right px-3.5 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 ${
                    user?.username === r.username ? 'bg-emerald-50/70 font-bold text-emerald-800' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{r.label}</span>
                  {user?.username === r.username && (
                    <span className="text-[10px] text-emerald-600 font-bold mr-1">الحالي</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2 pr-1 sm:pr-2 border-r border-slate-200">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold text-xs sm:text-sm flex-shrink-0">
            {user?.fullName ? user.fullName[0] : 'U'}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 truncate max-w-[110px]">{user?.fullName || 'المستخدم'}</p>
            <p className="text-[10px] text-slate-500 truncate max-w-[110px]">{user?.jobTitle || 'موظف'}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="تسجيل الخروج"
          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
}
