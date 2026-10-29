'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  ConciergeBell,
  LogIn,
  LogOut,
  UserCheck,
  BedDouble,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  X,
  CreditCard,
  Key,
} from 'lucide-react';

export default function FrontDeskPage() {
  const [user, setUser] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'arrivals' | 'inhouse' | 'departures'>('arrivals');
  const [search, setSearch] = useState('');

  // Checkin Modal
  const [selectedResForCheckin, setSelectedResForCheckin] = useState<any>(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [keyCard, setKeyCard] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [checkinError, setCheckinError] = useState('');
  const [isChangingRoom, setIsChangingRoom] = useState(false);

  // Checkout Modal
  const [selectedResForCheckout, setSelectedResForCheckout] = useState<any>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [forceCheckout, setForceCheckout] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      const [resData, roomsData] = await Promise.all([
        fetch('/api/reservations').then((r) => r.json()),
        fetch('/api/rooms').then((r) => r.json()),
      ]);

      if (resData.success) setReservations(resData.data);
      if (roomsData.success) setRooms(roomsData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter lists based on tab
  const todayArrivals = reservations.filter((r) => r.status === 'CONFIRMED' || r.status === 'ARRIVED');
  const inHouseGuests = reservations.filter((r) => r.status === 'CHECKED_IN');
  const todayDepartures = reservations.filter((r) => r.status === 'CHECKED_IN');

  const currentList =
    activeTab === 'arrivals' ? todayArrivals : activeTab === 'inhouse' ? inHouseGuests : todayDepartures;

  const filteredList = currentList.filter(
    (r) =>
      r.confirmationNo?.toLowerCase().includes(search.toLowerCase()) ||
      r.guest?.fullNameAr?.includes(search) ||
      r.guest?.nationalId?.includes(search) ||
      r.assignedRoom?.roomNumber?.includes(search)
  );

  // Ready rooms for checkin assignment
  const readyRooms = rooms.filter(
    (r) =>
      r.occupancyStatus === 'VACANT' &&
      r.cleaningStatus === 'INSPECTED_PASSED' &&
      r.maintenanceStatus === 'OPERATIONAL' &&
      r.saleStatus === 'AVAILABLE'
  );

  // Handle Check-in
  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinError('');
    const targetRoomId =
      selectedRoomId ||
      selectedResForCheckin.assignedRoomId ||
      selectedResForCheckin.assignedRoom?.id ||
      rooms.find(
        (r) =>
          r.roomTypeId === selectedResForCheckin.roomTypeId &&
          r.occupancyStatus === 'VACANT' &&
          r.cleaningStatus === 'INSPECTED_PASSED'
      )?.id;

    if (!targetRoomId) {
      setCheckinError('لم يتم العثور على غرفة أو شقة جاهزة للتسكين');
      return;
    }

    try {
      const res = await fetch('/api/frontdesk/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedResForCheckin.id,
          roomId: targetRoomId,
          keyCardNumber: keyCard,
          overrideReason: overrideReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckinError(data.error);
        return;
      }
      setSelectedResForCheckin(null);
      setOverrideReason('');
      loadData();
    } catch {
      setCheckinError('فشل تسجيل الدخول');
    }
  };

  // Handle Check-out
  const handleCheckoutSubmit = async () => {
    setCheckoutError('');
    try {
      const res = await fetch('/api/frontdesk/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedResForCheckout.id,
          forceCheckout,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error);
        return;
      }
      setSelectedResForCheckout(null);
      setForceCheckout(false);
      loadData();
    } catch {
      setCheckoutError('فشل تسجيل المغادرة');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={user?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-full">
          {/* Header Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <ConciergeBell className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>شاشة الاستقبال والعمليات المباشرة (Front Desk)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تسكين النزلاء، التحقق الصارم من جاهزية وتفتيش الغرف، تسجيل المغادرة، وتسوية الحسابات
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span>منصة شموس الأمنية: اتصال متزامن</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                {readyRooms.length} غرفة جاهزة ومفتشة للتسكين
              </span>
            </div>
          </div>

          {/* Tab Selector & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-200/60 p-1 rounded-xl overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('arrivals')}
                className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'arrivals' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>الوصولات ({todayArrivals.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('inhouse')}
                className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'inhouse' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>المقيمون ({inHouseGuests.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('departures')}
                className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'departures' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>المغادرات ({todayDepartures.length})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="ابحث برقم الحجز أو اسم النزيل أو الهوية..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 pl-8 focus:outline-none focus:border-emerald-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Reservations / Stays Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">جاري جلب السجلات...</div>
            ) : filteredList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm font-bold">لا توجد سجلات في هذا القسم</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">رقم الحجز</th>
                      <th className="py-3 px-4">اسم النزيل والهوية</th>
                      <th className="py-3 px-4">نوع الغرفة</th>
                      <th className="py-3 px-4">الغرفة المسندة</th>
                      <th className="py-3 px-4">تواريخ الإقامة</th>
                      <th className="py-3 px-4">حالة الحجز</th>
                      <th className="py-3 px-4 text-center">الإجراء التشغيلي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredList.map((res) => {
                      const isCheckin = activeTab === 'arrivals';
                      const isCheckout = activeTab === 'departures' || activeTab === 'inhouse';

                      return (
                        <tr key={res.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{res.confirmationNo}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">{res.guest?.fullNameAr}</p>
                            <p className="text-[10px] text-slate-400">
                              {res.guest?.idType}: {res.guest?.nationalId} • {res.guest?.phone}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-700">{res.roomType?.nameAr}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {res.assignedRoom ? (
                              <span className="px-2 py-0.5 rounded font-black text-slate-800 bg-slate-100">
                                #{res.assignedRoom.roomNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400">غير مخصصة</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {res.checkInDate} ⭠ {res.checkOutDate} ({res.nightsCount} ليالٍ)
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                res.status === 'CHECKED_IN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : res.status === 'CHECKED_OUT'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {res.status === 'CHECKED_IN'
                                ? 'نزيل حالي (مقيد)'
                                : res.status === 'CHECKED_OUT'
                                ? 'غادر'
                                : 'مؤكد للوصول'}
                            </span>
                            {res.status === 'CHECKED_IN' && (
                              <span className="block mt-1 font-mono text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                شموس: {res.stayRecord?.shamousRef || 'SHM-2026-AUTO'}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isCheckin && (
                              <button
                                onClick={() => {
                                  setSelectedResForCheckin(res);
                                  const targetRoom =
                                    res.assignedRoom ||
                                    rooms.find((r) => r.id === res.assignedRoomId) ||
                                    rooms.find(
                                      (r) =>
                                        r.roomTypeId === res.roomTypeId &&
                                        r.occupancyStatus === 'VACANT' &&
                                        r.cleaningStatus === 'INSPECTED_PASSED'
                                    );
                                  const targetId = targetRoom?.id || '';
                                  setSelectedRoomId(targetId);
                                  setKeyCard(`CARD-${targetRoom?.roomNumber || '101'}`);
                                  setCheckinError('');
                                  setIsChangingRoom(false);
                                }}
                                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-sm inline-flex items-center gap-1"
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>تسجيل دخول (Check-in)</span>
                              </button>
                            )}

                            {isCheckout && (
                              <button
                                onClick={() => {
                                  setSelectedResForCheckout(res);
                                  setCheckoutError('');
                                }}
                                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition shadow-sm inline-flex items-center gap-1"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>تسجيل مغادرة (Check-out)</span>
                              </button>
                            )}
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

      {/* CHECK-IN MODAL WITH STRICT ROOM READINESS VERIFICATION */}
      {selectedResForCheckin && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-800">إجراء تسجيل الوصول (Check-in)</h3>
                <p className="text-xs text-slate-500">حجز: {selectedResForCheckin.confirmationNo}</p>
              </div>
              <button onClick={() => setSelectedResForCheckin(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkinError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">تحذير أمان الجاهزية:</p>
                  <p>{checkinError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCheckinSubmit} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p>
                  <span className="text-slate-500">النزيل:</span>{' '}
                  <span className="font-bold text-slate-800">{selectedResForCheckin.guest?.fullNameAr}</span>
                </p>
                <p>
                  <span className="text-slate-500">الهوية:</span> {selectedResForCheckin.guest?.nationalId} (
                  {selectedResForCheckin.guest?.nationality})
                </p>
                <p>
                  <span className="text-slate-500">النوع المطلوب:</span> {selectedResForCheckin.roomType?.nameAr}
                </p>
              </div>

              {/* Room Assignment section */}
              {(() => {
                const bookedRoom =
                  selectedResForCheckin.assignedRoom ||
                  rooms.find((r) => r.id === selectedResForCheckin.assignedRoomId) ||
                  rooms.find(
                    (r) =>
                      r.roomTypeId === selectedResForCheckin.roomTypeId &&
                      r.occupancyStatus === 'VACANT' &&
                      r.cleaningStatus === 'INSPECTED_PASSED'
                  );

                const eligibleRooms = rooms.filter(
                  (r) =>
                    r.id === selectedResForCheckin.assignedRoomId ||
                    ((r.roomTypeId === selectedResForCheckin.roomTypeId || !selectedResForCheckin.roomTypeId) &&
                      r.occupancyStatus === 'VACANT' &&
                      r.cleaningStatus === 'INSPECTED_PASSED' &&
                      r.maintenanceStatus === 'OPERATIONAL' &&
                      r.saleStatus === 'AVAILABLE')
                );

                if (bookedRoom && !isChangingRoom) {
                  return (
                    <div className="space-y-2">
                      <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                            <span className="text-xs font-black text-emerald-950">
                              نفس الغرفة أو الشقة التي حجزها النزيل (مثبتة للتسكين تلقائياً):
                            </span>
                          </div>
                          <span className="px-3.5 py-1 bg-emerald-800 text-white font-mono font-black rounded-xl text-sm shadow-sm">
                            #{bookedRoom.roomNumber}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 font-semibold">
                          {bookedRoom.roomType?.nameAr || selectedResForCheckin.roomType?.nameAr} • طابق {bookedRoom.floor?.floorNumber} ({bookedRoom.floor?.nameAr})
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 text-[11px]">
                          <span className="text-emerald-700 font-medium">حالة النظافة والتفتيش:</span>
                          <span className="font-bold text-emerald-900">
                            {bookedRoom.cleaningStatus === 'INSPECTED_PASSED'
                              ? 'جاهزة ومفتشة ومعتمدة للتسكين الفوري ✅'
                              : `حالة النظافة: ${bookedRoom.cleaningStatus}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1 text-[11px]">
                        <span className="text-slate-500 font-bold text-emerald-800">
                          ✓ سيتم تسكين النزيل في نفس الوحدة المحجوزة (#{bookedRoom.roomNumber}) مباشرة
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsChangingRoom(true)}
                          className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                        >
                          تغيير الغرفة (ترقية / تبديل)
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {bookedRoom ? 'اختر غرفة بديلة للتسكين:' : 'تخصيص الغرفة للتسكين (الغرف الشاغرة والجاهزة):'}
                      </label>
                      {bookedRoom && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingRoom(false);
                            setSelectedRoomId(bookedRoom.id);
                            setKeyCard(`CARD-${bookedRoom.roomNumber}`);
                          }}
                          className="text-[11px] text-emerald-700 font-bold underline"
                        >
                          العودة للغرفة المحجوزة (#{bookedRoom.roomNumber})
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => {
                        setSelectedRoomId(e.target.value);
                        const r = rooms.find((rm) => rm.id === e.target.value);
                        if (r) setKeyCard(`CARD-${r.roomNumber}`);
                      }}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                    >
                      <option value="">اختر الغرفة للتسكين...</option>
                      {eligibleRooms.length === 0 ? (
                        <option value="" disabled>
                          ⚠️ لا توجد غرف فاضية وجاهزة حالياً للتسكين
                        </option>
                      ) : (
                        eligibleRooms.map((r) => {
                          const isBooked = r.id === selectedResForCheckin.assignedRoomId;
                          return (
                            <option key={r.id} value={r.id}>
                              غرفة #{r.roomNumber} (طابق {r.floor?.floorNumber}){' '}
                              {isBooked
                                ? '⭐ [نفس الغرفة التي حجزها النزيل]'
                                : '— شاغرة وجاهزة للتسكين ✅'}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم بطاقة المفتاح الذكي (Keycard)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={keyCard}
                    onChange={(e) => setKeyCard(e.target.value)}
                    required
                    placeholder="CARD-101-A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 pl-8"
                  />
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Exception override if needed */}
              {['ADMIN', 'GENERAL_MANAGER'].includes(user?.role) && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    مبرر التجاوز الاستثنائي (للإدارة فقط):
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="إذا لم تكن الغرفة مفتشة، يرجى كتابة سبب التسكين الاستثنائي للتدقيق..."
                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedResForCheckin(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  تأكيد تسجيل الوصول والتسكين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECK-OUT MODAL WITH FOLIO BALANCE VALIDATION */}
      {selectedResForCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-800">إجراء تسجيل المغادرة (Check-out)</h3>
                <p className="text-xs text-slate-500">الغرفة #{selectedResForCheckout.assignedRoom?.roomNumber}</p>
              </div>
              <button onClick={() => setSelectedResForCheckout(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">تنبيه الفاتورة والرصيد:</p>
                  <p>{checkoutError}</p>
                </div>
              </div>
            )}

            <div className="space-y-3 my-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p>
                  <span className="text-slate-500">النزيل:</span>{' '}
                  <span className="font-bold text-slate-800">{selectedResForCheckout.guest?.fullNameAr}</span>
                </p>
                <p>
                  <span className="text-slate-500">رصيد الحساب المتبقي:</span>{' '}
                  <span className="font-bold text-rose-600">
                    {(selectedResForCheckout.folios?.[0]?.balance || 0).toFixed(2)} ر.س
                  </span>
                </p>
              </div>

              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 text-[11px] leading-relaxed">
                📌 بمجرد المغادرة، سيتم تحويل الغرفة تلقائياً إلى حالة <b>(تحتاج تنظيف)</b> وإنشاء مهمة فورية لطاقم
                التدبير الفندقي والتفتيش.
              </div>

              {selectedResForCheckout.folios?.[0]?.balance > 0.01 && (
                <label className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceCheckout}
                    onChange={(e) => setForceCheckout(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span className="text-[11px] font-bold">تأكيد المغادرة بالرغم من وجود رصيد معلق (ترحيل للذمم)</span>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedResForCheckout(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCheckoutSubmit}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow"
              >
                تأكيد المغادرة وإغلاق الإقامة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

