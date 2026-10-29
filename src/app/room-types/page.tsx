'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Tags,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  BedDouble,
  DollarSign,
  Users,
  ShieldCheck,
  Check,
} from 'lucide-react';
import Link from 'next/link';

export default function RoomTypesPage() {
  const [user, setUser] = useState<any>(null);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [basePrice, setBasePrice] = useState('350');
  const [maxOccupancy, setMaxOccupancy] = useState('2');
  const [bedType, setBedType] = useState('سرير كينغ مزدوج');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  const loadRoomTypes = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      let url = '/api/room-types?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter === 'ACTIVE') url += 'active=true&';
      if (statusFilter === 'INACTIVE') url += 'active=false&';

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setRoomTypes(json.data);
      }
    } catch (err) {
      console.error('Error fetching room types:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoomTypes();
  }, [search, statusFilter]);

  const openAddModal = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setNameAr('');
    setNameEn('');
    setCode('');
    setBasePrice('350');
    setMaxOccupancy('2');
    setBedType('سرير كينغ مزدوج');
    setDescription('');
    setActive(true);
    setShowAddModal(true);
  };

  const openEditModal = (t: any) => {
    setErrorMessage('');
    setSuccessMessage('');
    setEditingType(t);
    setNameAr(t.nameAr);
    setNameEn(t.nameEn || '');
    setCode(t.code);
    setBasePrice(String(t.basePrice));
    setMaxOccupancy(String(t.maxOccupancy));
    setBedType(t.bedType || 'سرير مزدوج');
    setDescription(t.description || '');
    setActive(Boolean(t.active));
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSaving(true);

    try {
      if (editingType) {
        // Edit existing type
        const res = await fetch('/api/room-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingType.id,
            nameAr,
            nameEn,
            basePrice: parseFloat(basePrice),
            maxOccupancy: parseInt(maxOccupancy, 10),
            bedType,
            description,
            active,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || 'فشل تحديث نوع الغرفة أو الشقة');
          setSaving(false);
          return;
        }

        setEditingType(null);
        setSuccessMessage('تم تحديث النوع بنجاح');
      } else {
        // Create new type
        const res = await fetch('/api/room-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameAr,
            nameEn,
            code,
            basePrice: parseFloat(basePrice),
            maxOccupancy: parseInt(maxOccupancy, 10),
            bedType,
            description,
            active,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || 'فشل إنشاء نوع الغرفة أو الشقة');
          setSaving(false);
          return;
        }

        setShowAddModal(false);
        setSuccessMessage('تمت إضافة النوع الجديد بنجاح');
      }

      loadRoomTypes();
    } catch {
      setErrorMessage('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: any) => {
    try {
      const res = await fetch('/api/room-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: t.id,
          active: !t.active,
        }),
      });

      if (res.ok) {
        loadRoomTypes();
      } else {
        const data = await res.json();
        alert(data.error || 'فشل تغيير حالة التفعيل');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteType = async (t: any) => {
    const confirmDelete = confirm(`هل أنت متأكد من رغبتك في حذف نوع «${t.nameAr}»؟`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/room-types?id=${t.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'فشل حذف النوع');
        return;
      }

      alert('تم حذف نوع الغرفة/الشقة بنجاح.');
      loadRoomTypes();
    } catch {
      alert('فشل الاتصال بالخادم لحذف النوع');
    }
  };

  const filtered = roomTypes.filter((t) => {
    const matchesSearch =
      t.nameAr?.includes(search) ||
      t.nameEn?.toLowerCase().includes(search.toLowerCase()) ||
      t.code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? t.active
        : !t.active;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full">
          {/* Header Banner */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <Tags className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>إدارة أنواع الغرف والشقق والأسعار (Room & Apartment Types)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تعريف أنواع الوحدات السكنية (غرف، شقق، أجنحة) وتحديد سعر الليلة الأساسي والسعة والأسرّة
              </p>
            </div>

            <button
              onClick={openAddModal}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 hover:brightness-105"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة نوع جديد</span>
            </button>
          </div>

          {/* Quick Notice Alerts */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-bold">{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <input
                type="text"
                placeholder="ابحث باسم النوع (شقة، غرفة، جناح) أو الرمز..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 pl-8 focus:outline-none focus:border-emerald-600 shadow-sm"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                الكل ({roomTypes.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                المفعلة ({roomTypes.filter((t) => t.active).length})
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                المعطلة ({roomTypes.filter((t) => !t.active).length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل أنواع الغرف والشقق...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Tags className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-600 font-bold text-sm">لا توجد أنواع غرف أو شقق مسجلة تطابق البحث</p>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة نوع جديد الآن</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[850px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">اسم النوع والرمز</th>
                      <th className="py-3.5 px-4">سعر الليلة الواحدة</th>
                      <th className="py-3.5 px-4">السعة القصوى</th>
                      <th className="py-3.5 px-4">نوع الأسرّة</th>
                      <th className="py-3.5 px-4">الوحدات المرتبطة</th>
                      <th className="py-3.5 px-4">الحجوزات</th>
                      <th className="py-3.5 px-4">الحالة</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((type) => (
                      <tr key={type.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 text-sm">{type.nameAr}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                              {type.code}
                            </span>
                            {type.nameEn && <span className="text-[11px] text-slate-400">{type.nameEn}</span>}
                          </div>
                          {type.description && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 max-w-xs">{type.description}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900 text-sm">
                            {type.basePrice?.toLocaleString()} ر.س
                          </span>
                          <span className="text-[10px] text-slate-500 block">لكل ليلة</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{type.maxOccupancy} أشخاص</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{type.bedType || 'سرير مزدوج'}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200">
                            {type._count?.rooms || 0} وحدة
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-600 font-bold">{type._count?.reservations || 0} حجز</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              type.active
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {type.active ? 'مفعل وقابل للحجز' : 'معطل وموقوف'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(type)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                              title="تعديل بيانات النوع والسعر"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(type)}
                              className={`p-1.5 rounded-lg transition ${
                                type.active
                                  ? 'text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100'
                                  : 'text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                              title={type.active ? 'تعطيل النوع مؤقتاً' : 'تفعيل النوع'}
                            >
                              {type.active ? '⏸️' : '▶️'}
                            </button>

                            <button
                              onClick={() => handleDeleteType(type)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition"
                              title="حذف النوع"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ADD / EDIT MODAL */}
      {(showAddModal || editingType) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                <Tags className="w-5 h-5 text-emerald-700" />
                <span>{editingType ? `تعديل نوع: ${editingType.nameAr}` : 'إضافة نوع غرفة أو شقة جديد'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingType(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveType} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  اسم نوع الغرفة أو الشقة بالعربية <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: شقة غرفتين وصالة، جناح ملكي، غرفة مفردة ديلوكس..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الاسم بالإنجليزية (اختياري):</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="2-Bedroom Apartment, Royal Suite..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الرمز المختصر (Code):</label>
                  <input
                    type="text"
                    value={code}
                    disabled={!!editingType}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="تلقائي أو أدخل كود مثل: APT-2B"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono uppercase"
                  />
                  {editingType && <span className="text-[10px] text-slate-400">الرمز مقفل لحماية العلاقات</span>}
                </div>
              </div>

              {/* Price & Occupancy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-emerald-950 font-black mb-1">
                    سعر الليلة الواحدة (ر.س) <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="450"
                      className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 font-black text-sm text-emerald-900 pl-12"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-700">ر.س / ليلة</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 mt-0.5 block">
                    يتم تطبيقه آلياً على الحجوزات الجديدة
                  </span>
                </div>

                <div>
                  <label className="block text-emerald-950 font-black mb-1">السعة (عدد الأشخاص):</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={maxOccupancy}
                    onChange={(e) => setMaxOccupancy(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع وعدد الأسرّة:</label>
                <input
                  type="text"
                  value={bedType}
                  onChange={(e) => setBedType(e.target.value)}
                  placeholder="مثال: سرير كينغ مزدوج، سريران مفردان، سرير ماستر + سريران للأطفال..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الوصف والمميزات:</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مساحة فسيحة، صالة جلوس مستقلة، مطبخ تحضيري مجهز، إطلالة مدينة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeTypeCheckbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="activeTypeCheckbox" className="font-bold text-slate-800 cursor-pointer">
                  تفعيل النوع فوراً والسماح بإسناده للغرف والحجوزات
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingType(null);
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition"
                >
                  {saving ? 'جاري الحفظ...' : editingType ? 'حفظ التعديلات' : 'حفظ النوع الجديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

