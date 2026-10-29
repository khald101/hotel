import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'نظام قصر الرياض لإدارة الفنادق | Enterprise Hospitality PMS',
  description: 'نظام إدارة فنادق مؤسسي متكامل ومتوافق مع متطلبات المملكة العربية السعودية وهيئة الزكاة والضريبة والجمارك (ZATCA)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F8FAF9] text-slate-800 antialiased selection:bg-gold-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
