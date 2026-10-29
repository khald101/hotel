'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Receipt,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  QrCode,
  DollarSign,
  Printer,
  X,
  ShieldCheck,
  User,
  Clock,
  Wallet,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export default function BillingPage() {
  const [user, setUser] = useState<any>(null);
  const [folios, setFolios] = useState<any[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Cashier Shift State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftData, setShiftData] = useState<any>({ currentOpenShift: null, liveStats: {}, recentShifts: [] });
  const [startCashInput, setStartCashInput] = useState('1000');
  const [actualCashInput, setActualCashInput] = useState('');
  const [shiftNotesInput, setShiftNotesInput] = useState('');
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftMessage, setShiftMessage] = useState('');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('MADA');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Add Charge Modal
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeCategory, setChargeCategory] = useState('SERVICE');

  // Active Invoice View Modal
  const [activeInvoice, setActiveInvoice] = useState<any>(null);

  const loadFolios = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      const res = await fetch('/api/billing/folios');
      if (res.ok) {
        const json = await res.json();
        setFolios(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadShifts = async () => {
    try {
      const res = await fetch('/api/billing/shifts');
      if (res.ok) {
        const data = await res.json();
        setShiftData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFolios();
    loadShifts();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setShiftLoading(true);
    setShiftMessage('');
    try {
      const res = await fetch('/api/billing/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          startingCash: parseFloat(startCashInput),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShiftMessage(data.error);
        return;
      }
      setShiftMessage(data.message);
      loadShifts();
    } catch {
      setShiftMessage('فشل فتح الوردية');
    } finally {
      setShiftLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setShiftLoading(true);
    setShiftMessage('');
    try {
      const res = await fetch('/api/billing/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          actualCash: parseFloat(actualCashInput),
          closingNotes: shiftNotesInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShiftMessage(data.error);
        return;
      }
      setShiftMessage(data.message);
      setActualCashInput('');
      setShiftNotesInput('');
      loadShifts();
    } catch {
      setShiftMessage('فشل إغلاق الوردية');
    } finally {
      setShiftLoading(false);
    }
  };

  const openFolioDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/billing/folios?id=${id}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedFolio(json.data);
        setPayAmount(String(json.data.balance > 0 ? json.data.balance.toFixed(2) : '0'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio) return;
    setPayLoading(true);
    try {
      const idempotencyKey = `IDEMP-${selectedFolio.id}-${Date.now()}`;
      const res = await fetch('/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folioId: selectedFolio.id,
          amount: parseFloat(payAmount),
          method: payMethod,
          idempotencyKey,
          notes: payNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }

      setShowPaymentModal(false);
      setActiveInvoice(data.data.invoice);
      openFolioDetail(selectedFolio.id);
      loadFolios();
    } catch {
      alert('فشل معالجة الدفعة المالية');
    } finally {
      setPayLoading(false);
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolio) return;
    try {
      const res = await fetch('/api/billing/folios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folioId: selectedFolio.id,
          category: chargeCategory,
          description: chargeDesc,
          unitPrice: parseFloat(chargeAmount),
        }),
      });
      if (res.ok) {
        setShowChargeModal(false);
        setChargeDesc('');
        setChargeAmount('');
        openFolioDetail(selectedFolio.id);
        loadFolios();
      }
    } catch {
      alert('فشل إضافة الرسم');
    }
  };

  const filtered = folios.filter(
    (f) =>
      f.folioNumber?.toLowerCase().includes(search.toLowerCase()) ||
      f.guest?.fullNameAr?.includes(search) ||
      f.reservation?.assignedRoom?.roomNumber?.includes(search)
  );

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
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>إدارة الفوترة والامتثال لـ ZATCA</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                حسابات النزلاء (Folios)، تحصيل المدفوعات عبر مدى/البطاقات، وإصدار الفواتير الضريبية المبسطة بترميز TLV
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setShowShiftModal(true);
                  loadShifts();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span>ورديات الكاشير والصندوق</span>
                {shiftData.currentOpenShift ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black animate-pulse">
                    مفتوحة
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-black">
                    مغلقة
                  </span>
                )}
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-gold-50 text-gold-800 border border-gold-300 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-gold-600" />
                <span>ZATCA المرحلة 2</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Folios List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث بالحساب أو النزيل أو الغرفة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 pl-8 focus:outline-none focus:border-emerald-600"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">جاري تحميل الحسابات...</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filtered.map((folio) => {
                    const isSelected = selectedFolio?.id === folio.id;
                    return (
                      <div
                        key={folio.id}
                        onClick={() => openFolioDetail(folio.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-xs text-slate-900">{folio.folioNumber}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              folio.balance <= 0.01
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {folio.balance <= 0.01 ? 'مسدد بالكامل' : `متبقي: ${folio.balance.toFixed(2)} ر.س`}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-slate-800">{folio.guest?.fullNameAr}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          غرفة: #{folio.reservation?.assignedRoom?.roomNumber || 'غير محددة'} • إجمالي الرسوم:{' '}
                          {folio.totalCharges} ر.س
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Selected Folio Breakdown & Invoice */}
            <div className="lg:col-span-2 space-y-5">
              {selectedFolio ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                  {/* Folio Header Info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg text-slate-800">حساب النزيل: {selectedFolio.folioNumber}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {selectedFolio.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        النزيل: <span className="font-bold text-slate-800">{selectedFolio.guest?.fullNameAr}</span> •
                        الغرفة: #{selectedFolio.reservation?.assignedRoom?.roomNumber || 'N/A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowChargeModal(true)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-slate-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة رسم للحساب</span>
                      </button>

                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-2 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>تحصيل دفعة مالية</span>
                      </button>
                    </div>
                  </div>

                  {/* Balance Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[11px] text-slate-500">إجمالي الرسوم المحتسبة</span>
                      <p className="text-xl font-black text-slate-800 mt-1">
                        {selectedFolio.totalCharges?.toFixed(2)} ر.س
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-[11px] text-emerald-700 font-bold">إجمالي المبالغ المسددة</span>
                      <p className="text-xl font-black text-emerald-800 mt-1">
                        {selectedFolio.totalPayments?.toFixed(2)} ر.س
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                      <span className="text-[11px] text-rose-700 font-bold">الرصيد المتبقي المستحق</span>
                      <p className="text-xl font-black text-rose-800 mt-1">
                        {selectedFolio.balance?.toFixed(2)} ر.س
                      </p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 mb-2">بنود ورسوم الإقامة والخدمات والمطاعم:</h4>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-right text-xs min-w-[550px]">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">التصنيف</th>
                            <th className="py-2.5 px-3">الوصف</th>
                            <th className="py-2.5 px-3">الكمية</th>
                            <th className="py-2.5 px-3">السعر</th>
                            <th className="py-2.5 px-3">الضريبة 15%</th>
                            <th className="py-2.5 px-3">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedFolio.items?.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-600">{item.category}</td>
                              <td className="py-2 px-3 text-slate-800 font-bold">{item.description}</td>
                              <td className="py-2 px-3 text-slate-600">{item.quantity}</td>
                              <td className="py-2 px-3 text-slate-600">{item.unitPrice.toFixed(2)}</td>
                              <td className="py-2 px-3 text-slate-600">{item.taxAmount.toFixed(2)}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{item.totalAmount.toFixed(2)} ر.س</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payments Recorded */}
                  {selectedFolio.payments?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-xs text-emerald-800 mb-2">المدفوعات المسجلة:</h4>
                      <div className="space-y-2">
                        {selectedFolio.payments.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-slate-800">{p.paymentNumber}</span>
                              <span className="text-slate-400 mr-2 text-[11px]">
                                عبر ({p.method}) • المرجع: {p.transactionRef}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-emerald-700">{p.amount.toFixed(2)} ر.س</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(p.createdAt).toLocaleDateString('ar-SA')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issued ZATCA Invoices */}
                  {selectedFolio.invoices?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <h4 className="font-bold text-xs text-slate-800 mb-2">
                        الفواتير الضريبية الإلكترونية الصادرة لـ ZATCA:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedFolio.invoices.map((inv: any) => (
                          <button
                            key={inv.id}
                            onClick={() => setActiveInvoice(inv)}
                            className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>عرض فاتورة ZATCA ({inv.invoiceNumber})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">
                  اختر حساب نزيل من القائمة الجانبية لعرض تفاصيل الرسوم والفاتورة
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* PAYMENT PROCESS MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-800">تحصيل دفعة مالية وإصدار الفاتورة</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المبلغ المراد سداده (ر.س)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">طريقة الدفع المعتمدة</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold"
                >
                  <option value="MADA">بطاقة مدى (Mada)</option>
                  <option value="CREDIT_CARD">بطاقة ائتمانية (Visa / MasterCard)</option>
                  <option value="CASH">نقداً (Cash)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي رسمي</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات التحصيل (اختياري)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="سداد كامل الإقامة عند تسجيل الوصول..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-[11px]">
                🛡️ سيتم تطبيق مفتاح عدم التكرار (Idempotency) آلياً لمنع تكرار العملية، وتوليد رمز الاستجابة السريعة
                (QR Code) المشفر بترميز TLV وفق أنظمة الفوترة الإلكترونية السعودية ZATCA.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="px-5 py-2.5 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-black rounded-xl shadow"
                >
                  {payLoading ? 'جاري التحصيل...' : 'تأكيد التحصيل وإصدار الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHARGE MODAL */}
      {showChargeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-800">إضافة رسم لحساب النزيل</h3>
              <button onClick={() => setShowChargeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCharge} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">التصنيف</label>
                <select
                  value={chargeCategory}
                  onChange={(e) => setChargeCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="SERVICE">خدمات عامة</option>
                  <option value="MINIBAR">ميني بار</option>
                  <option value="LAUNDRY">غسيل وكي ملابس</option>
                  <option value="SPA">نادي صحي وسبا</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: غسيل بدلة رجالية مستعجل"
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المبلغ قبل الضريبة (ر.س)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="50"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChargeModal(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 text-white font-bold rounded-xl shadow"
                >
                  إضافة للحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL ZATCA E-INVOICE VIEW & PRINT MODAL */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>فاتورة ضريبية مبسطة معتمدة (ZATCA Phase 1 & 2)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
                <button onClick={() => setActiveInvoice(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Printable Invoice Sheet */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl mt-4 space-y-5 text-xs text-slate-800">
              {/* Hotel & Invoice Header */}
              <div className="text-center pb-4 border-b border-slate-200">
                <h2 className="font-black text-lg text-palace-950">{activeInvoice.sellerName}</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">الرقم الضريبي للمنشأة: {activeInvoice.sellerVat}</p>
                <p className="text-[11px] text-slate-400">الرياض، المملكة العربية السعودية</p>
                <div className="mt-2 inline-block px-3 py-1 rounded bg-slate-100 text-slate-800 font-bold text-xs">
                  فاتورة ضريبية مبسطة • Simplified Tax Invoice
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <p className="text-slate-500">رقم الفاتورة التسلسلي:</p>
                  <p className="font-mono font-bold text-slate-900">{activeInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-slate-500">التاريخ والوقت:</p>
                  <p className="font-bold text-slate-900">{new Date(activeInvoice.issueDate).toLocaleString('ar-SA')}</p>
                </div>
                <div>
                  <p className="text-slate-500">العميل / النزيل:</p>
                  <p className="font-bold text-slate-900">{activeInvoice.buyerName}</p>
                </div>
                <div>
                  <p className="text-slate-500">معرف ZATCA الفريد:</p>
                  <p className="font-mono text-[9px] text-slate-500 truncate">{activeInvoice.uuid}</p>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">المبلغ الخاضع للضريبة (غير شامل VAT):</span>
                  <span className="font-bold">{activeInvoice.subtotal?.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">ضريبة القيمة المضافة 15%:</span>
                  <span className="font-bold text-emerald-800">{activeInvoice.taxAmount?.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-200 text-sm font-black bg-slate-50 px-2 rounded">
                  <span>الإجمالي الكلي المستحق (شامل VAT):</span>
                  <span className="text-palace-950">{activeInvoice.totalInclusive?.toFixed(2)} ر.س</span>
                </div>
              </div>

              {/* ZATCA Compliant TLV QR Code Representation */}
              <div className="text-center pt-3 border-t border-slate-200">
                <p className="text-[11px] font-bold text-slate-700 mb-2">
                  رمز الاستجابة السريعة المشفر لهيئة الزكاة والضريبة والجمارك (ZATCA QR)
                </p>
                <div className="w-32 h-32 mx-auto bg-slate-950 p-2 rounded-xl flex items-center justify-center shadow-inner">
                  {/* Visual QR representation placeholder using svg pattern */}
                  <div className="w-full h-full bg-white p-2 flex flex-col justify-between items-center text-center">
                    <QrCode className="w-20 h-20 text-slate-950" />
                    <span className="text-[8px] font-mono font-bold text-slate-600">ZATCA VALIDATED</span>
                  </div>
                </div>
                <div className="mt-2 text-[9px] font-mono text-slate-400 max-w-xs mx-auto truncate">
                  TLV Base64: {activeInvoice.zatcaQrCode}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cashier Shift Management Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-700" />
                  <span>إدارة ورديات الكاشير ومطابقة الصندوق</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  فتح الورديات النقدية، تتبع المقبوضات الحية، وجرد الصندوق ومطابقة العهدة عند الإغلاق
                </p>
              </div>
              <button onClick={() => setShowShiftModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {shiftMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{shiftMessage}</span>
              </div>
            )}

            {/* Current Shift Status */}
            {shiftData.currentOpenShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-black text-xs text-emerald-950">
                      وردية نشطة: {shiftData.currentOpenShift.shiftNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black animate-pulse">
                      مفتوحة حالياً
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-bold">
                    مسؤول الوردية: {shiftData.currentOpenShift.user?.fullName} ({shiftData.currentOpenShift.user?.username})
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    وقت الفتح: {new Date(shiftData.currentOpenShift.openedAt).toLocaleString('ar-SA')}
                  </p>

                  {/* Shift Live Collections Breakdown */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-200/60 text-center text-xs">
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-500 font-bold block">عهدة البداية</span>
                      <span className="font-black text-slate-900">{shiftData.currentOpenShift.startingCash} ر.س</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-500 font-bold block">مقبوضات كاش</span>
                      <span className="font-black text-emerald-700">+{shiftData.liveStats?.cashCollected || 0} ر.س</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-500 font-bold block">مقبوضات مدى/بطاقة</span>
                      <span className="font-black text-blue-700">+{shiftData.liveStats?.cardCollected || 0} ر.س</span>
                    </div>
                  </div>
                </div>

                {/* Close Shift Form */}
                <form onSubmit={handleCloseShift} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>جرد الصندوق وإغلاق الوردية:</span>
                  </h4>

                  <div className="text-xs space-y-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        المبلغ النقدي الفعلي في الدرج (ر.س):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={actualCashInput}
                        onChange={(e) => setActualCashInput(e.target.value)}
                        placeholder={`المتوقع: ${(shiftData.currentOpenShift.startingCash + (shiftData.liveStats?.cashCollected || 0)).toFixed(2)} ر.س`}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-black text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">ملاحظات الجرد والتسليم:</label>
                      <input
                        type="text"
                        value={shiftNotesInput}
                        onChange={(e) => setShiftNotesInput(e.target.value)}
                        placeholder="مطابقة تامة، تسليم العهدة للموظف التالي..."
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={shiftLoading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
                  >
                    اعتماد الجرد وإغلاق الوردية
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-700 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold">لا توجد وردية كاشير مفتوحة حالياً</h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      يرجى فتح وردية جديدة وبدء استلام العهدة النقدية لتسجيل عمليات التحصيل
                    </p>
                  </div>
                </div>

                <form onSubmit={handleOpenShift} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-black text-slate-800">فتح وردية كاشير جديدة:</h4>
                  <div>
                    <label className="block text-xs text-slate-700 font-bold mb-1">عهدة بداية الوردية (ر.س):</label>
                    <input
                      type="number"
                      step="50"
                      required
                      value={startCashInput}
                      onChange={(e) => setStartCashInput(e.target.value)}
                      placeholder="1000"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={shiftLoading}
                    className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    فتح الوردية وبدء العمل
                  </button>
                </form>
              </div>
            )}

            {/* Shift History */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2">سجل الورديات السابقة:</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(shiftData.recentShifts || []).map((sh: any) => (
                  <div key={sh.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{sh.shiftNumber}</span>
                      <span className="text-slate-500 mr-2">({sh.user?.fullName})</span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(sh.openedAt).toLocaleDateString('ar-SA')} • {sh.closingNotes || 'مغلقة'}
                      </p>
                    </div>
                    <div className="text-left font-mono">
                      <span className="font-black text-slate-800">{sh.expectedCash} ر.س</span>
                      {sh.difference !== null && (
                        <span className={`block text-[10px] font-bold ${sh.difference === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {sh.difference === 0 ? 'مطابقة 100%' : `فارق: ${sh.difference} ر.س`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

