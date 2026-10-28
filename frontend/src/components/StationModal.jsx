import React, { useState, useEffect } from 'react';
import { Database, Save, X, AlertCircle } from 'lucide-react';

export default function StationModal({ show, onHide, station, onSave, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    u: '',
    p: '',
    description: '',
    order: 0,
    isActive: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name || '',
        u: station.u || '',
        p: station.p || '',
        description: station.description || '',
        order: station.order || 0,
        isActive: station.isActive !== undefined ? station.isActive : true
      });
    } else {
      setFormData({
        name: '',
        u: '',
        p: '',
        description: '',
        order: 0,
        isActive: true
      });
    }
    setError('');
  }, [station, show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.u.trim() || !formData.p.trim()) {
      setError('İstasyon Adı, OYS Kullanıcı Adı (u) ve Şifre (p) zorunludur');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 flex items-center justify-center">
                <Database size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {station ? 'İstasyonu Düzenle' : 'Yeni İstasyon Ekle'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onHide}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                İstasyon Tanımı / Adı *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: Kepez İstasyonu"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border-0 py-2.5 px-3.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  OYS Kullanıcı Adı (u) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: kepez"
                  value={formData.u}
                  onChange={(e) => setFormData({ ...formData, u: e.target.value })}
                  className="w-full rounded-xl border-0 py-2.5 px-3.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  OYS Şifresi (p) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: kepez"
                  value={formData.p}
                  onChange={(e) => setFormData({ ...formData, p: e.target.value })}
                  className="w-full rounded-xl border-0 py-2.5 px-3.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sıralama (Order)
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border-0 py-2.5 px-3.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="pt-4">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">İstasyon Aktif</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Açıklama / Lokasyon Notu
              </label>
              <textarea
                rows={2}
                placeholder="İstasyon hakkında ek bilgi..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border-0 py-2.5 px-3.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onHide}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xs transition-colors cursor-pointer"
            >
              <Save size={15} />
              <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
