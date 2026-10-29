'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  Users2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  UserCheck,
  X,
  Search,
} from 'lucide-react';

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any>(null);

  // Form State
  const [form, setForm] = useState({
    username: '',
    password: 'password123',
    fullName: '',
    role: 'CLEANER', // Defaults to cleaner
    jobTitle: 'المنظف',
    department: 'التدبير الفندقي',
    email: '',
    phone: '',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
        const u = await authRes.json();
        setCurrentUser(u.user);
      }

      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChangeInForm = (newRole: string) => {
    let title = 'موظف';
    let dept = 'عام';

    if (newRole === 'CLEANER') {
      title = 'المنظف';
      dept = 'التدبير الفندقي';
    } else if (newRole === 'CUSHION_MANAGER') {
      title = 'مدير الكوشن';
      dept = 'إدارة العمليات الخاصة والمخملية (الكوشن)';
    } else if (newRole === 'RECEPTIONIST') {
      title = 'موظف الاستقبال';
      dept = 'الاستقبال';
    } else if (newRole === 'HOUSEKEEPING_SUPERVISOR') {
      title = 'مشرفة النظافة والتفتيش';
      dept = 'التدبير الفندقي';
    } else if (newRole === 'ACCOUNTANT') {
      title = 'المحاسب المالي';
      dept = 'المالية';
    } else if (newRole === 'MAINTENANCE_TECH') {
      title = 'فني الصيانة';
      dept = 'الهندسة والصيانة';
    } else if (newRole === 'ADMIN') {
      title = 'مسؤول النظام العام';
      dept = 'الإدارة والتقنية';
    }

    setForm({
      ...form,
      role: newRole,
      jobTitle: title,
      department: dept,
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      setShowNewModal(false);
      setForm({
        username: '',
        password: 'password123',
        fullName: '',
        role: 'CLEANER',
        jobTitle: 'المنظف',
        department: 'التدبير الفندقي',
        email: '',
        phone: '',
      });
      loadUsers();
    } catch {
      alert('فشل إنشاء المستخدم');
    }
  };

  const handleToggleActive = async (userObj: any) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userObj.id,
          active: !userObj.active,
        }),
      });
      if (res.ok) loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      <Sidebar userRole={currentUser?.role} />

      <div className="flex-1 mr-0 lg:mr-72 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header user={currentUser} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
                <Users2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                <span>إدارة الموظفين ونظام الصلاحيات (RBAC)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                التحكم المركزي في حسابات الموظفين، بما في ذلك حساب المنظف وحساب مدير الكوشن القابل للتعديل
              </p>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="w-full sm:w-auto justify-center px-4 py-2 bg-gradient-to-l from-gold-500 to-gold-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حساب موظف جديد</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل الحسابات...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">اسم المستخدم</th>
                      <th className="py-3 px-4">الاسم الكامل</th>
                      <th className="py-3 px-4">الدور الوظيفي (Role)</th>
                      <th className="py-3 px-4">المسمى الوظيفي المعتمد</th>
                      <th className="py-3 px-4">القسم</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isCleaner = u.role === 'CLEANER';
                      const isCushion = u.role === 'CUSHION_MANAGER';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{u.username}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{u.fullName}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isCleaner
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : isCushion
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">{u.jobTitle}</td>
                          <td className="py-3.5 px-4 text-slate-500">{u.department || '-'}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {u.active ? 'مفعل نشط' : 'معطل'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                                u.active
                                  ? 'text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.active ? 'تعطيل الحساب' : 'تفعيل'}
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
        </main>
      </div>

      {/* CREATE USER MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-800">إنشاء حساب موظف جديد</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الدور الوظيفي (Role)</label>
                <select
                  value={form.role}
                  onChange={(e) => handleRoleChangeInForm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="CLEANER">المنظف (CLEANER)</option>
                  <option value="CUSHION_MANAGER">مدير الكوشن (CUSHION_MANAGER)</option>
                  <option value="RECEPTIONIST">موظف الاستقبال (RECEPTIONIST)</option>
                  <option value="HOUSEKEEPING_SUPERVISOR">مشرفة النظافة (HOUSEKEEPING_SUPERVISOR)</option>
                  <option value="ACCOUNTANT">المحاسب المالي (ACCOUNTANT)</option>
                  <option value="MAINTENANCE_TECH">فني الصيانة (MAINTENANCE_TECH)</option>
                  <option value="ADMIN">مسؤول النظام (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المستخدم للدخول (Username)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: cleaner3"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم الكامل للموظف</label>
                <input
                  type="text"
                  required
                  placeholder="محمد بن راشد"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي المعتمد (Job Title)</label>
                <input
                  type="text"
                  required
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الافتراضية</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

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
                  إنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

