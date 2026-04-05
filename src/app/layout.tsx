import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { RoleProvider } from '@/context/RoleContext';
import { PipelineProvider } from '@/context/PipelineContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Covenant Monitor — AI-Powered Lending Operations',
  description: 'AI-native covenant monitoring platform for financial institutions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full flex antialiased" style={{ backgroundColor: '#f8fafc' }}>
        <RoleProvider>
          <PipelineProvider>
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          </PipelineProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
