'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

export default function MaintenancePage() {
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Form State
  const [form, setForm] = useState({
    roomId: '',
    assetName: '',
    issueType: 'PLUMBING',
    priority: 'MEDIUM',
    description: '',
    assignedToId: '',
    blocksRoomSale: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      const [ticketsRes, roomsRes] = await Promise.all([
        fetch('/api/maintenance').then((r) => r.json()),
        fetch('/api/rooms').then((r) => r.json()),
      ]);

      if (ticketsRes.success) {
        setTickets(ticketsRes.data);
        setTechnicians(ticketsRes.technicians);
      }
      if (roomsRes.success) setRooms(roomsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowNewModal(false);
        setForm({
          roomId: '',
          assetName: '',
          issueType: 'PLUMBING',
          priority: 'MEDIUM',
          description: '',
          assignedToId: '',
          blocksRoomSale: true,
        });
        loadData();
      }
    } catch {
      alert('فشل إنشاء بلاغ الصيانة');
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string, notes?: string) => {
    try {
      const res = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status, resolutionNotes: notes }),
      });
      if (res.ok) {
        setSelectedTicket(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>إدارة الصيانة والأعطال والأصول</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تسجيل ومتابعة بلاغات الصيانة، إيقاف الغرف المتضررة آلياً، واعتماد إعادة التشغيل
              </p>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="w-full sm:w-auto justify-center px-4 py-2 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء بلاغ صيانة جديد</span>
            </button>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">جاري جلب بلاغات الصيانة...</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm font-bold">لا توجد بلاغات صيانة حالياً</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">رقم البلاغ</th>
                      <th className="py-3 px-4">الغرفة / الأصل</th>
                      <th className="py-3 px-4">نوع العطل</th>
                      <th className="py-3 px-4">الأولوية</th>
                      <th className="py-3 px-4">الفني المسؤول</th>
                      <th className="py-3 px-4">وصف المشكلة</th>
                      <th className="py-3 px-4">حالة البلاغ</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{t.ticketNumber}</td>
                        <td className="py-3.5 px-4">
                          {t.room ? (
                            <span className="font-black text-slate-900">
                              غرفة #{t.room.roomNumber} (طابق {t.room.floor?.floorNumber})
                            </span>
                          ) : (
                            <span className="text-slate-600">{t.assetName || 'أصل عام'}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{t.issueType}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.priority === 'HIGH' || t.priority === 'EMERGENCY'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{t.assignedTo?.fullName || 'غير مسند'}</td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{t.description}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'RESOLVED' || t.status === 'CLOSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {t.status !== 'RESOLVED' && t.status !== 'CLOSED' ? (
                            <button
                              onClick={() => {
                                const notes = prompt('ملاحظات الإصلاح وقطع الغيار:');
                                handleUpdateStatus(t.id, 'RESOLVED', notes || 'تم الإصلاح وإعادة التشغيل');
                              }}
                              className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                            >
                              إصلاح وإعادة للتشغيل
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px] flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تم الإصلاح</span>
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

      {/* CREATE TICKET MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-800">إنشاء بلاغ صيانة جديد</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الغرفة المتأثرة</label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="">أصل عام / خارج الغرف</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      غرفة #{r.roomNumber} (طابق {r.floor?.floorNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع المشكلة</label>
                  <select
                    value={form.issueType}
                    onChange={(e) => setForm({ ...form, issueType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="PLUMBING">سباكة وصرف صحي</option>
                    <option value="ELECTRICAL">كهرباء وإنارة</option>
                    <option value="HVAC">تكييف وتهوية</option>
                    <option value="FURNITURE">أثاث ومفروشات</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الأولوية</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  >
                    <option value="LOW">منخفضة</option>
                    <option value="MEDIUM">متوسطة</option>
                    <option value="HIGH">عالية</option>
                    <option value="EMERGENCY">حرجة / طارئة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تعيين الفني المسؤول</label>
                <select
                  value={form.assignedToId}
                  onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="">غير مسند حالياً</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وصف العطل بالتفصيل</label>
                <textarea
                  rows={3}
                  required
                  placeholder="وصف المشكلة والملاحظات..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <label className="flex items-center gap-2 p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.blocksRoomSale}
                  onChange={(e) => setForm({ ...form, blocksRoomSale: e.target.checked })}
                  className="rounded text-rose-600"
                />
                <span className="text-[11px] font-bold">إيقاف بيع الغرفة وتحويلها فوراً لـ (تحت الصيانة)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 text-white font-bold rounded-xl shadow"
                >
                  إنشاء البلاغ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

