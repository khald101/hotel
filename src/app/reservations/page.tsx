'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  CalendarCheck2,
  Plus,
  Search,
  Filter,
  Users,
  BedDouble,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  X,
  CreditCard,
  FileText,
  Sparkles,
  Globe,
  RefreshCw,
  Sliders,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function ReservationsPage() {
  const [user, setUser] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [formError, setFormError] = useState('');

  // Dynamic Pricing Rules State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [newRuleForm, setNewRuleForm] = useState({
    nameAr: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
    priceType: 'MULTIPLIER',
    value: '1.20',
    minNights: 1,
  });

  // Channel Manager State
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelData, setChannelData] = useState<any>({ channels: [], recentLogs: [] });
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelMessage, setChannelMessage] = useState('');

  // Form State
  const [form, setForm] = useState({
    fullNameAr: '',
    nationalId: '',
    idType: 'NATIONAL_ID',
    phone: '',
    nationality: 'SA',
    roomTypeId: '',
    assignedRoomId: '',
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    adultsCount: 1,
    childrenCount: 0,
    source: 'DIRECT',
    specialRequests: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      const [resData, roomsData, rulesData] = await Promise.all([
        fetch('/api/reservations').then((r) => r.json()),
        fetch('/api/rooms').then((r) => r.json()),
        fetch('/api/pricing/rules').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (resData.success) setReservations(resData.data);
      if (roomsData.success) {
        setRooms(roomsData.data);
        setRoomTypes(roomsData.meta?.roomTypes || []);
        if (roomsData.meta?.roomTypes?.length > 0 && !form.roomTypeId) {
          setForm((prev) => ({ ...prev, roomTypeId: roomsData.meta.roomTypes[0].id }));
        }
      }
      if (rulesData.success) setPricingRules(rulesData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadChannelData = async () => {
    try {
      const res = await fetch('/api/channels/sync');
      if (res.ok) {
        const data = await res.json();
        setChannelData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncAllChannels = async () => {
    setChannelLoading(true);
    setChannelMessage('');
    try {
      const res = await fetch('/api/channels/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_ALL' }),
      });
      const data = await res.json();
      if (res.ok) {
        setChannelMessage(data.message);
        loadChannelData();
      }
    } catch {
      setChannelMessage('فشلت المزامنة مع القنوات');
    } finally {
      setChannelLoading(false);
    }
  };

  const handleImportOtaBooking = async (channel: string) => {
    setChannelLoading(true);
    setChannelMessage('');
    try {
      const res = await fetch('/api/channels/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'IMPORT_OTA_BOOKING', channelName: channel }),
      });
      const data = await res.json();
      if (res.ok) {
        setChannelMessage(data.message);
        loadData();
        loadChannelData();
      }
    } catch {
      setChannelMessage('فشل استيراد الحجز');
    } finally {
      setChannelLoading(false);
    }
  };

  const handleCreatePricingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pricing/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRuleForm),
      });
      if (res.ok) {
        setNewRuleForm({
          nameAr: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
          priceType: 'MULTIPLIER',
          value: '1.20',
          minNights: 1,
        });
        const rulesRes = await fetch('/api/pricing/rules').then((r) => r.json());
        if (rulesRes.success) setPricingRules(rulesRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePricingRule = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/pricing/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive }),
      });
      if (res.ok) {
        const rulesRes = await fetch('/api/pricing/rules').then((r) => r.json());
        if (rulesRes.success) setPricingRules(rulesRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestData: {
            fullNameAr: form.fullNameAr,
            nationalId: form.nationalId,
            idType: form.idType,
            phone: form.phone,
            nationality: form.nationality,
          },
          roomTypeId: form.roomTypeId,
          assignedRoomId: form.assignedRoomId || null,
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
          adultsCount: form.adultsCount,
          childrenCount: form.childrenCount,
          source: form.source,
          specialRequests: form.specialRequests,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error);
        return;
      }

      setShowNewModal(false);
      setForm({
        fullNameAr: '',
        nationalId: '',
        idType: 'NATIONAL_ID',
        phone: '',
        nationality: 'SA',
        roomTypeId: roomTypes[0]?.id || '',
        assignedRoomId: '',
        checkInDate: new Date().toISOString().split('T')[0],
        checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        adultsCount: 1,
        childrenCount: 0,
        source: 'DIRECT',
        specialRequests: '',
      });
      loadData();
    } catch {
      setFormError('فشل إنشاء الحجز');
    }
  };

  const handleCancelReservation = async (id: string) => {
    const reason = prompt('يرجى إدخال سبب إلغاء الحجز:');
    if (!reason) return;
    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'CANCELLED', cancellationReason: reason }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter
  const filtered = reservations.filter((r) => {
    const matchSearch =
      r.confirmationNo?.toLowerCase().includes(search.toLowerCase()) ||
      r.guest?.fullNameAr?.includes(search) ||
      r.guest?.phone?.includes(search);
    const matchStatus = statusFilter ? r.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full">
          {/* Header */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>إدارة الحجوزات ومحرك الأسعار (Reservations & Pricing)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تسجيل الحجوزات مع منع التضارب المزدوج، محرك التسعير الديناميكي للمواسم، والمزامنة مع قنوات OTA
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Dynamic Pricing Button */}
              <button
                onClick={() => setShowPricingModal(true)}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>محرك أسعار المواسم</span>
                {pricingRules.filter((r) => r.active).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>

              {/* Channel Manager Button */}
              <button
                onClick={() => {
                  setShowChannelModal(true);
                  loadChannelData();
                }}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <Globe className="w-4 h-4 text-blue-600" />
                <span>قنوات الحجز (OTAs)</span>
              </button>

              {/* New Reservation Button */}
              <button
                onClick={() => {
                  setShowNewModal(true);
                  setFormError('');
                }}
                className="px-4 py-2 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء حجز جديد</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <input
                type="text"
                placeholder="ابحث برقم الحجز أو اسم النزيل أو الجوال..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 pl-8 focus:outline-none focus:border-emerald-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
              >
                <option value="">جميع الحالات</option>
                <option value="CONFIRMED">مؤكد</option>
                <option value="CHECKED_IN">تم تسجيل الدخول</option>
                <option value="CHECKED_OUT">تم تسجيل المغادرة</option>
                <option value="CANCELLED">ملغى</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">جاري جلب الحجوزات...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm font-bold">لا توجد حجوزات مطابقة</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[850px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">رقم التأكيد والمصدر</th>
                      <th className="py-3 px-4">بيانات النزيل</th>
                      <th className="py-3 px-4">نوع الغرفة</th>
                      <th className="py-3 px-4">الغرفة المخصصة</th>
                      <th className="py-3 px-4">فترة الإقامة</th>
                      <th className="py-3 px-4">المبلغ والتعرفة</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono">
                          <p className="font-bold text-slate-900">{res.confirmationNo}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                res.source === 'BOOKING_COM'
                                  ? 'bg-blue-100 text-blue-800'
                                  : res.source === 'EXPEDIA'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {res.source === 'BOOKING_COM'
                                ? 'Booking.com'
                                : res.source === 'EXPEDIA'
                                ? 'Expedia'
                                : 'مباشر (فندق)'}
                            </span>
                            {res.channelRef && (
                              <span className="text-[9px] text-slate-400 font-mono">({res.channelRef})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{res.guest?.fullNameAr}</p>
                          <p className="text-[10px] text-slate-400">{res.guest?.phone}</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{res.roomType?.nameAr}</td>
                        <td className="py-3.5 px-4">
                          {res.assignedRoom ? (
                            <span className="font-black px-2 py-0.5 rounded bg-slate-100 text-slate-900">
                              #{res.assignedRoom.roomNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">تلقائي عند الوصول</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {res.checkInDate} ⭠ {res.checkOutDate} ({res.nightsCount} ليالٍ)
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-black text-slate-900">{res.totalAmount.toLocaleString()} ر.س</p>
                          {res.pricingRuleName && (
                            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium mt-0.5">
                              ✨ {res.pricingRuleName}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              res.status === 'CHECKED_IN'
                                ? 'bg-purple-100 text-purple-800'
                                : res.status === 'CHECKED_OUT'
                                ? 'bg-slate-100 text-slate-600'
                                : res.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {res.status === 'CHECKED_IN'
                              ? 'مسجل وصول'
                              : res.status === 'CHECKED_OUT'
                              ? 'مغادر'
                              : res.status === 'CANCELLED'
                              ? 'ملغى'
                              : 'مؤكد'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href="/billing"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 bg-slate-50 rounded-lg hover:bg-slate-100"
                              title="عرض الفاتورة وحساب النزيل"
                            >
                              <FileText className="w-4 h-4" />
                            </Link>

                            {res.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleCancelReservation(res.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                title="إلغاء الحجز"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
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

      {/* Dynamic Seasonal Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span>محرك الأسعار الديناميكي وإدارة المواسم</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يتم تطبيق الأسعار الموسمية تلقائياً عند إنشاء أي حجز يقع ضمن تواريخ الموسم
                </p>
              </div>
              <button onClick={() => setShowPricingModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Rules List */}
            <div className="mb-6 space-y-2">
              <h4 className="text-xs font-bold text-slate-700">قواعد التسعير المسجلة في الفندق:</h4>
              {pricingRules.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">لا توجد قواعد تسعير مسجلة</p>
              ) : (
                <div className="space-y-2">
                  {pricingRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        rule.active ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{rule.nameAr}</span>
                          <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800">
                            {rule.priceType === 'MULTIPLIER' ? `مضاعف ×${rule.value}` : `سعر ثابت ${rule.value} ر.س`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          الفترة: {rule.startDate} إلى {rule.endDate} (الحد الأدنى: {rule.minNights} ليلة)
                        </p>
                      </div>

                      <button
                        onClick={() => handleTogglePricingRule(rule.id, rule.active)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          rule.active
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {rule.active ? 'مفعل ✅' : 'معطل ⏸️'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Pricing Rule Form */}
            <form onSubmit={handleCreatePricingRule} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>إضافة موسم أو عرض تسعيري جديد:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم الموسم / العرض:</label>
                  <input
                    type="text"
                    required
                    value={newRuleForm.nameAr}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, nameAr: e.target.value })}
                    placeholder="موسم الفعاليات، عرض الشتاء..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع المعاملة والقيمة:</label>
                  <div className="flex gap-2">
                    <select
                      value={newRuleForm.priceType}
                      onChange={(e) => setNewRuleForm({ ...newRuleForm, priceType: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="MULTIPLIER">نسبة مضاعفة (×)</option>
                      <option value="FIXED_PRICE">سعر ثابت للغرفة</option>
                    </select>
                    <input
                      type="number"
                      step="0.05"
                      required
                      value={newRuleForm.value}
                      onChange={(e) => setNewRuleForm({ ...newRuleForm, value: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ بداية الموسم:</label>
                  <input
                    type="date"
                    required
                    value={newRuleForm.startDate}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, startDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ نهاية الموسم:</label>
                  <input
                    type="date"
                    required
                    value={newRuleForm.endDate}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, endDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
              >
                حفظ وتفعيل قاعدة التسعير
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Channel Manager Sync Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span>محرك الربط والمزامنة مع قنوات الحجز (Channel Manager)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  مزامنة لحظية للأسعار وتوافر الغرف الـ 160 مع Booking.com و Expedia و Agoda
                </p>
              </div>
              <button onClick={() => setShowChannelModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {channelMessage && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{channelMessage}</span>
              </div>
            )}

            {/* Channels Status Grid */}
            <div className="space-y-2.5 mb-5">
              {(channelData.channels || []).map((ch: any) => (
                <div key={ch.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-black flex items-center justify-center text-[10px]">
                      OTA
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{ch.name}</h4>
                      <p className="text-[10px] text-slate-500">حالة الربط: نشط ومتزامن ({ch.syncedRooms} غرفة)</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleImportOtaBooking(ch.code)}
                    disabled={channelLoading}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition"
                  >
                    استيراد حجز تجريبي
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={handleSyncAllChannels}
                disabled={channelLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
              >
                <RefreshCw className={`w-4 h-4 ${channelLoading ? 'animate-spin' : ''}`} />
                <span>مزامنة فورية شاملة لكل الغرف والأسعار</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Reservation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-emerald-700" />
                <span>تسجيل حجز فندقي جديد</span>
              </h3>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-700">1. بيانات النزيل (مطابقة لنظام شموس):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">الاسم الكامل (عربي):</label>
                    <input
                      type="text"
                      required
                      value={form.fullNameAr}
                      onChange={(e) => setForm({ ...form, fullNameAr: e.target.value })}
                      placeholder="عبدالله محمد القحطاني"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">نوع ورقم الهوية:</label>
                    <div className="flex gap-2">
                      <select
                        value={form.idType}
                        onChange={(e) => setForm({ ...form, idType: e.target.value })}
                        className="bg-white border border-slate-200 rounded-lg p-2 text-xs"
                      >
                        <option value="NATIONAL_ID">هوية وطنية</option>
                        <option value="IQAMA">إقامة</option>
                        <option value="PASSPORT">جواز سفر</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={form.nationalId}
                        onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                        placeholder="1098765432"
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">رقم الجوال:</label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0501234567"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">مصدر الحجز:</label>
                    <select
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2"
                    >
                      <option value="DIRECT">مباشر (الفندق)</option>
                      <option value="PHONE">هاتفي</option>
                      <option value="BOOKING_COM">Booking.com</option>
                      <option value="EXPEDIA">Expedia</option>
                      <option value="CORPORATE">شركات</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-700">2. تفاصيل الإقامة والغرفة:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">تاريخ الوصول:</label>
                    <input
                      type="date"
                      required
                      value={form.checkInDate}
                      onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">تاريخ المغادرة:</label>
                    <input
                      type="date"
                      required
                      value={form.checkOutDate}
                      onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">نوع الغرفة أو الشقة:</label>
                    <select
                      value={form.roomTypeId}
                      onChange={(e) => setForm({ ...form, roomTypeId: e.target.value, assignedRoomId: '' })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                    >
                      {roomTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.nameAr} - {rt.basePrice} ر.س / ليلة
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">عدد النزلاء:</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={form.adultsCount}
                        onChange={(e) => setForm({ ...form, adultsCount: parseInt(e.target.value, 10) })}
                        placeholder="بالغين"
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-2"
                      />
                      <input
                        type="number"
                        min="0"
                        value={form.childrenCount}
                        onChange={(e) => setForm({ ...form, childrenCount: parseInt(e.target.value, 10) })}
                        placeholder="أطفال"
                        className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-2"
                      />
                    </div>
                  </div>

                  {/* Dynamic price breakdown */}
                  {(() => {
                    const selType = roomTypes.find((t) => t.id === form.roomTypeId) || roomTypes[0];
                    if (!selType) return null;
                    const cIn = new Date(form.checkInDate);
                    const cOut = new Date(form.checkOutDate);
                    const diffDays = Math.max(1, Math.ceil((cOut.getTime() - cIn.getTime()) / (1000 * 60 * 60 * 24)));
                    const subtotal = selType.basePrice * diffDays;
                    const vat = Number((subtotal * 0.15).toFixed(2));
                    const total = subtotal + vat;
                    return (
                      <div className="col-span-1 sm:col-span-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between text-xs text-emerald-950">
                        <div>
                          <span className="font-bold">سعر الليلة: </span>
                          <span className="font-black text-emerald-700">{selType.basePrice} ر.س</span>
                          <span className="mx-2 text-slate-400">|</span>
                          <span>المدة: </span>
                          <span className="font-bold">{diffDays} {diffDays === 1 ? 'ليلة' : 'ليالٍ'}</span>
                        </div>
                        <div className="font-extrabold text-sm text-emerald-800">
                          الإجمالي التقديري: {total} ر.س <span className="text-[10px] text-emerald-600 font-normal">(شامل 15% ضريبة)</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    تخصيص غرفة محددة مسبقاً (فقط الغرف الفاضية والجاهزة والمفتشة):
                  </label>
                  <select
                    value={form.assignedRoomId}
                    onChange={(e) => setForm({ ...form, assignedRoomId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                  >
                    <option value="">تخصيص تلقائي لاحقاً (عند الوصول)</option>
                    {rooms.filter(
                      (r) =>
                        r.roomTypeId === form.roomTypeId &&
                        r.occupancyStatus === 'VACANT' &&
                        r.cleaningStatus === 'INSPECTED_PASSED' &&
                        r.maintenanceStatus === 'OPERATIONAL' &&
                        r.saleStatus === 'AVAILABLE'
                    ).length === 0 ? (
                      <option value="" disabled>
                        ⚠️ لا توجد غرف فاضية وجاهزة ومفتشة حالياً من هذا النوع
                      </option>
                    ) : (
                      rooms
                        .filter(
                          (r) =>
                            r.roomTypeId === form.roomTypeId &&
                            r.occupancyStatus === 'VACANT' &&
                            r.cleaningStatus === 'INSPECTED_PASSED' &&
                            r.maintenanceStatus === 'OPERATIONAL' &&
                            r.saleStatus === 'AVAILABLE'
                        )
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            غرفة #{r.roomNumber} (طابق {r.floor?.floorNumber}) - شاغرة وجاهزة ومفتشة للتسكين ✅
                          </option>
                        ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الطلبات الخاصة والملاحظات:</label>
                  <input
                    type="text"
                    value={form.specialRequests}
                    onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                    placeholder="طابق علوي، سرير إضافي..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  تأكيد وإنشاء الحجز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
