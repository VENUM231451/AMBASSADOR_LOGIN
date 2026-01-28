import './globals.css';
import { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/toast-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = { title: 'Ambassador Clock System' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
