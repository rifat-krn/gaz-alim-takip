import React, { useState } from 'react';
import { Activity, Database, Users, History, LogOut, UserCheck, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AppNavbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'daily', label: 'Günlük Okumalar', icon: Activity, show: true },
    { id: 'archive', label: 'Geçmiş & Arşiv', icon: History, show: true },
    { id: 'stations', label: 'İstasyon Yönetimi', icon: Database, show: isAdmin },
    { id: 'users', label: 'Kullanıcı Yönetimi', icon: Users, show: isAdmin }
  ].filter(item => item.show);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <a
              href="#daily"
              onClick={(e) => { e.preventDefault(); handleSelectTab('daily'); }}
              className="flex items-center gap-3 text-decoration-none group"
            >
              <img
                src="/logo.svg"
                alt="Aksa Doğalgaz"
                className="h-9 sm:h-10 w-auto shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                  GAZ ALIM TAKİP
                </span>
                <span className="text-[11px] font-medium text-blue-600 mt-1 leading-none">
                  RMS-A Analitik & Kontrol
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links (Tremor Tab Style) */}
            <nav className="hidden lg:flex items-center gap-1 ml-4 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right User Profile & Logout */}
          <div className="hidden lg:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 flex items-center justify-center">
                    <UserCheck size={14} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-800 leading-tight">
                      {user.fullName || user.username}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 leading-tight">
                      {isAdmin
                        ? 'Sistem Yöneticisi'
                        : (user.assignedStation?.name || user.stationU ? `${user.assignedStation?.name || user.stationU.toUpperCase()} Yetkilisi` : 'Operatör')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 ring-1 ring-inset ring-rose-500/20 transition-colors"
                  title="Güvenli Çıkış"
                >
                  <LogOut size={14} />
                  <span>Çıkış</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2 shadow-lg">
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold w-full text-left transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {user && (
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserCheck size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{user.fullName || user.username}</div>
                  <div className="text-[11px] text-slate-500">
                    {isAdmin ? 'Sistem Yöneticisi' : `${user.assignedStation?.name || user.stationU?.toUpperCase()} Yetkilisi`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 ring-1 ring-inset ring-rose-500/20"
              >
                <LogOut size={14} />
                <span>Çıkış</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
