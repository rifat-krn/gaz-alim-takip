import React, { useState, useEffect } from 'react';
import { Database, Plus, Edit2, Trash2, RefreshCw, PlayCircle, AlertCircle, X } from 'lucide-react';
import api from '../api/axiosClient';
import StationModal from '../components/StationModal';

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [testStatus, setTestStatus] = useState({});
  const [message, setMessage] = useState(null);

  const loadStations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stations');
      if (res.data.success) {
        setStations(res.data.stations);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'İstasyonlar yüklenemedi: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleCreate = () => {
    setSelectedStation(null);
    setModalOpen(true);
  };

  const handleEdit = (st) => {
    setSelectedStation(st);
    setModalOpen(true);
  };

  const handleDelete = async (st) => {
    if (!window.confirm(`'${st.name}' istasyonunu silmek istediğinizden emin misiniz?`)) return;

    try {
      const res = await api.delete(`/stations/${st._id}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'İstasyon silindi' });
        loadStations();
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Silme hatası: ' + (err.response?.data?.message || err.message) });
    }
  };

  const handleSave = async (formData) => {
    setSaveLoading(true);
    try {
      let res;
      if (selectedStation) {
        res = await api.put(`/stations/${selectedStation._id}`, formData);
      } else {
        res = await api.post('/stations', formData);
      }

      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        setModalOpen(false);
        loadStations();
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Kaydetme hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSyncJson = async () => {
    setSyncLoading(true);
    setMessage(null);
    try {
      const res = await api.post('/stations/sync-json');
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        loadStations();
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Senkronizasyon hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleTestLogin = async (st) => {
    setTestStatus(prev => ({ ...prev, [st._id]: { loading: true } }));
    try {
      const res = await api.post(`/stations/${st._id}/test-login`);
      setTestStatus(prev => ({
        ...prev,
        [st._id]: { loading: false, success: res.data.success, message: res.data.message }
      }));
    } catch (err) {
      setTestStatus(prev => ({
        ...prev,
        [st._id]: { loading: false, success: false, message: err.response?.data?.message || err.message }
      }));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 flex items-center justify-center">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">İstasyon Yönetimi</h1>
            <p className="text-xs text-slate-500">Aksa RMS-A istasyon bağlantı ve kimlik bilgileri yönetimi</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncJson}
            disabled={syncLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={syncLoading ? 'spin' : ''} />
            <span>JSON'dan İçe Aktar</span>
          </button>

          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Yeni İstasyon Ekle</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl p-3.5 text-xs font-medium flex items-center justify-between ring-1 ring-inset ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
              : 'bg-rose-50 text-rose-800 ring-rose-600/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{message.text}</span>
          </div>
          <button type="button" onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Stations Table Card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Kayıtlı İstasyonlar ({stations.length})</h2>
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
                  <th className="py-3 pl-6 pr-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-16">Sıra</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">İstasyon Tanımı</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">OYS Kullanıcı (u)</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">OYS Şifre (p)</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Açıklama</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Durum</th>
                  <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Bağlantı Testi</th>
                  <th className="py-3 pl-3 pr-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {stations.map((st) => {
                  const test = testStatus[st._id];
                  return (
                    <tr key={st._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6 pr-3 text-xs font-bold text-slate-500 tabular-nums">{st.order}</td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900 text-xs sm:text-sm">{st.name}</td>
                      <td className="py-3.5 px-3">
                        <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800">{st.u}</code>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 text-xs font-mono">••••••••</td>
                      <td className="py-3.5 px-3 text-xs text-slate-500">{st.description || '—'}</td>
                      <td className="py-3.5 px-3 text-center">
                        {st.isActive ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-300">
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          disabled={test?.loading}
                          onClick={() => handleTestLogin(st)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-600/20 cursor-pointer"
                        >
                          <PlayCircle size={13} />
                          <span>{test?.loading ? 'Test ediliyor...' : 'Test Et'}</span>
                        </button>
                        {test && !test.loading && (
                          <div className="mt-1 text-[11px]">
                            {test.success ? (
                              <span className="text-emerald-600 font-semibold">✓ Başarılı</span>
                            ) : (
                              <span className="text-rose-600">✗ {test.message}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(st)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 ring-1 ring-inset ring-slate-200 cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(st)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 ring-1 ring-inset ring-rose-200 cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
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

      <StationModal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        station={selectedStation}
        onSave={handleSave}
        loading={saveLoading}
      />
    </div>
  );
}
