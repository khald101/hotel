'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Plus,
  RefreshCw,
  X,
  Search,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function HousekeepingPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForInspection, setSelectedTaskForInspection] = useState<any>(null);
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      let url = '/api/housekeeping/tasks?';
      if (statusFilter) url += `status=${statusFilter}&`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data);
        setCleaners(json.cleaners);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  const handleInspectionDecision = async (action: 'INSPECT_PASS' | 'INSPECT_FAIL') => {
    if (!selectedTaskForInspection) return;
    try {
      const res = await fetch('/api/housekeeping/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTaskForInspection.id,
          action,
          notes: inspectorNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      setSelectedTaskForInspection(null);
      setInspectorNotes('');
      loadTasks();
    } catch {
      alert('فشل تسجيل قرار التفتيش');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>لوحة التدبير الفندقي والتفتيش (Housekeeping)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                توزيع ومتابعة مهام النظافة، فحص الغرف، واعتماد الجاهزية الرسمية للتسكين
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Link
                href="/housekeeping/cleaner-portal"
                className="w-full sm:w-auto justify-center px-3.5 py-2 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <span>واجهة المنظف المخصصة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === '' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                الكل ({tasks.length})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                بانتظار البدء
              </button>
              <button
                onClick={() => setStatusFilter('IN_PROGRESS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'IN_PROGRESS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                جارٍ التنظيف
              </button>
              <button
                onClick={() => setStatusFilter('PENDING_INSPECTION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'PENDING_INSPECTION' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                بانتظار التفتيش (يحتاج فحص)
              </button>
              <button
                onClick={() => setStatusFilter('INSPECTED_PASSED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'INSPECTED_PASSED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                جاهزة ومفتشة
              </button>
            </div>

            <button onClick={loadTasks} className="self-end sm:self-auto p-2 text-slate-400 hover:text-slate-600 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Tasks Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">جاري جلب مهام النظافة...</div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm font-bold">لا توجد مهام مطابقة</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">رقم المهمة</th>
                      <th className="py-3 px-4">الغرفة والموقع</th>
                      <th className="py-3 px-4">الأولوية</th>
                      <th className="py-3 px-4">المنظف المسؤول</th>
                      <th className="py-3 px-4">حالة التنظيف</th>
                      <th className="py-3 px-4">الملاحظات</th>
                      <th className="py-3 px-4 text-center">إجراء المشرف والتفتيش</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{task.taskNumber}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900 text-sm">#{task.room?.roomNumber}</span>
                          <span className="text-slate-400 mr-2 text-[11px]">
                            (طابق {task.room?.floor?.floorNumber} • {task.room?.floor?.nameAr})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              task.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-800'
                                : task.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {task.priority === 'URGENT' ? 'طارئة جداً' : task.priority === 'HIGH' ? 'مرتفعة' : 'عادية'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{task.assignedTo?.fullName || 'غير مسند'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              task.status === 'INSPECTED_PASSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : task.status === 'PENDING_INSPECTION'
                                ? 'bg-cyan-100 text-cyan-800'
                                : task.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : task.status === 'NEEDS_RECLEAN'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {task.status === 'INSPECTED_PASSED'
                              ? 'اجتازت التفتيش ✅'
                              : task.status === 'PENDING_INSPECTION'
                              ? 'بانتظار التفتيش 🔍'
                              : task.status === 'IN_PROGRESS'
                              ? 'جارٍ التنظيف ⏳'
                              : task.status === 'NEEDS_RECLEAN'
                              ? 'تحتاج إعادة تنظيف ❌'
                              : 'بانتظار التنظيف'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {task.cleanerNotes || task.inspectorNotes || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {task.status === 'PENDING_INSPECTION' && (
                            <button
                              onClick={() => {
                                setSelectedTaskForInspection(task);
                                setInspectorNotes('اجتازت الغرفة معايير الفحص المعتمدة بنجاح.');
                              }}
                              className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-lg text-xs shadow-sm inline-flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>فحص واعتماد الغرفة</span>
                            </button>
                          )}
                          {task.status === 'INSPECTED_PASSED' && (
                            <span className="text-emerald-700 font-bold text-[11px] flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>معتمدة للتسكين</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* INSPECTION DECISION MODAL */}
      {selectedTaskForInspection && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-800">تفتيش واعتماد جاهزية الغرفة</h3>
                <p className="text-xs text-slate-500">الغرفة #{selectedTaskForInspection.room?.roomNumber}</p>
              </div>
              <button onClick={() => setSelectedTaskForInspection(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">
                  المنظف الذي أتم العمل: {selectedTaskForInspection.assignedTo?.fullName}
                </p>
                <p className="text-slate-500 mt-1">ملاحظة المنظف: {selectedTaskForInspection.cleanerNotes || 'لا توجد'}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات وتقرير المفتش:</label>
                <textarea
                  rows={3}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleInspectionDecision('INSPECT_FAIL')}
                className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition"
              >
                رفض وإعادة للمنظف
              </button>
              <button
                type="button"
                onClick={() => handleInspectionDecision('INSPECT_PASS')}
                className="py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                قبول واعتماد الجاهزية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

