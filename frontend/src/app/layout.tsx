import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/lib/theme';
import { PreferencesProvider } from '@/lib/preferences';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MedStore — Clinical Storage Application',
  description: 'Penyimpanan & Manajemen Rekam Medis Klinis Patuh Regulasi UU PDP & Permenkes 24/2022',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <PreferencesProvider>
          <ThemeProvider>
            {children}
            <Toaster position="top-right" />
          </ThemeProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
