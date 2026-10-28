import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Kullanıcı adı veya şifre hatalı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img
            src="/logo.svg"
            alt="Aksa Doğalgaz"
            className="h-14 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gaz Alım Takip Sistemi</h1>
          <p className="text-sm text-slate-500 mt-1">Aksa RMS-A İstasyon Sayaç & Belge Kontrol Platformu</p>
        </div>

        {/* Tremor Card */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">Hesabınıza Giriş Yapın</h2>
            <p className="text-xs text-slate-500 mt-0.5">Yetkili kullanıcı adı ve şifrenizi giriniz</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 p-3.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 flex items-center gap-2.5">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Örn: admin veya kepez"
                  className="w-full rounded-xl border-0 py-2.5 pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border-0 py-2.5 pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <KeyRound size={17} />
                  <span>Sisteme Giriş Yap</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-600">Yönetici (Tüm İstasyonlar):</span>
              <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono">admin / admin123</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-600">İstasyon Operatörleri:</span>
              <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono">kepez / kepez123, ezine2...</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
