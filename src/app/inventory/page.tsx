'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Truck,
  FileText,
  Building,
  Check,
} from 'lucide-react';

export default function InventoryPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'procurement'>('items');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Transaction Modal State
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionType, setActionType] = useState<'RECEIVE' | 'CONSUME'>('RECEIVE');
  const [quantity, setQuantity] = useState('10');
  const [notes, setNotes] = useState('');

  // Procurement & Vendors State
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [showNewVendorModal, setShowNewVendorModal] = useState(false);
  const [showNewPOModal, setShowNewPOModal] = useState(false);

  // New Vendor Form
  const [vendorForm, setVendorForm] = useState({
    nameAr: '',
    contactPerson: '',
    phone: '',
    email: '',
    taxNumber: '',
    category: 'GENERAL',
  });

  // New PO Form
  const [poForm, setPoForm] = useState({
    vendorId: '',
    notes: '',
    inventoryItemId: '',
    description: '',
    quantity: '50',
    unitCost: '45',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      const [invRes, poRes] = await Promise.all([
        fetch('/api/inventory').then((r) => r.json()),
        fetch('/api/inventory/purchase-orders').then((r) => r.json()).catch(() => ({ data: [], vendors: [] })),
      ]);

      if (invRes.success) setItems(invRes.data);
      if (poRes.success) {
        setPurchaseOrders(poRes.data);
        setVendors(poRes.vendors || []);
        if (poRes.vendors?.length > 0 && !poForm.vendorId) {
          setPoForm((prev) => ({ ...prev, vendorId: poRes.vendors[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          actionType,
          quantity: parseInt(quantity, 10),
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      setShowTransactionModal(false);
      setSelectedItem(null);
      setNotes('');
      loadData();
    } catch {
      alert('فشل تسجيل حركة المخزون');
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorForm),
      });
      if (res.ok) {
        setShowNewVendorModal(false);
        setVendorForm({
          nameAr: '',
          contactPerson: '',
          phone: '',
          email: '',
          taxNumber: '',
          category: 'GENERAL',
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: poForm.vendorId,
          notes: poForm.notes,
          items: [
            {
              description: poForm.description || 'طلب توريد أصناف',
              quantity: parseInt(poForm.quantity, 10),
              unitCost: parseFloat(poForm.unitCost),
              inventoryItemId: poForm.inventoryItemId || null,
            },
          ],
        }),
      });
      if (res.ok) {
        setShowNewPOModal(false);
        setPoForm({
          vendorId: vendors[0]?.id || '',
          notes: '',
          inventoryItemId: '',
          description: '',
          quantity: '50',
          unitCost: '45',
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceivePO = async (poId: string) => {
    if (!confirm('هل تود تأكيد استلام هذا الطلب وتغذية رصيد المخزون آلياً؟')) return;
    try {
      const res = await fetch('/api/inventory/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: poId, status: 'RECEIVED' }),
      });
      if (res.ok) {
        alert('تم استلام الشحنة وتحديث أرصدة المخزون تلقائياً!');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = items.filter(
    (i) =>
      i.nameAr?.includes(search) ||
      i.sku?.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.includes(search)
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
                <Boxes className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>إدارة المخزون والمشتريات (Inventory & Procurement)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                متابعة أرصدة مواد الضيافة، مستلزمات النظافة، وسجلات الموردين وأوامر الشراء المباشرة
              </p>
            </div>

            {/* Tab Toggles */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('items')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'items'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مستودع الأصناف ({items.length})
              </button>
              <button
                onClick={() => setActiveTab('procurement')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'procurement'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-emerald-700" />
                <span>الموردون والمشتريات ({purchaseOrders.length})</span>
              </button>
            </div>
          </div>

          {activeTab === 'items' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="ابحث برمز الصنف أو الاسم أو التصنيف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 pl-8 focus:outline-none focus:border-emerald-600"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-slate-400 text-xs">جاري جلب بيانات المخزون...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">رمز الصنف (SKU)</th>
                          <th className="py-3 px-4">اسم الصنف</th>
                          <th className="py-3 px-4">التصنيف</th>
                          <th className="py-3 px-4">الوحدة</th>
                          <th className="py-3 px-4">الرصيد الحالي</th>
                          <th className="py-3 px-4">الحد الأدنى</th>
                          <th className="py-3 px-4 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.map((item) => {
                          const isLow = item.currentStock <= item.minStock;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{item.sku}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">{item.nameAr}</td>
                              <td className="py-3.5 px-4 text-slate-600">{item.category}</td>
                              <td className="py-3.5 px-4 text-slate-500">{item.unit}</td>
                              <td className="py-3.5 px-4 font-black text-sm">
                                <span className={isLow ? 'text-rose-600' : 'text-emerald-700'}>
                                  {item.currentStock}
                                </span>
                                {isLow && (
                                  <span className="mr-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                    منخفض
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500">{item.minStock}</td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowTransactionModal(true);
                                  }}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition"
                                >
                                  تسجيل حركة (توريد/صرف)
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Procurement Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">الموردون المسجلون: {vendors.length}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-bold text-slate-700">أوامر الشراء: {purchaseOrders.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNewVendorModal(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                  >
                    <Building className="w-4 h-4 text-slate-600" />
                    <span>إضافة مورد جديد</span>
                  </button>

                  <button
                    onClick={() => setShowNewPOModal(true)}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء أمر شراء (PO)</span>
                  </button>
                </div>
              </div>

              {/* Purchase Orders Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 font-black text-xs text-slate-800 flex items-center justify-between">
                  <span>سجل أوامر الشراء والتوريد:</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs min-w-[750px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">رقم أمر الشراء</th>
                        <th className="py-3 px-4">المورد</th>
                        <th className="py-3 px-4">الأصناف المطلوبة</th>
                        <th className="py-3 px-4">المبلغ الإجمالي</th>
                        <th className="py-3 px-4">الحالة</th>
                        <th className="py-3 px-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">{po.vendor?.nameAr}</p>
                            <p className="text-[10px] text-slate-400">{po.vendor?.phone}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            {(po.items || []).map((it: any) => (
                              <span key={it.id} className="block text-slate-700">
                                {it.description} ({it.quantity} × {it.unitCost} ر.س)
                              </span>
                            ))}
                          </td>
                          <td className="py-3.5 px-4 font-black text-slate-900">
                            {po.totalAmount?.toLocaleString()} ر.س
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                po.status === 'RECEIVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : po.status === 'ORDERED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {po.status === 'RECEIVED' ? 'تم الاستلام والتوريد ✅' : 'بانتظار التوريد 🚚'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {po.status === 'ORDERED' ? (
                              <button
                                onClick={() => handleReceivePO(po.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition"
                              >
                                استلام وتغذية المخزون
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-bold">مكتمل</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* TRANSACTION MODAL */}
      {showTransactionModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-base text-slate-800">
                تسجيل حركة مخزنية ({selectedItem.nameAr})
              </h3>
              <button onClick={() => setShowTransactionModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransaction} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع الحركة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('RECEIVE')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition ${
                      actionType === 'RECEIVE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <span>توريد واستلام (إضافة)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('CONSUME')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition ${
                      actionType === 'CONSUME'
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <span>صرف واستهلاك (خصم)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الكمية ({selectedItem.unit}):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البيان والملاحظات:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="طلب قسم التدبير الفندقي، عهدة طابق..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  تأكيد الحركة المخزنية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW VENDOR MODAL */}
      {showNewVendorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-base text-slate-800">إضافة مورد ومورد معتمد جديد</h3>
              <button onClick={() => setShowNewVendorModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المنشأة / المورد:</label>
                <input
                  type="text"
                  required
                  value={vendorForm.nameAr}
                  onChange={(e) => setVendorForm({ ...vendorForm, nameAr: e.target.value })}
                  placeholder="شركة الضيافة الراقية..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">مسؤول التواصل:</label>
                <input
                  type="text"
                  value={vendorForm.contactPerson}
                  onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                  placeholder="محمد السعدون"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم الهاتف:</label>
                <input
                  type="text"
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  placeholder="0501122334"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الرقم الضريبي:</label>
                <input
                  type="text"
                  value={vendorForm.taxNumber}
                  onChange={(e) => setVendorForm({ ...vendorForm, taxNumber: e.target.value })}
                  placeholder="310987654300001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewVendorModal(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PO MODAL */}
      {showNewPOModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-base text-slate-800">إنشاء أمر شراء وتوريد (Purchase Order)</h3>
              <button onClick={() => setShowNewPOModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">المورد المعتمد:</label>
                <select
                  required
                  value={poForm.vendorId}
                  onChange={(e) => setPoForm({ ...poForm, vendorId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nameAr} ({v.phone || 'عام'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ربط بصنف من المستودع (لتحديث رصيده آلياً):</label>
                <select
                  value={poForm.inventoryItemId}
                  onChange={(e) => {
                    const sel = items.find((i) => i.id === e.target.value);
                    setPoForm({
                      ...poForm,
                      inventoryItemId: e.target.value,
                      description: sel ? sel.nameAr : poForm.description,
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  <option value="">صنف عام / غير مرتبط بمستودع</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.nameAr} ({it.sku}) - الرصيد الحالي: {it.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">وصف الصنف / البند:</label>
                <input
                  type="text"
                  required
                  value={poForm.description}
                  onChange={(e) => setPoForm({ ...poForm, description: e.target.value })}
                  placeholder="مناشف، صابون، فلاتر تكييف..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الكمية:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={poForm.quantity}
                    onChange={(e) => setPoForm({ ...poForm, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">سعر الوحدة (ر.س):</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={poForm.unitCost}
                    onChange={(e) => setPoForm({ ...poForm, unitCost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات إضافية:</label>
                <input
                  type="text"
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  placeholder="شروط التسليم والدفع..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPOModal(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  إصدار أمر الشراء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
