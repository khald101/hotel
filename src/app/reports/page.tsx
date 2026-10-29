'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  BarChart3,
  TrendingUp,
  Percent,
  DollarSign,
  Download,
  Calendar,
  Sparkles,
  BedDouble,
  ShieldCheck,
} from 'lucide-react';

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const u = await authRes.json();
          setUser(u.user);
        }

        const res = await fetch('/api/reports');
        if (res.ok) {
          const json = await res.json();
          setReport(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>التقارير والمؤشرات الفندقية المتقدمة</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                حسابات معتمدة لمعدل الإشغال، ADR، RevPAR، وتحليلات الإيرادات عبر الأقسام المختلفة
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-200"
            >
              <Download className="w-4 h-4" />
              <span>طباعة / تصدير التقرير</span>
            </button>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs">جاري تجهيز التحليلات المالية والتشغيلية...</div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Executive Metrics Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                <div className="luxury-card p-5 rounded-2xl border-t-4 border-t-emerald-600">
                  <span className="text-xs font-bold text-slate-500">نسبة الإشغال (Occupancy Rate)</span>
                  <p className="text-3xl font-black text-slate-800 mt-2">{report?.occupancyRate || 0}%</p>
                  <p className="text-[11px] text-emerald-600 mt-1">
                    {report?.occupied} مشغولة من أصل {report?.totalRooms}
                  </p>
                </div>

                <div className="luxury-card p-5 rounded-2xl border-t-4 border-t-gold-500">
                  <span className="text-xs font-bold text-slate-500">متوسط السعر اليومي (ADR)</span>
                  <p className="text-3xl font-black text-slate-800 mt-2">{report?.adr || 0} ر.س</p>
                  <p className="text-[11px] text-slate-500 mt-1">Average Daily Rate</p>
                </div>

                <div className="luxury-card p-5 rounded-2xl border-t-4 border-t-cyan-600">
                  <span className="text-xs font-bold text-slate-500">الإيراد لكل غرفة متاحة (RevPAR)</span>
                  <p className="text-3xl font-black text-slate-800 mt-2">{report?.revpar || 0} ر.س</p>
                  <p className="text-[11px] text-slate-500 mt-1">Revenue Per Available Room</p>
                </div>

                <div className="luxury-card p-5 rounded-2xl border-t-4 border-t-purple-600">
                  <span className="text-xs font-bold text-slate-500">إجمالي الإيرادات المسجلة</span>
                  <p className="text-3xl font-black text-slate-800 mt-2">
                    {(report?.grossRev || 0).toLocaleString()} ر.س
                  </p>
                  <p className="text-[11px] text-purple-700 mt-1">
                    ضريبة القيمة المضافة 15%: {(report?.totalTax || 0).toLocaleString()} ر.س
                  </p>
                </div>
              </div>

              {/* Revenue Category Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">
                    توزيع الإيرادات بحسب مراكز التكلفة
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-slate-600">إيرادات الغرف والإقامة:</span>
                      <span className="font-black text-slate-900">{(report?.roomRev || 0).toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-slate-600">إيرادات المطاعم والمشروبات POS:</span>
                      <span className="font-black text-slate-900">{(report?.fbRev || 0).toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-slate-600">إيرادات الخدمات الإضافية والميني بار:</span>
                      <span className="font-black text-slate-900">{(report?.serviceRev || 0).toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-slate-50 px-3 rounded-xl font-bold">
                      <span className="text-slate-800">مجموع الإيراد الإجمالي:</span>
                      <span className="text-emerald-800 text-sm font-black">
                        {(report?.grossRev || 0).toLocaleString()} ر.س
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">
                    أداء التدبير الفندقي والتفتيش (Housekeeping SLA)
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-slate-600">إجمالي مهام النظافة:</span>
                      <span className="font-bold text-slate-900">{report?.housekeeping?.totalTasks || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-slate-600">غرف اجتازت التفتيش بنجاح:</span>
                      <span className="font-bold text-emerald-700">{report?.housekeeping?.passedTasks || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-slate-600">غرف أعيدت لإعادة التنظيف (رفض):</span>
                      <span className="font-bold text-rose-700">{report?.housekeeping?.recleanTasks || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Types Occupancy Breakdown */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">
                  معدلات الإشغال بحسب تصنيف الغرفة
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {report?.typeBreakdown?.map((item: any) => {
                    const pct = item.count > 0 ? Math.round((item.occupied / item.count) * 100) : 0;
                    return (
                      <div key={item.name} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="font-bold text-xs text-slate-800">{item.name}</p>
                        <p className="text-xl font-black text-slate-900 mt-2">{pct}%</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {item.occupied} من أصل {item.count} غرفة
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

