import React, { useState, useEffect } from 'react';
import { 
  History, Search, FileSpreadsheet, Eye, FileText, RefreshCw, 
  Upload, AlertCircle, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import ReadingVerificationPage from './ReadingVerificationPage';

const getDefaultDates = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const endStr = d.toISOString().split('T')[0];
  
  const startD = new Date(d.getFullYear(), d.getMonth(), 1);
  const startStr = startD.toISOString().split('T')[0];
  return { startStr, endStr };
};

export default function ArchivePage() {
  const { user, isAdmin } = useAuth();
  const { startStr, endStr } = getDefaultDates();

  const [history, setHistory] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState(startStr);
  const [endDate, setEndDate] = useState(endStr);
  const [message, setMessage] = useState(null);

  const [activeReadingPage, setActiveReadingPage] = useState(null);

  useEffect(() => {
    api.get('/stations').then((res) => {
      if (res.data.success) setStations(res.data.stations);
    });
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedStation) params.append('u', selectedStation);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/readings/history?${params.toString()}`);
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Geçmiş veriler alınamadı: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchLiveRange = async () => {
    if (!startDate || !endDate) {
      setMessage({ type: 'warning', text: 'Lütfen başlangıç ve bitiş tarihlerini seçiniz.' });
      return;
    }

    setFetchingLive(true);
    setMessage(null);
    try {
      const payload = {
        startDate,
        endDate,
        u: !isAdmin && user?.stationU ? user.stationU : selectedStation
      };

      const res = await api.post('/readings/fetch-range', payload);
      if (res.data.success) {
        setHistory(res.data.history);
        setMessage({ type: 'success', text: res.data.message || 'Geçmiş veriler Aksa RMSA üzerinden başarıyla çekildi!' });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Aksa geçmiş veri çekme hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setFetchingLive(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = history.map((r, idx) => ({
      'No': idx + 1,
      'İstasyon Adı': r.stationName,
      'Kullanıcı Kodu': r.u,
      'Gaz Günü': r.gasDate,
      '5 Nolu Tüketim (Sm³)': r.consumption || 0,
      '6 Nolu Enerji (kcal)': r.energy || 0,
      '7 Nolu Isıl Değer (Ho)': r.superiorHeatingValue || 0,
      'Basınç (Bar)': r.pressure || 0,
      'Sıcaklık (°C)': r.temperature || 0,
      'Durum': r.status === 'APPROVED' ? 'ONAYLANDI' : r.status === 'DENIED' ? 'REDDEDİLDİ' : 'BEKLEMEDE',
      'Yüklü Dosya Sayısı': r.files ? r.files.length : 0,
      'İşlem Yapan': r.approvalInfo?.actionBy || '',
      'İşlem Tarihi ve Saati': r.approvalInfo?.actionAt ? new Date(r.approvalInfo.actionAt).toLocaleString('tr-TR') : '',
      'Açıklama / Not': r.operatorNote || r.approvalInfo?.notes || r.approvalInfo?.rejectionReason || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gecmis_Gaz_Okumalari');
    XLSX.writeFile(wb, `Gecmis_Gaz_Okumalari_${startDate}_${endDate}.xlsx`);
  };

  const totalPeriodSm3 = history.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalPeriodEnergyKcal = history.reduce((sum, r) => sum + (Number(r.energy) || 0), 0);

  if (activeReadingPage) {
    return (
      <ReadingVerificationPage
        reading={activeReadingPage}
        onBack={() => setActiveReadingPage(null)}
        onReadingUpdated={(updated) => {
          setHistory(prev => prev.map(h => (h._id === updated._id ? updated : h)));
          setActiveReadingPage(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Tremor Filter Header Card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Geçmiş Okuma Arşivi & Raporlar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin 
              ? 'Tüm istasyonlar için tarih aralıklı geçmiş sorgulama ve Aksa RMS-A canlı veri çekme' 
              : `${user?.assignedStation?.name || user?.stationU?.toUpperCase() || ''} İstasyonu Geçmiş Kayıtları`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border-0 py-2 px-3 text-xs font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border-0 py-2 px-3 text-xs font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">İstasyon</label>
            <select
              value={!isAdmin && user?.stationU ? user.stationU : selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              disabled={!isAdmin && !!user?.stationU}
              className="w-full rounded-lg border-0 py-2 px-3 text-xs font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none bg-white disabled:bg-slate-50"
            >
              {isAdmin && <option value="">Tüm İstasyonlar</option>}
              {stations
                .filter(st => isAdmin || !user?.stationU || st.u === user.stationU)
                .map((st) => (
                  <option key={st._id} value={st.u}>{st.name}</option>
                ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Onay Durumu</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border-0 py-2 px-3 text-xs font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
            >
              <option value="">Tümü</option>
              <option value="APPROVED">Onaylanan</option>
              <option value="PENDING">Beklemede</option>
              <option value="DENIED">Reddedilen</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={fetchHistory}
              disabled={loading || fetchingLive}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer"
            >
              <Search size={14} />
              <span>Ara</span>
            </button>

            <button
              type="button"
              onClick={handleFetchLiveRange}
              disabled={loading || fetchingLive}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={fetchingLive ? 'spin' : ''} />
              <span>{fetchingLive ? 'Çekiliyor...' : 'Aksa’dan Canlı Getir'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={history.length === 0}
              className="inline-flex items-center justify-center p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-600/20 disabled:opacity-40 transition-colors cursor-pointer"
              title="Excel Olarak İndir"
            >
              <FileSpreadsheet size={16} />
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl p-3.5 text-xs font-medium flex items-center justify-between ring-1 ring-inset ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
              : message.type === 'warning'
              ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
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

      {/* Tremor Period KPI Summary */}
      {history.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-5">
            <span className="text-xs font-medium text-slate-500">Dönem Toplam Tüketim (Sm³)</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {totalPeriodSm3.toLocaleString('tr-TR')}
              </span>
              <span className="text-xs text-slate-400">Sm³</span>
            </div>
          </div>

          <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-5">
            <span className="text-xs font-medium text-slate-500">Dönem Toplam Enerji (kcal)</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {totalPeriodEnergyKcal.toLocaleString('tr-TR')}
              </span>
              <span className="text-xs text-slate-400">kcal</span>
            </div>
          </div>

          <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-5">
            <span className="text-xs font-medium text-slate-500">Listelenen Toplam Kayıt</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
                {history.length}
              </span>
              <span className="text-xs text-slate-400">Gün / Kayıt</span>
            </div>
          </div>
        </div>
      )}

      {/* Results Table Card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Geçmiş Kayıt Listesi ({history.length})</h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md tabular-nums">
            {startDate} &rarr; {endDate}
          </span>
        </div>

        {loading || fetchingLive ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-xs font-medium text-slate-500">
              {fetchingLive ? 'Seçili tarih aralığındaki günler Aksa RMS-A üzerinden sorgulanıyor...' : 'Kayıtlar yükleniyor...'}
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-14 text-center px-4">
            <p className="text-xs text-slate-500 mb-3">Seçilen tarih aralığı için kayıt bulunamadı.</p>
            <button
              type="button"
              onClick={handleFetchLiveRange}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Bu Tarih Aralığını Aksa'dan Canlı Çek</span>
            </button>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-3 pl-6 pr-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gaz Günü</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">İstasyon</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">5 - Tüketim (Sm³)</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">6 - Enerji (kcal)</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">7 - Isıl Değer (Ho)</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Basınç / Sıcaklık</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Durum</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Rapor</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Not</th>
                    <th className="py-3 pl-3 pr-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {history.map((reading) => (
                    <tr key={reading._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6 pr-3 text-xs font-bold text-slate-900 tabular-nums">{reading.gasDate}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900 text-xs">{reading.stationName}</div>
                        <span className="text-[11px] font-mono text-slate-500">{reading.u}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {reading.consumption !== null && reading.consumption !== undefined
                          ? Number(reading.consumption).toLocaleString('tr-TR')
                          : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-slate-700 tabular-nums">
                        {reading.energy !== null && reading.energy !== undefined
                          ? Number(reading.energy).toLocaleString('tr-TR')
                          : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center tabular-nums">
                        {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-semibold text-slate-900">{Number(reading.superiorHeatingValue).toLocaleString('tr-TR')}</span>
                            {reading.isSubstitutedSHV && (
                              <span className="mt-0.5 inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                                7 Nolu İkame
                              </span>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center tabular-nums">
                        <div className="text-xs font-semibold text-slate-800">{reading.pressure ? `${reading.pressure} Bar` : '—'}</div>
                        <div className="text-[11px] text-slate-500">{reading.temperature ? `${reading.temperature} °C` : '—'}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {reading.status === 'APPROVED' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              Onaylandı
                            </span>
                            {reading.approvalInfo?.actionAt && (
                              <span className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                                {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}
                        {reading.status === 'DENIED' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              Reddedildi
                            </span>
                            {reading.approvalInfo?.actionAt && (
                              <span className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                                {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}
                        {reading.status === 'PENDING' && (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Beklemede
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {reading.files && reading.files.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setActiveReadingPage(reading)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-600/20 cursor-pointer"
                          >
                            <FileText size={13} />
                            <span>{reading.files.length} Rapor</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveReadingPage(reading)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 ring-1 ring-inset ring-slate-200 cursor-pointer"
                          >
                            <Upload size={13} />
                            <span>Yükle</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">
                        {reading.operatorNote && (
                          <span title={reading.operatorNote}>
                            📝 {reading.operatorNote.length > 30 ? reading.operatorNote.slice(0, 30) + '...' : reading.operatorNote}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveReadingPage(reading)}
                          className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 ring-1 ring-inset ring-slate-200 cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="md:hidden divide-y divide-slate-200">
              {history.map((reading) => {
                const isApproved = reading.status === 'APPROVED';
                const isDenied = reading.status === 'DENIED';
                const hasFiles = reading.files && reading.files.length > 0;

                return (
                  <div key={reading._id} className="p-4 bg-white space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          type="button"
                          onClick={() => setActiveReadingPage(reading)}
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 text-left"
                        >
                          {reading.stationName}
                        </button>
                        <p className="text-xs text-slate-500 mt-0.5">
                          📅 <strong className="text-slate-700">{reading.gasDate}</strong> • <span className="font-mono">{reading.u}</span>
                        </p>
                      </div>
                      {isApproved && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">Onaylandı</span>}
                      {isDenied && <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20">Reddedildi</span>}
                      {!isApproved && !isDenied && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">Beklemede</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 rounded-xl p-2.5 ring-1 ring-slate-200/70">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">5-Tüketim</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {reading.consumption !== null ? `${Number(reading.consumption).toLocaleString('tr-TR')} Sm³` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 ring-1 ring-slate-200/70">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">6-Enerji</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {reading.energy !== null ? `${Number(reading.energy).toLocaleString('tr-TR')} kcal` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveReadingPage(reading)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 ring-1 ring-blue-600/20"
                      >
                        <Eye size={14} />
                        <span>{hasFiles ? `Rapor & Detay (${reading.files.length})` : 'Detay İncele'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveReadingPage(reading)}
                        className="p-2 rounded-xl text-slate-600 bg-slate-100 ring-1 ring-slate-200"
                      >
                        <Upload size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
