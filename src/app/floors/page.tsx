'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  BedDouble,
  Building2,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function FloorsPage() {
  const [user, setUser] = useState<any>(null);
  const [floors, setFloors] = useState<any[]>([]);
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFloor, setEditingFloor] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [floorNumber, setFloorNumber] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  const loadFloors = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      let url = '/api/floors?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter === 'ACTIVE') url += 'active=true&';
      if (statusFilter === 'INACTIVE') url += 'active=false&';

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setFloors(json.data);
        setHotel(json.hotel);
      }
    } catch (err) {
      console.error('Error fetching floors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloors();
  }, [search, statusFilter]);

  const openAddModal = () => {
    setErrorMessage('');
    // Auto-suggest next floor number
    const maxNum = floors.reduce((max, f) => (f.floorNumber > max ? f.floorNumber : max), 0);
    const nextNum = maxNum + 1;
    setFloorNumber(String(nextNum));
    setNameAr(`الطابق ${nextNum}`);
    setNameEn(`Floor ${nextNum}`);
    setDescription('');
    setActive(true);
    setShowAddModal(true);
  };

  const openEditModal = (f: any) => {
    setErrorMessage('');
    setEditingFloor(f);
    setFloorNumber(String(f.floorNumber));
    setNameAr(f.nameAr);
    setNameEn(f.nameEn || '');
    setDescription(f.description || '');
    setActive(Boolean(f.active));
  };

  const handleSaveFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      const isEdit = Boolean(editingFloor);
      const url = '/api/floors';
      const method = isEdit ? 'PUT' : 'POST';
      const payload: any = {
        floorNumber: parseInt(floorNumber, 10),
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || undefined,
        description: description.trim() || undefined,
        active,
      };

      if (isEdit) {
        payload.id = editingFloor.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'فشلت العملية');
        setSaving(false);
        return;
      }

      setShowAddModal(false);
      setEditingFloor(null);
      loadFloors();
    } catch {
      setErrorMessage('حدث خطأ أثناء حفظ الطابق');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (f: any) => {
    try {
      const res = await fetch('/api/floors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: f.id,
          active: !f.active,
        }),
      });
      if (res.ok) {
        loadFloors();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      alert('فشل تحديث حالة الطابق');
    }
  };

  const handleDeleteFloor = async (f: any) => {
    if (f._count?.rooms > 0) {
      alert(
        `لا يمكن حذف هذا الطابق لوجود (${f._count.rooms}) غرفة مرتبطة به حالياً.\nيجب نقل أو حذف الغرف أولاً للحفاظ على سلامة سجلات الفندق التاريخية.`
      );
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف الطابق رقم ${f.floorNumber} (${f.nameAr}) نهائياً؟`)) {
      return;
    }

    try {
      const res = await fetch(`/api/floors?id=${f.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      loadFloors();
    } catch {
      alert('فشل حذف الطابق');
    }
  };

  const totalRooms = floors.reduce((acc, f) => acc + (f._count?.rooms || 0), 0);
  const activeFloorsCount = floors.filter((f) => f.active).length;
  const inactiveFloorsCount = floors.filter((f) => !f.active).length;

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          {/* Header Banner */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-800 text-gold-400 flex items-center justify-center font-black">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-800">
                    وحدة إدارة الطوابق (Floor Management)
                  </h2>
                  <p className="text-xs text-slate-500">
                    {hotel?.nameAr || 'فندق قصر الرياض الدولي'} • الهيكل المباشر (الفندق ← الطوابق ← الغرف)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/rooms"
                className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <BedDouble className="w-4 h-4 text-slate-600" />
                <span>إدارة وتوزيع الغرف</span>
              </Link>
              <button
                onClick={openAddModal}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-l from-gold-500 to-gold-600 hover:from-gold-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة طابق جديد</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500">إجمالي الطوابق</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{floors.length}</p>
              <span className="text-[10px] text-slate-400">طوابق مسجلة في الفندق</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-800">طوابق نشطة</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{activeFloorsCount}</p>
              <span className="text-[10px] text-emerald-600">تستقبل غرف جديدة</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
              <span className="text-[11px] font-bold text-amber-800">طوابق موقوفة</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{inactiveFloorsCount}</p>
              <span className="text-[10px] text-amber-600">معطلة عن إضافة غرف</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500">إجمالي الغرف المرتبطة</span>
              <p className="text-2xl font-black text-palace-950 mt-1">{totalRooms}</p>
              <span className="text-[10px] text-slate-400">غرفة موزعة عبر الطوابق</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md relative">
              <input
                type="text"
                placeholder="ابحث برقم الطابق أو الاسم أو الوصف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 pl-8 focus:outline-none focus:border-emerald-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusFilter === 'ALL' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  الكل ({floors.length})
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusFilter === 'ACTIVE' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  النشطة فقط
                </button>
                <button
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusFilter === 'INACTIVE' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  المعطلة
                </button>
              </div>

              <button
                onClick={loadFloors}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                title="تحديث القائمة"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Floors Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-slate-400 text-xs">جاري تحميل بيانات الطوابق...</div>
            ) : floors.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Layers className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">لا توجد طوابق مضافة مطابقة للبحث</p>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold"
                >
                  إضافة أول طابق الآن
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">رقم الطابق</th>
                      <th className="py-3 px-4">اسم الطابق (عربي)</th>
                      <th className="py-3 px-4">اسم الطابق (إنجليزي)</th>
                      <th className="py-3 px-4">الغرف المرتبطة</th>
                      <th className="py-3 px-4">الحالة التشغيلية</th>
                      <th className="py-3 px-4">الوصف والملاحظات</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {floors.map((f) => {
                      const roomCount = f._count?.rooms || 0;
                      return (
                        <tr key={f.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {f.floorNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-black text-slate-800 text-sm">{f.nameAr}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-500 font-mono">{f.nameEn || '-'}</td>
                          <td className="py-3.5 px-4">
                            <Link
                              href={`/rooms?floorId=${f.id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-black hover:bg-emerald-100 transition"
                            >
                              <BedDouble className="w-3.5 h-3.5" />
                              <span>{roomCount} غرفة</span>
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                f.active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {f.active ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>نشط (يستقبل غرف)</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>موقوف عن استقبال غرف</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{f.description || '-'}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(f)}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                                title="تعديل الطابق"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleToggleStatus(f)}
                                className={`p-1.5 rounded-lg transition ${
                                  f.active
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={f.active ? 'إيقاف استقبال غرف جديدة' : 'تفعيل استقبال الغرف'}
                              >
                                {f.active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </button>

                              <button
                                onClick={() => handleDeleteFloor(f)}
                                className={`p-1.5 rounded-lg transition ${
                                  roomCount > 0
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-rose-600 hover:bg-rose-50'
                                }`}
                                title={
                                  roomCount > 0
                                    ? 'لا يمكن حذف الطابق لاحتوائه على غرف'
                                    : 'حذف الطابق'
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ADD / EDIT FLOOR MODAL */}
      {(showAddModal || editingFloor) && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-800">
                {editingFloor ? `تعديل الطابق (${editingFloor.nameAr})` : 'إضافة طابق جديد للفندق'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingFloor(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveFloor} className="space-y-4 mt-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[11px] text-slate-500">الفندق التابع له الطابق:</p>
                <p className="font-bold text-slate-800 mt-0.5">{hotel?.nameAr || 'فندق قصر الرياض الدولي'}</p>
                <p className="text-[10px] text-emerald-700 mt-0.5 font-semibold">
                  ✓ يتبع الفندق مباشرة (نظام الفندق الواحد دون مبانٍ)
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  رقم الطابق <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="مثال: -1، 0، 1، 2، 3..."
                  value={floorNumber}
                  onChange={(e) => setFloorNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  يمكن إدخال أرقام سالبة للقبو (-1)، أو صفر للطابق الأرضي، أو أرقام موجبة. يمنع تكرار الرقم في الفندق.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم الطابق بالعربية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الطابق الأرضي، الطابق الأول، الطابق الملكي..."
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الطابق بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: Ground Floor, Royal Floor..."
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف أو الملاحظات (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="مثال: يضم الأجنحة الملكية والبانورامية، مجهز بعوازل صوت..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-emerald-800 focus:ring-emerald-700"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">
                      تفعيل الطابق لاستقبال غرف جديدة
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      عند إلغاء التفعيل، يمنع النظام إضافة غرف جديدة إلى هذا الطابق حتى إعادة تنشيطه.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingFloor(null);
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-l from-gold-500 to-gold-600 hover:from-gold-400 text-slate-950 font-black rounded-xl shadow-md transition"
                >
                  {saving ? 'جاري الحفظ...' : editingFloor ? 'حفظ التعديلات' : 'إنشاء الطابق'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

