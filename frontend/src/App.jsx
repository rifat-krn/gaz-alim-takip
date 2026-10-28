import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AppNavbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DailyReadingsPage from './pages/DailyReadingsPage';
import StationsPage from './pages/StationsPage';
import UsersPage from './pages/UsersPage';
import ArchivePage from './pages/ArchivePage';

export default function App() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="mt-3 text-sm font-medium text-slate-600">Sistem Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col text-slate-900">
      <AppNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 flex-grow">
        {activeTab === 'daily' && <DailyReadingsPage />}
        {activeTab === 'archive' && <ArchivePage />}
        {activeTab === 'stations' && isAdmin && <StationsPage />}
        {activeTab === 'users' && isAdmin && <UsersPage />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-600">Gaz Alım Takip & Sayaç Veri Sistemi &copy; {new Date().getFullYear()}</span>
          <span className="text-slate-400">Aksa RMS-A Canlı Entegrasyon & Belge Doğrulama Platformu</span>
        </div>
      </footer>
    </div>
  );
}
