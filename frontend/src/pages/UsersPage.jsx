import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Shield, User, X, 
  Mail, Clock, Send, Save, CheckCircle2, XCircle, Server
} from 'lucide-react';
import api from '../api/axiosClient';
import UserModal from '../components/UserModal';

function MultiEmailTagBox({ label, badgeColor = 'blue', emails = [], onChange, placeholder }) {
  const [inputVal, setInputVal] = useState('');

  const addEmails = (raw) => {
    if (!raw || !raw.trim()) return;
    const parsed = raw
      .split(/[,;\s]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.includes('@'));
    if (parsed.length > 0) {
      onChange([...new Set([...emails, ...parsed])]);
      setInputVal('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      addEmails(inputVal);
    }
  };

  const badgeStyle = badgeColor === 'indigo'
    ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
    : 'bg-blue-50 text-blue-700 ring-blue-600/20';

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
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
              if (inputVal.includes('@')) addEmails(inputVal);
            }}
            placeholder={placeholder}
            className="w-full rounded-xl border-0 py-2 pl-9 pr-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          />
        </div>
        <button
          type="button"
          onClick={() => addEmails(inputVal)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Ekle</span>
        </button>
      </div>

      {emails.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {emails.map((email) => (
            <span
              key={email}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeStyle}`}
            >
              <span className="break-all">{email}</span>
              <button
                type="button"
                onClick={() => onChange(emails.filter(e => e !== email))}
                className="p-0.5 rounded hover:bg-black/10 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">Henüz e-posta adresi eklenmedi.</p>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // General Mail Settings, General TO & General CC state
  const [settings, setSettings] = useState({
    enabled: true,
    dailyRunTime: '09:30',
    checkTarget: 'YESTERDAY',
    sendMode: 'ALL',
    autoFetchBeforeCheck: true,
    adminToEmails: [],
    adminCcEmails: [],
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    fromName: 'Gaz Alım Takip Sistemi',
    fromEmail: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingGeneralMail, setTestingGeneralMail] = useState(false);
  const [generalTestStatus, setGeneralTestStatus] = useState(null);
  const [testEmailStatus, setTestEmailStatus] = useState({});

  const showNotification = (type, title, text) => {
    setMessage({ type, title, text });
  };

  const loadUsersAndSettings = async () => {
    setLoading(true);
    try {
      const [usersRes, settingsRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/notification-settings')
      ]);

      if (usersRes.data.success) {
        setUsers(usersRes.data.users);
      }
      if (settingsRes.data.success && settingsRes.data.settings) {
        setSettings(settingsRes.data.settings);
      }
    } catch (err) {
      setMessage({
        type: 'danger',
        title: 'Veri Yükleme Hatası',
        text: 'Veriler yüklenemedi: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndSettings();
  }, []);

  const handleCreate = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEdit = (u) => {
    setSelectedUser(u);
    setModalOpen(true);
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`'${u.fullName}' kullanıcısını silmek istediğinizden emin misiniz?`)) return;

    try {
      const res = await api.delete(`/users/${u._id}`);
      if (res.data.success) {
        setMessage({ type: 'success', title: 'Kullanıcı Silindi', text: 'Kullanıcı başarıyla silindi.' });
        loadUsersAndSettings();
      }
    } catch (err) {
      setMessage({
        type: 'danger',
        title: 'Silme Hatası',
        text: 'Silme hatası: ' + (err.response?.data?.message || err.message)
      });
    }
  };

  const handleSaveUser = async (formData) => {
    setSaveLoading(true);
    try {
      let res;
      if (selectedUser) {
        res = await api.put(`/users/${selectedUser._id}`, formData);
      } else {
        res = await api.post('/users', formData);
      }

      if (res.data.success) {
        setMessage({
          type: 'success',
          title: 'Kullanıcı & İstasyon Mail Ayarları Kaydedildi',
          text: res.data.message
        });
        setModalOpen(false);
        loadUsersAndSettings();
      }
    } catch (err) {
      setMessage({
        type: 'danger',
        title: 'Kaydetme Hatası',
        text: 'Kaydetme hatası: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    try {
      const res = await api.put('/users/notification-settings', settings);
      if (res.data.success) {
        setSettings(res.data.settings);
        showNotification(
          'success',
          'Genel Mail Ayarları Kaydedildi',
          res.data.message
        );
      }
    } catch (err) {
      showNotification(
        'danger',
        'Ayarlar Kaydedilemedi',
        err.response?.data?.message || err.message
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendGeneralTestEmail = async () => {
    setTestingGeneralMail(true);
    setGeneralTestStatus(null);
    setMessage(null);
    try {
      const res = await api.post('/users/notification-settings/send-test-email', settings);
      if (res.data.settings) {
        setSettings(res.data.settings);
      }
      const isOk = Boolean(res.data.emailDeliverySuccess);
      setGeneralTestStatus({
        status: isOk ? 'success' : 'error',
        message: res.data.message
      });
      showNotification(
        isOk ? 'success' : 'danger',
        isOk ? 'E-Posta Gönderimi Başarılı' : 'E-Posta Gönderimi Başarısız',
        res.data.message
      );
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Genel test e-postası gönderilemedi.';
      setGeneralTestStatus({
        status: 'error',
        message: errMsg
      });
      showNotification('danger', 'E-Posta Gönderimi Başarısız', errMsg);
    } finally {
      setTestingGeneralMail(false);
    }
  };

  const handleSendUserTestEmail = async (u) => {
    setTestEmailStatus(prev => ({ ...prev, [u._id]: { status: 'sending' } }));
    try {
      const res = await api.post(`/users/${u._id}/send-test-email`);
      const isOk = Boolean(res.data.emailDeliverySuccess);
      setTestEmailStatus(prev => ({
        ...prev,
        [u._id]: {
          status: isOk ? 'success' : 'error',
          message: res.data.message
        }
      }));
      showNotification(
        isOk ? 'success' : 'danger',
        isOk ? 'E-Posta Gönderimi Başarılı' : 'E-Posta Gönderimi Başarısız',
        res.data.message
      );
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'E-posta gönderilemedi';
      setTestEmailStatus(prev => ({
        ...prev,
        [u._id]: {
          status: 'error',
          message: errMsg
        }
      }));
      showNotification('danger', 'E-Posta Gönderimi Başarısız', errMsg);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Floating Toast Notification for Email Delivery Success / Failure */}
      {message && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-md rounded-2xl p-4 shadow-xl ring-1 flex items-start gap-3 transition-all ${
            message.type === 'success'
              ? 'bg-emerald-600 text-white ring-emerald-700'
              : 'bg-rose-600 text-white ring-rose-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-white" />
          ) : (
            <XCircle size={20} className="shrink-0 mt-0.5 text-white" />
          )}
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-bold text-sm">
              {message.title || (message.type === 'success' ? 'E-Posta Gönderimi Başarılı' : 'E-Posta Gönderimi Başarısız')}
            </div>
            <p className="mt-1 text-white/95 break-words leading-relaxed">{message.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Kullanıcı Yönetimi & E-Posta Alıcı Ayarları
            </h1>
            <p className="text-xs text-slate-500">
              İstasyon bazlı TO / CC e-posta adresleri ve genel mail (Genel TO / Genel CC / SMTP) ayarları
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Yeni Kullanıcı & İstasyon Alıcısı Ekle</span>
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl p-4 text-xs font-medium flex items-center justify-between gap-3 ring-1 ring-inset overflow-hidden ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 ring-emerald-600/25'
              : 'bg-rose-50 text-rose-900 ring-rose-600/25'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {message.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <XCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm">
                {message.title || (message.type === 'success' ? 'E-Posta Gönderimi Başarılı' : 'E-Posta Gönderimi Başarısız')}
              </div>
              <div className="break-words mt-0.5">{message.text}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SECTION 1: Per-Station / User TO & CC Recipients Table */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              İstasyon Bazlı Kullanıcı ve TO / CC Mail Ayarları ({users.length})
            </h2>
            <p className="text-xs text-slate-500">
              Her istasyon özelinde ayrı TO ve CC e-posta adresleri ekleyebilir ve istasyon bazlı test maili gönderebilirsiniz
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="py-3 pl-6 pr-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ad Soyad / Kullanıcı</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bağlı İstasyon</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">İstasyon TO Mail Adresleri</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">İstasyon CC Mail Adresleri</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Mail Bildirimi</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Durum</th>
                  <th className="py-3 pl-3 pr-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {users.map((u) => {
                  const toList = u.toEmails || [];
                  const ccList = u.ccEmails || [];
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">{u.fullName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <code className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{u.username}</code>
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                              <Shield size={10} />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              <User size={10} />
                              <span>İstasyon</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-xs font-semibold text-slate-700">
                        {u.assignedStation?.name ? (
                          <div>
                            <span className="text-blue-700 font-bold">{u.assignedStation.name}</span>
                            <span className="block text-[11px] font-mono text-slate-400">{u.stationU}</span>
                          </div>
                        ) : u.stationU ? (
                          <span className="text-blue-700 font-bold">{u.stationU}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">Tüm İstasyonlar (Genel)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        {toList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {toList.map((mail) => (
                              <span
                                key={mail}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 break-all"
                              >
                                <Mail size={11} className="shrink-0" />
                                <span>{mail}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEdit(u)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>TO Mail Ekle</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        {ccList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ccList.map((mail) => (
                              <span
                                key={mail}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 break-all"
                              >
                                <Mail size={11} className="shrink-0" />
                                <span>{mail}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEdit(u)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>CC Mail Ekle</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {u.emailNotificationsEnabled !== false ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Açık
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            Kapalı
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {u.isActive ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-300">
                            Pasif
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={testEmailStatus[u._id]?.status === 'sending'}
                              onClick={() => handleSendUserTestEmail(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 ring-1 ring-inset ring-indigo-600/20 disabled:opacity-50 transition-colors cursor-pointer"
                              title="Bu istasyonun TO ve CC adreslerine test kontrol e-postası gönder"
                            >
                              <Send size={13} />
                              <span>
                                {testEmailStatus[u._id]?.status === 'sending' ? 'Gönderiliyor...' : 'Test Gönder'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-600/20 transition-colors cursor-pointer"
                              title="İstasyon TO / CC Mail Adreslerini ve Kullanıcıyı Düzenle"
                            >
                              <Mail size={13} />
                              <span>Mail / Düzenle</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 ring-1 ring-inset ring-rose-200 cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {testEmailStatus[u._id] && testEmailStatus[u._id].status !== 'sending' && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                                testEmailStatus[u._id].status === 'success'
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30'
                                  : 'bg-rose-50 text-rose-700 ring-1 ring-rose-500/30'
                              }`}
                              title={testEmailStatus[u._id].message}
                            >
                              {testEmailStatus[u._id].status === 'success' ? (
                                <>
                                  <CheckCircle2 size={12} />
                                  <span>E-posta gönderimi başarılı</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} />
                                  <span>E-posta gönderimi başarısız</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Dedicated General Mail Settings, General TO & General CC Card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 flex items-center justify-center shrink-0">
              <Server size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Genel Mail Ayarları, Genel TO ve Genel CC Alıcıları
              </h2>
              <p className="text-xs text-slate-500">
                Tüm istasyonlar için genel TO / genel CC e-posta alıcıları, SMTP sunucu bilgileri ve test maili gönderimi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={testingGeneralMail}
              onClick={handleSendGeneralTestEmail}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 ring-1 ring-inset ring-indigo-600/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send size={14} />
              <span>{testingGeneralMail ? 'Test Maili Gönderiliyor...' : 'Genel Test Maili Gönder'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="p-5 sm:p-6 space-y-6">
          {/* Inline General Test Email Result Banner */}
          {generalTestStatus && (
            <div
              className={`rounded-xl p-3.5 text-xs font-medium flex items-start justify-between gap-3 ring-1 ring-inset ${
                generalTestStatus.status === 'success'
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-600/25'
                  : 'bg-rose-50 text-rose-900 ring-rose-600/25'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {generalTestStatus.status === 'success' ? (
                  <CheckCircle2 size={17} className="shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <XCircle size={17} className="shrink-0 text-rose-600 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="font-bold">
                    {generalTestStatus.status === 'success'
                      ? 'E-Posta Gönderimi Başarılı'
                      : 'E-Posta Gönderimi Başarısız'}
                  </div>
                  <div className="mt-0.5 break-words">{generalTestStatus.message}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneralTestStatus(null)}
                className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Genel TO & Genel CC Multi-Email Boxes */}
          <div className="rounded-xl bg-slate-50/70 p-4 sm:p-5 ring-1 ring-slate-200/90 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Genel TO ve Genel CC E-Posta Alıcıları
              </h3>
              <p className="text-[11px] text-slate-500">
                İstasyon özelindeki maillere ek olarak genel raporların ve test mailinin gönderileceği TO ve CC adresleri (birden çok adres ekleyebilirsiniz)
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <MultiEmailTagBox
                label="Genel TO Mail Adresleri (Birden Çok Eklenebilir)"
                badgeColor="blue"
                emails={settings.adminToEmails || []}
                onChange={(adminToEmails) => setSettings({ ...settings, adminToEmails })}
                placeholder="Örn: gaz.kontrol@sirket.com, yonetim@sirket.com"
              />

              <MultiEmailTagBox
                label="Genel CC Mail Adresleri (Birden Çok Eklenebilir)"
                badgeColor="indigo"
                emails={settings.adminCcEmails || []}
                onChange={(adminCcEmails) => setSettings({ ...settings, adminCcEmails })}
                placeholder="Örn: direktor@sirket.com, arsiv@sirket.com"
              />
            </div>
          </div>

          {/* Genel Mail Sunucu (SMTP) ve Gönderim Ayarları */}
          <div className="rounded-xl bg-slate-50 p-4 sm:p-5 ring-1 ring-slate-200 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Genel E-Posta Sunucu (SMTP) ve Gönderim Ayarları
              </h3>
              <p className="text-[11px] text-slate-500">
                E-postaların gönderileceği kurumsal SMTP sunucu bilgileri ve günlük gönderim saati
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  placeholder="Örn: smtp.office365.com"
                  value={settings.smtpHost || ''}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  className="w-full rounded-xl border-0 py-2 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  placeholder="587"
                  value={settings.smtpPort || 587}
                  onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) || 587 })}
                  className="w-full rounded-xl border-0 py-2 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Kullanıcı / E-Posta</label>
                <input
                  type="text"
                  placeholder="noreply@sirket.com"
                  value={settings.smtpUser || ''}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  className="w-full rounded-xl border-0 py-2 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Şifre</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={settings.smtpPass || ''}
                  onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                  className="w-full rounded-xl border-0 py-2 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gönderici Adı (From Name)</label>
                <input
                  type="text"
                  placeholder="Gaz Alım Takip Sistemi"
                  value={settings.fromName || ''}
                  onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                  className="w-full rounded-xl border-0 py-2 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gönderici E-Posta (From Email)</label>
                <input
                  type="text"
                  placeholder="noreply@sirket.com"
                  value={settings.fromEmail || ''}
                  onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                  className="w-full rounded-xl border-0 py-2 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock size={13} className="text-blue-600" />
                  <span>Günlük Otomatik Mail Saati</span>
                </label>
                <input
                  type="time"
                  value={settings.dailyRunTime || '09:30'}
                  onChange={(e) => setSettings({ ...settings, dailyRunTime: e.target.value })}
                  className="w-full rounded-xl border-0 py-2 px-3 text-xs font-bold text-slate-900 ring-1 ring-inset ring-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex flex-col justify-end pb-1">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Günlük Otomatik Gönderim Aktif
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Save & Test Buttons Row */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={testingGeneralMail}
              onClick={handleSendGeneralTestEmail}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 ring-1 ring-inset ring-indigo-600/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send size={15} />
              <span>{testingGeneralMail ? 'Test Maili Gönderiliyor...' : 'Genel Test Maili Gönder'}</span>
            </button>

            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save size={15} />
              <span>{savingSettings ? 'Kaydediliyor...' : 'Genel Mail Ayarlarını Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>

      <UserModal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
        loading={saveLoading}
      />
    </div>
  );
}
