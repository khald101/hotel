'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  BedDouble,
  Plus,
  Layers,
  Upload,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Wrench,
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  Tags,
} from 'lucide-react';
import Link from 'next/link';

export default function RoomsPage() {
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ floors: [], roomTypes: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  // Single Room Form State
  const [singleForm, setSingleForm] = useState({
    roomNumber: '',
    floorId: '',
    roomTypeId: '',
    features: 'إطلالة مدينة, غير مدخنين',
    notes: '',
  });

  // Bulk Rooms Form State
  const [bulkForm, setBulkForm] = useState({
    floorId: '',
    roomTypeId: '',
    startNumber: '201',
    count: '30',
    prefix: '',
  });
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<any>(null);

  // Import State
  const [csvContent, setCsvContent] = useState('');
  const [importReport, setImportReport] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      let url = '/api/rooms?';
      if (selectedFloor) url += `floorId=${selectedFloor}&`;
      if (selectedStatus) url += `occupancyStatus=${selectedStatus}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setRooms(json.data);
        setMeta(json.meta);

        // Pre-fill default form selects
        if (json.meta.floors?.length > 0 && !singleForm.floorId) {
          setSingleForm((prev) => ({
            ...prev,
            floorId: json.meta.floors[0].id,
            roomTypeId: json.meta.roomTypes[0]?.id || '',
          }));
          setBulkForm((prev) => ({
            ...prev,
            floorId: json.meta.floors[0].id,
            roomTypeId: json.meta.roomTypes[0]?.id || '',
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [selectedFloor, selectedStatus]);

  // Handle Single Room Create
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      setShowSingleModal(false);
      setSingleForm({ ...singleForm, roomNumber: '', notes: '' });
      loadRooms();
    } catch {
      alert('فشل حفظ الغرفة');
    }
  };

  // Handle Bulk Preview
  const handleBulkPreview = async () => {
    setBulkLoading(true);
    setBulkMessage(null);
    try {
      const res = await fetch('/api/rooms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bulkForm, action: 'preview' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkMessage({ type: 'error', text: data.error });
      } else {
        setBulkPreview(data.preview);
      }
    } catch {
      setBulkMessage({ type: 'error', text: 'فشل فحص التعارضات' });
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle Bulk Commit
  const handleBulkCommit = async () => {
    setBulkLoading(true);
    setBulkMessage(null);
    try {
      const res = await fetch('/api/rooms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bulkForm, action: 'commit' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkMessage({ type: 'error', text: data.error });
      } else {
        setBulkMessage({ type: 'success', text: data.message });
        setBulkPreview(null);
        setTimeout(() => {
          setShowBulkModal(false);
          loadRooms();
        }, 1200);
      }
    } catch {
      setBulkMessage({ type: 'error', text: 'فشل تنفيذ الحفظ الجماعي' });
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle CSV Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportLoading(true);
    try {
      const res = await fetch('/api/rooms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
      } else {
        setImportReport(data.summary);
        loadRooms();
      }
    } catch {
      alert('فشل استيراد الملف');
    } finally {
      setImportLoading(false);
    }
  };

  // Quick Room Status Update
  const handleQuickStatusChange = async (roomId: string, updates: any) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roomId, ...updates }),
      });
      if (res.ok) {
        setSelectedRoom(null);
        loadRooms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper badge color
  const getStatusBadge = (room: any) => {
    if (room.maintenanceStatus === 'UNDER_MAINTENANCE' || room.saleStatus === 'OUT_OF_ORDER') {
      return { label: 'صيانة', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
    }
    if (room.occupancyStatus === 'OCCUPIED') {
      return { label: 'مشغولة', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
    }
    if (room.cleaningStatus === 'PENDING_CLEANING') {
      return { label: 'تحتاج تنظيف', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (room.cleaningStatus === 'CLEANING_IN_PROGRESS') {
      return { label: 'جارٍ التنظيف', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (room.cleaningStatus === 'PENDING_INSPECTION') {
      return { label: 'بانتظار التفتيش', bg: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
    }
    if (room.cleaningStatus === 'INSPECTED_PASSED' && room.occupancyStatus === 'VACANT') {
      return { label: 'جاهزة للتسكين', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    return { label: 'شاغرة', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full">
          {/* Top Bar Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <BedDouble className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>إدارة وخريطة الغرف (160 غرفة)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تصفح حالة الغرف، الفحص المباشر، الإضافة الفردية والجماعية بالمعاينة، والاستيراد/التصدير
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                onClick={() => setShowSingleModal(true)}
                className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة غرفة</span>
              </button>

              <button
                onClick={() => {
                  setShowBulkModal(true);
                  setBulkPreview(null);
                  setBulkMessage(null);
                }}
                className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span>إضافة عدة غرف (جماعي)</span>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="flex-1 sm:flex-initial px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-300"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استيراد CSV</span>
              </button>

              <a
                href="/api/rooms/export"
                download
                className="flex-1 sm:flex-initial px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-300"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير CSV</span>
              </a>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="ابحث برقم الغرفة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadRooms()}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 pl-8 focus:outline-none focus:border-emerald-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>

            {/* Floor Filter */}
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">جميع الطوابق</option>
              {meta.floors?.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.nameAr} (طابق {f.floorNumber})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">جميع الحالات</option>
              <option value="VACANT">شاغرة</option>
              <option value="OCCUPIED">مشغولة</option>
              <option value="RESERVED">محجوزة</option>
            </select>

            <button
              onClick={() => {
                setSearch('');
                setSelectedFloor('');
                setSelectedStatus('');
                loadRooms();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
              title="إعادة تعيين الفلاتر"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Rooms Grid / Matrix */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">جاري تحميل الغرف...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">لا توجد غرف تطابق معايير البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {rooms.map((room) => {
                const status = getStatusBadge(room);
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className="luxury-card p-3 rounded-xl cursor-pointer hover:scale-[1.02] transition border-slate-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base font-black text-slate-900 tracking-tight">#{room.roomNumber}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {room.roomType?.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{room.roomType?.nameAr}</p>
                      <p className="text-[10px] text-slate-400">
                        طابق #{room.floor?.floorNumber} • {room.floor?.nameAr}
                      </p>
                    </div>

                    <div className="mt-3">
                      <span className={`block text-center text-[10px] font-bold py-1 px-1.5 rounded-md border ${status.bg}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* SINGLE ROOM CREATION MODAL */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">إضافة غرفة جديدة</h3>
              <button onClick={() => setShowSingleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(!meta.floors || meta.floors.length === 0) ? (
              <div className="my-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  لا توجد طوابق مضافة لهذا الفندق. يرجى إضافة طابق أولاً من قسم إدارة الطوابق.
                </p>
                <Link
                  href="/floors"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  <Layers className="w-4 h-4" />
                  <span>الانتقال إلى قسم إدارة الطوابق</span>
                </Link>
              </div>
            ) : (!meta.roomTypes || meta.roomTypes.length === 0) ? (
              <div className="my-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  لا توجد أنواع غرف أو شقق مسجلة وفعالة. يرجى إضافة وتفعيل نوع أولاً لتحديد سعر الليلة وسعة النزلاء قبل إضافة الغرف.
                </p>
                <Link
                  href="/room-types"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  <Tags className="w-4 h-4" />
                  <span>الانتقال إلى قسم أنواع الغرف والشقق</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSingleSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الغرفة (فريد داخل الفندق) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 201"
                    value={singleForm.roomNumber}
                    onChange={(e) => setSingleForm({ ...singleForm, roomNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الطابق <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={singleForm.floorId}
                    onChange={(e) => setSingleForm({ ...singleForm, floorId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  >
                    {meta.floors?.map((f: any) => (
                      <option key={f.id} value={f.id} disabled={!f.active}>
                        {f.nameAr} (طابق {f.floorNumber}) {!f.active ? '— [معطل]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع الغرفة أو الشقة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={singleForm.roomTypeId}
                    onChange={(e) => setSingleForm({ ...singleForm, roomTypeId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                    required
                  >
                    {meta.roomTypes?.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.nameAr} ({t.basePrice} ر.س / ليلة)
                      </option>
                    ))}
                  </select>

                  {/* Real-time Dynamic Price & Capacity Badge */}
                  {(() => {
                    const selected = meta.roomTypes?.find((t: any) => t.id === singleForm.roomTypeId) || meta.roomTypes?.[0];
                    if (!selected) return null;
                    return (
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-between text-xs text-emerald-900">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>سعر الليلة المعتمد:</span>
                          <span className="font-black text-emerald-700 text-sm">{selected.basePrice} ر.س</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          سعة {selected.maxOccupancy} أفراد • {selected.bedType || 'سرير مزدوج'}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المزايا والإطلالة</label>
                  <input
                    type="text"
                    value={singleForm.features}
                    onChange={(e) => setSingleForm({ ...singleForm, features: e.target.value })}
                    placeholder="إطلالة مدينة, غير مدخنين..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSingleModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-700 rounded-xl shadow-md"
                  >
                    حفظ الغرفة
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BULK ROOM CREATION MODAL WITH LIVE PREVIEW & COLLISION CHECK */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">إضافة عدة غرف دفعة واحدة (Bulk Creation)</h3>
                <p className="text-xs text-slate-500">معاينة الأرقام وفحص التعارضات آلياً قبل الحفظ الذري</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkMessage && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  bulkMessage.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{bulkMessage.text}</span>
              </div>
            )}

            {(!meta.floors || meta.floors.length === 0) ? (
              <div className="my-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  لا توجد طوابق مضافة لهذا الفندق. يرجى إضافة طابق أولاً من قسم إدارة الطوابق.
                </p>
                <Link
                  href="/floors"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  <Layers className="w-4 h-4" />
                  <span>الانتقال إلى قسم إدارة الطوابق</span>
                </Link>
              </div>
            ) : (!meta.roomTypes || meta.roomTypes.length === 0) ? (
              <div className="my-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  لا توجد أنواع غرف أو شقق مسجلة وفعالة. يرجى إضافة وتفعيل نوع أولاً لتحديد سعر الليلة وسعة النزلاء قبل إضافة الغرف.
                </p>
                <Link
                  href="/room-types"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  <Tags className="w-4 h-4" />
                  <span>الانتقال إلى قسم أنواع الغرف والشقق</span>
                </Link>
              </div>
            ) : (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الطابق المستهدف <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bulkForm.floorId}
                  onChange={(e) => setBulkForm({ ...bulkForm, floorId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  {meta.floors?.map((f: any) => (
                    <option key={f.id} value={f.id} disabled={!f.active}>
                      {f.nameAr} (طابق {f.floorNumber}) {!f.active ? '— [معطل]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع الغرفة أو الشقة الموحد <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bulkForm.roomTypeId}
                  onChange={(e) => setBulkForm({ ...bulkForm, roomTypeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                >
                  {meta.roomTypes?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.nameAr} ({t.basePrice} ر.س / ليلة)
                    </option>
                  ))}
                </select>

                {/* Real-time Dynamic Price & Capacity Badge for Bulk */}
                {(() => {
                  const selected = meta.roomTypes?.find((t: any) => t.id === bulkForm.roomTypeId) || meta.roomTypes?.[0];
                  if (!selected) return null;
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>سعر الليلة المعتمد:</span>
                        <span className="font-black text-emerald-700 text-sm">{selected.basePrice} ر.س</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        سعة {selected.maxOccupancy} أفراد • {selected.bedType || 'سرير مزدوج'}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم البداية</label>
                  <input
                    type="number"
                    value={bulkForm.startNumber}
                    onChange={(e) => setBulkForm({ ...bulkForm, startNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد الغرف (مثال: 50)</label>
                  <input
                    type="number"
                    value={bulkForm.count}
                    onChange={(e) => setBulkForm({ ...bulkForm, count: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Action: Preview */}
              <button
                type="button"
                onClick={handleBulkPreview}
                disabled={bulkLoading}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center justify-center gap-1.5"
              >
                {bulkLoading ? 'جاري الفحص...' : 'فحص التعارضات ومعاينة الغرف'}
              </button>

              {/* Preview Results */}
              {bulkPreview && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>عدد الغرف المقرر إنشاؤها: {bulkPreview.totalToCreate}</span>
                    {bulkPreview.hasConflicts ? (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        يوجد {bulkPreview.conflicts.length} رقم مكرر مسجل مسبقاً!
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        جميع الأرقام خالية ولا يوجد أي تعارض
                      </span>
                    )}
                  </div>

                  <div className="max-h-36 overflow-y-auto border border-slate-200 bg-white p-2 rounded-lg text-[11px] font-mono flex flex-wrap gap-1.5">
                    {bulkPreview.generatedNumbers.map((num: string) => {
                      const isConflict = bulkPreview.conflicts.includes(num);
                      return (
                        <span
                          key={num}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isConflict ? 'bg-rose-100 text-rose-800 border border-rose-300 line-through' : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>

                  {!bulkPreview.hasConflicts ? (
                    <button
                      type="button"
                      onClick={handleBulkCommit}
                      disabled={bulkLoading}
                      className="w-full mt-3 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      {bulkLoading ? 'جاري الإنشاء...' : 'تأكيد وحفظ مجموعة الغرف الآن'}
                    </button>
                  ) : (
                    <p className="text-[11px] text-rose-600 text-center font-bold mt-2">
                      تم منع الحفظ لوجود أرقام متعارضة. يرجى تغيير رقم البداية.
                    </p>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">استيراد الغرف من ملف CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 mt-4">
              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                الصيغة المطلوبة: RoomNumber,FloorNumber,RoomTypeCode,Features
                <br />
                مثال: 601,1,SGL,إطلالة مدينة
              </div>

              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="الصق أسطر CSV هنا..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
              />

              {importReport && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <p className="font-bold text-emerald-700">تم استيراد {importReport.importedCount} صف بنجاح.</p>
                  {importReport.rejectedCount > 0 && (
                    <p className="font-bold text-rose-700 mt-1">تم رفض {importReport.rejectedCount} صف بسبب أخطاء أو تكرار.</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  disabled={importLoading}
                  className="px-4 py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow"
                >
                  {importLoading ? 'جاري المعالجة...' : 'بدء الاستيراد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOM DETAIL & QUICK ACTIONS MODAL */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-lg text-slate-800">تفاصيل الغرفة #{selectedRoom.roomNumber}</h3>
                <p className="text-xs text-slate-500">
                  {selectedRoom.roomType?.nameAr} • طابق {selectedRoom.floor?.floorNumber}
                </p>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">سعر الليلة المعتمد:</span>
                <span className="font-black text-emerald-700">{selectedRoom.roomType?.basePrice || 0} ر.س</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">حالة الإشغال:</span>
                <span className="font-bold text-slate-800">{selectedRoom.occupancyStatus}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">حالة النظافة:</span>
                <span className="font-bold text-slate-800">{selectedRoom.cleaningStatus}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">حالة الصيانة:</span>
                <span className="font-bold text-slate-800">{selectedRoom.maintenanceStatus}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">حالة البيع:</span>
                <span className="font-bold text-slate-800">{selectedRoom.saleStatus}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">المزايا:</span>
                <span className="font-bold text-slate-800">{selectedRoom.features}</span>
              </div>
            </div>

            {/* Quick Status Toggles */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold text-slate-400">إجراءات تشغيلية سريعة:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    handleQuickStatusChange(selectedRoom.id, {
                      cleaningStatus: 'INSPECTED_PASSED',
                    })
                  }
                  className="p-2 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition"
                >
                  اعتماد جاهزية النظافة
                </button>
                <button
                  onClick={() =>
                    handleQuickStatusChange(selectedRoom.id, {
                      cleaningStatus: 'PENDING_CLEANING',
                    })
                  }
                  className="p-2 text-xs font-bold text-amber-800 bg-amber-50 rounded-lg hover:bg-amber-100 transition"
                >
                  تحويل لـ (تحتاج تنظيف)
                </button>
                <button
                  onClick={() =>
                    handleQuickStatusChange(selectedRoom.id, {
                      maintenanceStatus: 'UNDER_MAINTENANCE',
                      saleStatus: 'OUT_OF_ORDER',
                    })
                  }
                  className="p-2 text-xs font-bold text-rose-800 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
                >
                  إيقاف للصيانة
                </button>
                <button
                  onClick={() =>
                    handleQuickStatusChange(selectedRoom.id, {
                      maintenanceStatus: 'OPERATIONAL',
                      saleStatus: 'AVAILABLE',
                    })
                  }
                  className="p-2 text-xs font-bold text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  إعادة للخدمة والتشغيل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

