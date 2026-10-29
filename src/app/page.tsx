'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            if (data.user.role === 'CLEANER') {
              router.push('/housekeeping/cleaner-portal');
            } else {
              router.push('/dashboard');
            }
            return;
          }
        }
      } catch (e) {
        // Fallback to login
      }
      router.push('/login');
    }
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F241F]">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-bold text-lg text-gold-300">جاري تحميل نظام قصر الرياض الفندقي...</p>
      </div>
    </div>
  );
}

