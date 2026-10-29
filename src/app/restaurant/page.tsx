'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle2,
  Receipt,
  BedDouble,
  User,
} from 'lucide-react';

export default function RestaurantPage() {
  const [user, setUser] = useState<any>(null);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState<{ [id: string]: { item: any; quantity: number } }>({});
  const [targetType, setTargetType] = useState('DINE_IN');
  const [roomNumber, setRoomNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [orderLoading, setOrderLoading] = useState(false);

  const loadPos = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u.user);
      }

      const res = await fetch('/api/pos/orders');
      if (res.ok) {
        const json = await res.json();
        setOutlets(json.outlets);
        setRecentOrders(json.recentOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPos();
  }, []);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const count = existing ? existing.quantity + 1 : 1;
      return { ...prev, [item.id]: { item, quantity: count } };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (!copy[itemId]) return copy;
      if (copy[itemId].quantity > 1) {
        copy[itemId].quantity -= 1;
      } else {
        delete copy[itemId];
      }
      return copy;
    });
  };

  const cartList = Object.values(cart);
  const cartSubtotal = cartList.reduce((acc, c) => acc + c.item.price * c.quantity, 0);
  const cartTax = Number((cartSubtotal * 0.15).toFixed(2));
  const cartTotal = Number((cartSubtotal + cartTax).toFixed(2));

  const handleCheckoutOrder = async () => {
    if (cartList.length === 0) return;
    if (paymentMode === 'ROOM_FOLIO' && !roomNumber) {
      alert('يرجى تحديد رقم الغرفة لتحميل الطلب على حساب النزيل');
      return;
    }

    setOrderLoading(true);
    try {
      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId: outlets[0]?.id,
          targetType,
          roomNumber: roomNumber || null,
          paymentMode,
          items: cartList.map((c) => ({
            menuItemId: c.item.id,
            name: c.item.nameAr,
            quantity: c.quantity,
            unitPrice: c.item.price,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }

      setCart({});
      setRoomNumber('');
      alert(`تم تسجيل الطلب ${data.data.orderNumber} بنجاح!`);
      loadPos();
    } catch {
      alert('فشل معالجة الطلب');
    } finally {
      setOrderLoading(false);
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
                <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>المطاعم ونقاط البيع (F&B / POS)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                خدمات الغرف والمطاعم مع إمكانية التحميل الفوري على حساب الغرفة (Folio Charge)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Menu Items Catalog */}
            <div className="lg:col-span-2 space-y-6">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل قوائم الطعام...</div>
              ) : (
                outlets.map((outlet) => (
                  <div key={outlet.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-black text-base text-slate-800">{outlet.nameAr}</h3>
                      <p className="text-xs text-slate-500">{outlet.nameEn}</p>
                    </div>

                    {outlet.categories?.map((cat: any) => (
                      <div key={cat.id} className="space-y-3">
                        <h4 className="font-bold text-xs text-gold-700 border-r-2 border-gold-500 pr-2">
                          {cat.nameAr}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {cat.items?.map((item: any) => {
                            const inCart = cart[item.id]?.quantity || 0;
                            return (
                              <div
                                key={item.id}
                                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition flex flex-col justify-between"
                              >
                                <div>
                                  <p className="font-bold text-xs text-slate-800">{item.nameAr}</p>
                                  <p className="text-xs font-black text-emerald-700 mt-1">
                                    {item.price} ر.س
                                  </p>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                  {inCart > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center font-bold"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="font-bold text-xs">{inCart}</span>
                                      <button
                                        onClick={() => addToCart(item)}
                                        className="w-6 h-6 rounded bg-emerald-800 text-white flex items-center justify-center font-bold"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addToCart(item)}
                                      className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                                    >
                                      إضافة
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Live Cart & POS Order Form */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5 h-fit sticky top-24">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-emerald-700" />
                  <span>فاتورة الطلب الحالي</span>
                </h3>
                <span className="text-xs text-slate-500 font-bold">{cartList.length} أصناف</span>
              </div>

              {cartList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">سلة الطلبات فارغة</div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {cartList.map(({ item, quantity }) => (
                      <div key={item.id} className="flex justify-between items-center py-1 border-b border-slate-50">
                        <div>
                          <p className="font-bold text-slate-800">{item.nameAr}</p>
                          <p className="text-[10px] text-slate-400">
                            {quantity} × {item.price} ر.س
                          </p>
                        </div>
                        <span className="font-black text-slate-900">{quantity * item.price} ر.س</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">المجموع الفرعي:</span>
                      <span className="font-bold">{cartSubtotal.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ضريبة القيمة المضافة 15%:</span>
                      <span className="font-bold text-emerald-700">{cartTax.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
                      <span>الإجمالي:</span>
                      <span className="text-palace-950">{cartTotal.toFixed(2)} ر.س</span>
                    </div>
                  </div>

                  {/* Payment destination */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">طريقة السداد / التحميل</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                      >
                        <option value="ROOM_FOLIO">تحميل على حساب الغرفة (Room Folio)</option>
                        <option value="CASH">دفع نقد فوري (Cash)</option>
                        <option value="CARD">بطاقة مدى / ائتمان</option>
                      </select>
                    </div>

                    {paymentMode === 'ROOM_FOLIO' && (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">رقم الغرفة المسكنة</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: 101"
                          value={roomNumber}
                          onChange={(e) => setRoomNumber(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCheckoutOrder}
                      disabled={orderLoading}
                      className="w-full py-2.5 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-black rounded-xl shadow-md transition"
                    >
                      {orderLoading ? 'جاري التنفيذ...' : 'اعتماد وترحيل الطلب'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

