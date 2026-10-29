'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  Lock,
} from 'lucide-react';

export default function AuditPage() {
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const u = await authRes.json();
          setUser(u.user);
        }

        const res = await fetch('/api/audit');
        if (res.ok) {
          const json = await res.json();
          setLogs(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.username?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.includes(search)
  );

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>سجل التدقيق الأمني والعمليات الحساسة (Audit Log)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                سجل تاريخي غير قابل للتعديل يوثق جميع العمليات المالية والتسكين والاعتماد والتعديلات
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>سجل محمي ومؤرشف</span>
            </span>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="ابحث في سجل العمليات أو اسم المستخدم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 pl-8 focus:outline-none focus:border-emerald-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">جاري جلب سجلات التدقيق...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm font-bold">لا توجد سجلات مطابقة</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">التوقيت والتاريخ</th>
                      <th className="py-3 px-4">المستخدم المنفذ</th>
                      <th className="py-3 px-4">نوع العملية (Action)</th>
                      <th className="py-3 px-4">الكيان (Entity)</th>
                      <th className="py-3 px-4">التفاصيل والبيان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('ar-SA')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{log.username}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">{log.entityType}</td>
                        <td className="py-3 px-4 text-slate-700 leading-relaxed max-w-xl">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

