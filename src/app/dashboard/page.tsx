'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  BedDouble,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  Sparkles,
  Wrench,
  Users,
  LogOut,
  LogIn,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.push('/login');
          return;
        }
        const authData = await authRes.json();
        setUser(authData.user);

        // If user is cleaner, redirect to cleaner portal
        if (authData.user.role === 'CLEANER') {
          router.push('/housekeeping/cleaner-portal');
          return;
        }

        const statsRes = await fetch('/api/dashboard/stats');
        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          setStats(statsJson.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-bold text-slate-600">جاري تحميل المؤشرات التشغيلية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      {/* Sidebar */}
      <Sidebar userRole={user.role} />

      {/* Main Content Area */}
      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-5 sm:space-y-8 max-w-full">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-l from-[#0F241F] to-[#1E3831] rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-900/60">
            <div>
              <div className="flex items-center gap-2 text-gold-400 text-xs font-bold mb-1">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>نظام التشغيل الفندقي المؤسسي المباشر</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black">أهلاً بك، {user.fullName}</h2>
              <p className="text-xs text-gray-300 mt-1">
                الدور: <span className="text-gold-300 font-bold">{user.jobTitle}</span> • يتم حساب جميع المؤشرات لحظياً من قاعدة البيانات الفعلية
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/frontdesk"
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-bold rounded-xl text-xs shadow-md hover:brightness-105 transition flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>شاشة التسكين</span>
              </Link>
              <Link
                href="/rooms"
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs border border-white/20 transition flex items-center justify-center gap-2"
              >
                <BedDouble className="w-4 h-4" />
                <span>خريطة الـ 160 غرفة</span>
              </Link>
            </div>
          </div>

          {/* Primary KPI Cards (Occupancy, ADR, RevPAR, Revenue) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Occupancy Rate */}
            <div className="luxury-card p-5 rounded-2xl border-t-4 border-t-emerald-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">نسبة الإشغال الفعلية</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">{stats?.occupancyRate || 0}%</span>
                <span className="text-xs font-bold text-emerald-600">
                  ({stats?.occupiedRooms || 0} من أصل {stats?.totalRooms || 160})
                </span>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats?.occupancyRate || 0)}%` }}
                ></div>
              </div>
            </div>

            {/* ADR */}
            <div className="luxury-card p-5 rounded-2xl border-t-4 border-t-gold-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">متوسط سعر الغرفة (ADR)</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-gold-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">{stats?.adr || 0}</span>
                <span className="text-xs font-bold text-slate-500">ر.س / ليلة</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">إجمالي إيراد الغرف مقسوماً على الغرف المشغولة</p>
            </div>

            {/* RevPAR */}
            <div className="luxury-card p-5 rounded-2xl border-t-4 border-t-cyan-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">الإيراد لكل غرفة متاحة (RevPAR)</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">{stats?.revpar || 0}</span>
                <span className="text-xs font-bold text-slate-500">ر.س / غرفة</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">مقياس الكفاءة الفندقية لكل غرفة متاحة للبيع</p>
            </div>

            {/* Total Collected Payments */}
            <div className="luxury-card p-5 rounded-2xl border-t-4 border-t-purple-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">المبالغ المحصلة (مدى / نقد)</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">
                  {(stats?.totalCollected || 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500">ر.س</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>المستحقات المتبقية:</span>
                <span className="font-bold text-rose-600">{(stats?.totalOutstanding || 0).toLocaleString()} ر.س</span>
              </div>
            </div>
          </div>

          {/* Operational Room Readiness Matrix & Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rooms Status Distribution */}
            <div className="luxury-card p-4 sm:p-6 rounded-2xl lg:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 sm:mb-5 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-800">حالة جاهزية وتوزيع الـ 160 غرفة</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">تفصيل دقيق يوضح الفرق بين الإشغال والنظافة والصيانة</p>
                </div>
                <Link href="/rooms" className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1">
                  <span>فتح إدارة الغرف</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>جاهزة ومفتشة للتسكين</span>
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-800 mt-2">{stats?.readyRooms || 0}</p>
                  <p className="text-[10px] text-emerald-600 mt-1">شاغرة + اجتازت التفتيش + صالحة للبيع</p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-700">
                    <span>تحتاج تنظيف (Dirty)</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-black text-amber-800 mt-2">{stats?.departedNeedsCleaning || 0}</p>
                  <p className="text-[10px] text-amber-600 mt-1">غادرها النزيل وتنتظر بدء التنظيف</p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                    <span>بانتظار التفتيش والمطابقة</span>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-blue-800 mt-2">{stats?.pendingInspection || 0}</p>
                  <p className="text-[10px] text-blue-600 mt-1">نظفها العامل وتنتظر اعتماد المشرف</p>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-700">
                    <span>تحت الصيانة (Out of Order)</span>
                    <Wrench className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-black text-rose-800 mt-2">{stats?.underMaintenance || 0}</p>
                  <p className="text-[10px] text-rose-600 mt-1">موقوفة عن البيع لوجود بلاغ عطل</p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-700">
                    <span>مشغولة بنزيل حالي</span>
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-black text-purple-800 mt-2">{stats?.occupiedRooms || 0}</p>
                  <p className="text-[10px] text-purple-600 mt-1">نزيل مسجل دخول فعلياً</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>الإجمالي الكلي للغرف</span>
                    <BedDouble className="w-4 h-4 text-slate-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-800 mt-2">{stats?.totalRooms || 160}</p>
                  <p className="text-[10px] text-slate-500 mt-1">موزعة عبر 5 طوابق ومبنيين</p>
                </div>
              </div>
            </div>

            {/* Today's Front Desk Activity */}
            <div className="luxury-card p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800 border-b border-slate-100 pb-3">
                  حركة اليوم في الاستقبال
                </h3>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">وصولات مؤكدة اليوم</p>
                        <p className="text-[11px] text-slate-400">حجوزات مستحقة التسكين</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-800">{stats?.todayArrivals || 0}</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">مغادرات متوقعة اليوم</p>
                        <p className="text-[11px] text-slate-400">نهاية فترة الإقامة</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-800">{stats?.todayDepartures || 0}</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">مهام نظافة جارية</p>
                        <p className="text-[11px] text-slate-400">قيد التنفيذ والتفتيش</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-800">{stats?.openCleaningTasks || 0}</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">بلاغات صيانة مفتوحة</p>
                        <p className="text-[11px] text-slate-400">تنتظر قطع غيار أو إصلاح</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-800">{stats?.openMaintenanceTickets || 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <Link
                  href="/frontdesk"
                  className="w-full py-2.5 bg-palace-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-palace-800 transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>الانتقال لشاشة التسكين الفوري</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

