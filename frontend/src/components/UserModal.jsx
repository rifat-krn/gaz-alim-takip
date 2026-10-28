import React, { useState, useEffect } from 'react';
import { Users, Save, X, AlertCircle, Mail, Plus } from 'lucide-react';
import api from '../api/axiosClient';

function EmailTagListInput({ label, badgeColor = 'blue', emails, onChange, placeholder }) {
  const [inputVal, setInputVal] = useState('');

  const addEmailsFromText = (rawText) => {
    if (!rawText || !rawText.trim()) return;
    const parts = rawText
      .split(/[,;\s]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.includes('@'));

    if (parts.length > 0) {
      const merged = [...new Set([...emails, ...parts])];
      onChange(merged);
      setInputVal('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      addEmailsFromText(inputVal);
    }
  };

  const handleRemove = (targetEmail) => {
    onChange(emails.filter(item => item !== targetEmail));
  };

  const badgeStyle = badgeColor === 'indigo'
    ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
    : 'bg-blue-50 text-blue-700 ring-blue-600/20';

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Mail size={14} />
          </div>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputVal.includes('@')) addEmailsFromText(inputVal);
            }}
            placeholder={placeholder}
            className="w-full rounded-xl border-0 py-2 pl-9 pr-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => addEmailsFromText(inputVal)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Ekle</span>
        </button>
      </div>

      {emails.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {emails.map((email) => (
            <span
              key={email}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeStyle}`}
            >
              <span className="break-all">{email}</span>
              <button
                type="button"
                onClick={() => handleRemove(email)}
                className="p-0.5 rounded hover:bg-black/10 transition-colors cursor-pointer"
                title="Kaldır"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">
          Henüz e-posta adresi eklenmedi. Adresi yazıp Enter tuşuna veya "Ekle" butonuna basın (virgülle birden fazla yapıştırabilirsiniz).
        </p>
      )}
    </div>
  );
}

export default function UserModal({ show, onHide, user, onSave, loading }) {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'station_operator',
    assignedStation: '',
    stationU: '',
    toEmails: [],
    ccEmails: [],
    emailNotificationsEnabled: true,
    isActive: true
  });
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) return;
    api.get('/stations').then(res => {
      if (res.data.success) setStations(res.data.stations);
    }).catch(console.error);
  }, [show]);

  useEffect(() => {
    if (user) {
      const stationId = user.assignedStation?._id || user.assignedStation || '';
      setFormData({
        username: user.username || '',
        fullName: user.fullName || '',
        password: '',
        role: user.role || 'station_operator',
        assignedStation: stationId,
        stationU: user.stationU || '',
        toEmails: Array.isArray(user.toEmails) ? user.toEmails : [],
        ccEmails: Array.isArray(user.ccEmails) ? user.ccEmails : [],
        emailNotificationsEnabled: user.emailNotificationsEnabled !== undefined ? user.emailNotificationsEnabled : true,
        isActive: user.isActive !== undefined ? user.isActive : true
      });
    } else {
      setFormData({
        username: '',
        fullName: '',
        password: '',
        role: 'station_operator',
        assignedStation: '',
        stationU: '',
        toEmails: [],
        ccEmails: [],
        emailNotificationsEnabled: true,
        isActive: true
      });
    }
    setError('');
  }, [user, show]);

  if (!show) return null;

  const handleStationChange = (e) => {
    const stId = e.target.value;
    const selected = stations.find(s => s._id === stId);
    setFormData({
      ...formData,
      assignedStation: stId,
      stationU: selected ? selected.u : ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim()) {
      setError('Kullanıcı Adı ve Ad Soyad alanları zorunludur');
      return;
    }
    if (!user && !formData.password.trim()) {
      setError('Yeni kullanıcı için şifre zorunludur');
      return;
    }
    if (formData.role === 'station_operator' && !formData.assignedStation) {
      setError('İstasyon yetkilisi rolü için lütfen atanacak istasyonu seçiniz');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-xl w-full max-w-2xl overflow-hidden my-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 flex items-center justify-center">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {user ? 'Kullanıcı & İstasyon Mail Alıcılarını Düzenle' : 'Yeni Kullanıcı & Mail Alıcısı Ekle'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  İstasyon yetkisi ve günlük onay kontrol raporunun gönderileceği TO / CC mail adresleri
                </p>
              </div>
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
          <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ad Soyad / Birim Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kepez İstasyon Operatörü"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full rounded-xl border-0 py-2.5 px-3.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kullanıcı Adı (Giriş) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: kepez"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full rounded-xl border-0 py-2.5 px-3.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {user ? 'Yeni Şifre (Değiştirmeyecekseniz boş bırakın)' : 'Şifre *'}
                </label>
                <input
                  type="password"
                  placeholder={user ? '******' : 'Şifre giriniz (Örn: kepez123)'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border-0 py-2.5 px-3.5 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Yetki Rolü
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-xl border-0 py-2.5 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                >
                  <option value="station_operator">İstasyon Operatörü (Tek İstasyon)</option>
                  <option value="admin">Yönetici (Tüm İstasyonlar & Admin)</option>
                </select>
              </div>
            </div>

            {formData.role === 'station_operator' && (
              <div>
                <label className="block text-xs font-semibold text-blue-600 mb-1.5">
                  Bağlı İstasyon (Bu istasyonun günlük onay raporu aşağıdaki TO / CC adreslerine gönderilir) *
                </label>
                <select
                  value={formData.assignedStation}
                  onChange={handleStationChange}
                  required
                  className="w-full rounded-xl border-0 py-2.5 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                >
                  <option value="">İstasyon Seçiniz...</option>
                  {stations.map(st => (
                    <option key={st._id} value={st._id}>{st.name} ({st.u})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Email Recipients Section (TO and CC) */}
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/90 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Günlük Rapor Onay Kontrolü E-Posta Alıcıları (TO & CC)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Günde 1 kez çalışan onay kontrol raporunda bu istasyon için bilgilendirilecek adresler
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.emailNotificationsEnabled}
                    onChange={(e) => setFormData({ ...formData, emailNotificationsEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Mail Bildirimi Aktif</span>
                </label>
              </div>

              <EmailTagListInput
                label="TO (Birincil Alıcılar - Birden Çok Mail Eklenebilir)"
                badgeColor="blue"
                emails={formData.toEmails}
                onChange={(toEmails) => setFormData({ ...formData, toEmails })}
                placeholder="Örn: istasyon.sorumlusu@sirket.com, operator@sirket.com"
              />

              <EmailTagListInput
                label="CC (Bilgi Alıcıları - Birden Çok Mail Eklenebilir)"
                badgeColor="indigo"
                emails={formData.ccEmails}
                onChange={(ccEmails) => setFormData({ ...formData, ccEmails })}
                placeholder="Örn: bolge.muduru@sirket.com, kontrol@sirket.com"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700">Kullanıcı Hesabı Aktif</span>
              </label>
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
