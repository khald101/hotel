'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck2,
  ConciergeBell,
  Sparkles,
  Wrench,
  Receipt,
  UtensilsCrossed,
  Boxes,
  Users2,
  BarChart3,
  ShieldCheck,
  Building2,
  ChevronLeft,
  Crown,
  X,
  Layers,
  Tags,
} from 'lucide-react';

interface SidebarProps {
  userRole?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ userRole = 'ADMIN', isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Listen for mobile open event from Header
  useEffect(() => {
    const handleOpen = () => setMobileOpen(true);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener('open-sidebar', handleOpen);
    window.addEventListener('close-sidebar', handleClose);
    return () => {
      window.removeEventListener('open-sidebar', handleOpen);
      window.removeEventListener('close-sidebar', handleClose);
    };
  }, []);

  // Close drawer when route changes on mobile
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Navigation items with role permissions
  const navItems = [
    {
      title: 'لوحة التحكم التنفيذية',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'CUSHION_MANAGER'],
    },
    {
      title: 'إدارة وتوزيع الغرف',
      href: '/rooms',
      icon: BedDouble,
      badge: '160 غرفة',
      roles: ['ADMIN', 'GENERAL_MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING_SUPERVISOR', 'CUSHION_MANAGER'],
    },
    {
      title: 'أنواع الغرف والشقق',
      href: '/room-types',
      icon: Tags,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'RECEPTIONIST', 'CUSHION_MANAGER'],
    },
    {
      title: 'إدارة الطوابق',
      href: '/floors',
      icon: Layers,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING_SUPERVISOR', 'CUSHION_MANAGER'],
    },
    {
      title: 'إدارة الحجوزات',
      href: '/reservations',
      icon: CalendarCheck2,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'RECEPTIONIST', 'CUSHION_MANAGER'],
    },
    {
      title: 'الاستقبال والتسكين',
      href: '/frontdesk',
      icon: ConciergeBell,
      badge: 'تشغيلي',
      roles: ['ADMIN', 'GENERAL_MANAGER', 'RECEPTIONIST'],
    },
    {
      title: 'التدبير الفندقي والتفتيش',
      href: '/housekeeping',
      icon: Sparkles,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'HOUSEKEEPING_SUPERVISOR'],
    },
    {
      title: 'بوابة المنظف المخصصة',
      href: '/housekeeping/cleaner-portal',
      icon: Sparkles,
      badge: 'المنظف',
      roles: ['CLEANER', 'ADMIN', 'HOUSEKEEPING_SUPERVISOR'],
    },
    {
      title: 'الهندسة والصيانة',
      href: '/maintenance',
      icon: Wrench,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'MAINTENANCE_TECH', 'HOUSEKEEPING_SUPERVISOR'],
    },
    {
      title: 'الفوترة وهيئة الزكاة ZATCA',
      href: '/billing',
      icon: Receipt,
      badge: 'المرحلة 2',
      roles: ['ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'RECEPTIONIST'],
    },
    {
      title: 'المطاعم ونقاط البيع POS',
      href: '/restaurant',
      icon: UtensilsCrossed,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'RESTAURANT_STAFF', 'RECEPTIONIST'],
    },
    {
      title: 'المخزون والمشتريات',
      href: '/inventory',
      icon: Boxes,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT', 'CUSHION_MANAGER', 'HOUSEKEEPING_SUPERVISOR'],
    },
    {
      title: 'الموظفون والصلاحيات',
      href: '/users',
      icon: Users2,
      badge: 'مدير الكوشن',
      roles: ['ADMIN', 'GENERAL_MANAGER'],
    },
    {
      title: 'التقارير والمؤشرات المالية',
      href: '/reports',
      icon: BarChart3,
      roles: ['ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'],
    },
    {
      title: 'سجل التدقيق والأمان',
      href: '/audit',
      icon: ShieldCheck,
      roles: ['ADMIN', 'GENERAL_MANAGER'],
    },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  const roleLabelMap: Record<string, string> = {
    ADMIN: 'مسؤول النظام',
    CLEANER: 'المنظف',
    CUSHION_MANAGER: 'مدير الكوشن',
    HOUSEKEEPING_SUPERVISOR: 'مشرفة النظافة',
    RECEPTIONIST: 'موظف الاستقبال',
    ACCOUNTANT: 'المحاسب المالي',
    MAINTENANCE_TECH: 'فني الصيانة',
    RESTAURANT_STAFF: 'موظف المطعم',
    GENERAL_MANAGER: 'المدير العام',
  };

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 h-20 border-b border-emerald-900/40 bg-[#0A1B17] flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20 flex-shrink-0">
            <Crown className="w-5 h-5 text-palace-950" />
          </div>
          <div className="truncate">
            <h1 className="font-black text-base tracking-wide text-white font-sans">قصر الرياض الدولي</h1>
            <p className="text-[11px] text-gold-300/80 font-medium">نظام إدارة الفنادق المؤسسي</p>
          </div>
        </div>

        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Role Badge Indicator */}
      <div className="px-5 py-3 bg-[#0c1e1a] border-b border-emerald-900/30 flex items-center justify-between text-xs text-emerald-200 flex-shrink-0">
        <span className="text-gray-400">الدور الحالي:</span>
        <span className="px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 font-semibold border border-gold-500/30">
          {roleLabelMap[userRole] || userRole}
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scroll">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-bold shadow-md shadow-gold-600/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-gold-400/80'}`} />
              <div className="flex-1 flex items-center justify-between overflow-hidden">
                <span className="truncate">{item.title}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-emerald-900/60 text-gold-300 border border-gold-400/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-emerald-900/40 bg-[#0A1B17] text-center text-[11px] text-gray-400 flex-shrink-0">
        <p className="font-semibold text-gray-300">نظام فندقي متوافق 100%</p>
        <p className="text-[10px] text-emerald-400 mt-0.5">ZATCA e-Invoicing & شموس</p>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Sidebar (always visible on lg: screens) */}
      <aside
        className={`hidden lg:flex fixed top-0 right-0 z-40 h-screen transition-all duration-300 bg-[#0F241F] text-white flex-col border-l border-emerald-950/40 shadow-2xl ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <NavContent isMobile={false} />
      </aside>

      {/* 2. Mobile Drawer (hidden on lg, slides in on small screens) */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Drawer Panel */}
        <aside
          className={`absolute top-0 right-0 h-full w-[280px] sm:w-80 bg-[#0F241F] text-white flex flex-col shadow-2xl border-l border-emerald-900/50 transition-transform duration-300 transform ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <NavContent isMobile={true} />
        </aside>
      </div>
    </>
  );
}
