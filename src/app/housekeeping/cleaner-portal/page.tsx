'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Building,
  Layers,
  Wrench,
  LogOut,
  RefreshCw,
  MessageSquare,
  Check,
  X,
} from 'lucide-react';

export default function CleanerPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState('');
  const [activeTaskModal, setActiveTaskModal] = useState<any>(null);
  const [reportDefectModal, setReportDefectModal] = useState<any>(null);
  const [defectDesc, setDefectDesc] = useState('');

  const loadCleanerTasks = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        router.push('/login');
        return;
      }
      const u = await authRes.json();
      setUser(u.user);

      // Fetch only assigned tasks for this cleaner
      const res = await fetch('/api/housekeeping/tasks?cleanerOnly=true');
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCleanerTasks();
  }, []);

  const handleStartTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/housekeeping/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action: 'START' }),
      });
      if (res.ok) loadCleanerTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinishTask = async () => {
    if (!activeTaskModal) return;
    try {
      const res = await fetch('/api/housekeeping/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: activeTaskModal.id,
          action: 'FINISH',
          notes: actionNotes || 'تم تنظيف الغرفة وتغيير المفارش بالكامل',
        }),
      });
      if (res.ok) {
        setActiveTaskModal(null);
        setActionNotes('');
        loadCleanerTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDefectModal || !defectDesc) return;
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: reportDefectModal.roomId,
          description: defectDesc,
          issueType: 'OTHER',
          priority: 'HIGH',
          blocksRoomSale: true,
        }),
      });
      if (res.ok) {
        alert('تم رفع بلاغ العطل لفريق الصيانة بنجاح');
        setReportDefectModal(null);
        setDefectDesc('');
        loadCleanerTasks();
      }
    } catch {
      alert('فشل رفع البلاغ');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0A1B17] text-white flex flex-col justify-between">
      {/* Cleaner Top Bar */}
      <header className="bg-[#122B25] border-b border-emerald-900/60 p-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500 text-slate-950 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">بوابة التدبير الفندقي (المنظف)</h1>
              <p className="text-xs text-gold-300">{user?.fullName || 'عامل النظافة'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadCleanerTasks}
              className="p-2 text-emerald-300 hover:text-white rounded-lg bg-emerald-950/60 border border-emerald-800"
              title="تحديث المهام"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-rose-300 hover:text-rose-100 rounded-lg bg-rose-950/60 border border-rose-800"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Cleaner Task List (Large touch cards optimized for Mobile & Tablet) */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        {/* Info Banner */}
        <div className="bg-[#122B25]/80 p-3.5 rounded-xl border border-emerald-800/40 text-xs text-emerald-200 flex items-center justify-between">
          <span>مهامك المسندة اليوم: {tasks.length} مهمة</span>
          <span className="text-[11px] text-gold-400 font-bold">فندق قصر الرياض الدولي</span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-gray-400">جاري جلب قائمة الغرف المسندة إليك...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-[#122B25]/50 border border-emerald-900/40 rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-bold text-base text-gray-200">رائع! لا توجد مهام تنظيف معلقة لك حالياً</p>
            <p className="text-xs text-gray-400 mt-1">سيتم إشعارك فور إسناد أي غرفة جديدة</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isPending = task.status === 'PENDING';
            const isInProgress = task.status === 'IN_PROGRESS';
            const isInspection = task.status === 'PENDING_INSPECTION';
            const isReclean = task.status === 'NEEDS_RECLEAN';
            const isPassed = task.status === 'INSPECTED_PASSED';

            return (
              <div
                key={task.id}
                className="bg-[#122B25] border border-emerald-800/40 rounded-2xl p-5 shadow-lg space-y-3"
              >
                {/* Room and Floor Details */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-black text-white tracking-tight">#{task.room?.roomNumber}</span>
                    <p className="text-xs text-gold-300 font-semibold mt-0.5">
                      طابق {task.room?.floor?.floorNumber} • {task.room?.floor?.nameAr}
                    </p>
                  </div>

                  <div className="text-left">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        isPassed
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : isInspection
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                          : isInProgress
                          ? 'bg-blue-950 text-blue-300 border-blue-700'
                          : isReclean
                          ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                          : 'bg-amber-950 text-amber-300 border-amber-700'
                      }`}
                    >
                      {isPassed
                        ? 'اجتازت التفتيش ✅'
                        : isInspection
                        ? 'بانتظار تفتيش المشرف 🔍'
                        : isInProgress
                        ? 'جارٍ التنظيف ⏳'
                        : isReclean
                        ? 'تحتاج إعادة تنظيف ❌'
                        : 'بانتظار البدء'}
                    </span>
                  </div>
                </div>

                {/* Notes or inspection feedback */}
                {(task.cleanerNotes || task.inspectorNotes) && (
                  <div className="p-3 bg-[#0a1b17] rounded-xl border border-emerald-900/60 text-xs text-gray-300 space-y-1">
                    {task.cleanerNotes && <p>ملاحظة: {task.cleanerNotes}</p>}
                    {task.inspectorNotes && (
                      <p className="text-rose-400 font-bold">ملاحظة المشرف: {task.inspectorNotes}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  {isPending && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <Play className="w-4 h-4" />
                      <span>بدء التنظيف الآن</span>
                    </button>
                  )}

                  {isReclean && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>بدء إعادة التنظيف</span>
                    </button>
                  )}

                  {isInProgress && (
                    <button
                      onClick={() => {
                        setActiveTaskModal(task);
                        setActionNotes('');
                      }}
                      className="flex-1 py-3 bg-gradient-to-l from-gold-500 to-gold-600 hover:from-gold-400 text-slate-950 font-black text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <Check className="w-5 h-5" />
                      <span>تم التنظيف (إرسال للتفتيش)</span>
                    </button>
                  )}

                  {/* Report Defect button */}
                  <button
                    onClick={() => {
                      setReportDefectModal(task);
                      setDefectDesc('');
                    }}
                    className="p-3 bg-[#0a1b17] hover:bg-rose-950/40 text-gray-300 hover:text-rose-400 border border-emerald-900 rounded-xl transition"
                    title="الإبلاغ عن عطل في الغرفة"
                  >
                    <Wrench className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* CONFIRM CLEANING FINISHED MODAL */}
      {activeTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#122B25] border border-emerald-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-2">
              تأكيد اكتمال تنظيف الغرفة #{activeTaskModal.room?.roomNumber}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              سيتم إشعار مشرفة النظافة فوراً للتوجه للغرفة وفحصها واعتماد جاهزيتها للتسكين.
            </p>

            <label className="block text-xs font-bold text-emerald-200 mb-1">ملاحظاتك (اختياري):</label>
            <input
              type="text"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="تم تغيير الشراشف، تزويد المستلزمات..."
              className="w-full bg-[#091714] border border-emerald-800 rounded-xl p-2.5 text-xs text-white mb-4 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTaskModal(null)}
                className="py-2.5 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleFinishTask}
                className="py-2.5 bg-gold-500 text-slate-950 text-xs font-black rounded-xl shadow"
              >
                تأكيد الإرسال للتفتيش
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT DEFECT MODAL */}
      {reportDefectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#122B25] border border-emerald-800 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-2">
              الإبلاغ عن تلف/عطل في الغرفة #{reportDefectModal.room?.roomNumber}
            </h3>

            <form onSubmit={handleReportDefect} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">وصف العطل بدقة:</label>
                <textarea
                  rows={3}
                  required
                  value={defectDesc}
                  onChange={(e) => setDefectDesc(e.target.value)}
                  placeholder="مثال: تسريب مياه في المغسلة، أو عطل في التكييف..."
                  className="w-full bg-[#091714] border border-emerald-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReportDefectModal(null)}
                  className="py-2.5 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow"
                >
                  إرسال البلاغ للصيانة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-gray-500 border-t border-emerald-950">
        فندق قصر الرياض الدولي • شاشة المنظف المحمية
      </footer>
    </div>
  );
}

