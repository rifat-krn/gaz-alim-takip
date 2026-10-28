import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, CheckCircle2, XCircle, Upload, Eye, FileText, 
  FileSpreadsheet, ChevronLeft, ChevronRight, Search,
  Activity, Flame, Clock, AlertCircle, BarChart3, Check, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api/axiosClient';
import ReadingVerificationPage from './ReadingVerificationPage';

const getDefaultGasDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export default function DailyReadingsPage() {
  const [selectedDate, setSelectedDate] = useState(getDefaultGasDate);
  const [readings, setReadings] = useState([]);
  const [gasInfo, setGasInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchingSingleId, setFetchingSingleId] = useState(null);
  const [message, setMessage] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, APPROVED, PENDING, DENIED, WITH_REPORT
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Full-Page Verification State (replaces modals)
  const [activeReadingPage, setActiveReadingPage] = useState(null);
  const [initialRejectMode, setInitialRejectMode] = useState(false);

  const openVerificationPage = (reading, rejectMode = false) => {
    setInitialRejectMode(rejectMode);
    setActiveReadingPage(reading);
  };

  const fetchAllForDate = async (targetDate) => {
    setFetchingAll(true);
    setMessage(null);
    try {
      const res = await api.post('/readings/fetch-all', { gasDate: targetDate });
      if (res.data.success) {
        setReadings(res.data.readings);
        setGasInfo(res.data.gasInfo);
      }
    } catch (err) {
      try {
        const fallbackRes = await api.get(`/readings/by-date?gasDate=${targetDate}`);
        if (fallbackRes.data.success) {
          setReadings(fallbackRes.data.readings);
          setGasInfo(fallbackRes.data.gasInfo);
        }
      } catch (fallbackErr) {
        // ignore
      }
      setMessage({ type: 'danger', text: 'Canlı veri çekme hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setFetchingAll(false);
    }
  };

  useEffect(() => {
    fetchAllForDate(selectedDate);
  }, [selectedDate]);

  const handleStepDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleFetchAll = () => {
    fetchAllForDate(selectedDate);
  };

  const handleFetchSingle = async (reading) => {
    const stationId = reading.stationId?._id || reading.stationId;
    if (!stationId) return;

    setFetchingSingleId(stationId);
    try {
      const res = await api.post('/readings/fetch-single', {
        stationId,
        gasDate: selectedDate
      });

      if (res.data.success) {
        setReadings(prev => prev.map(r => (r.u === reading.u ? res.data.reading : r)));
        setMessage({ type: 'success', text: `${reading.stationName} verisi güncellendi.` });
      } else {
        setMessage({ type: 'warning', text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'İstasyon verisi çekilemedi: ' + (err.response?.data?.message || err.message) });
    } finally {
      setFetchingSingleId(null);
    }
  };

  const handleFilesUpdated = (updatedReading) => {
    setReadings(prev => prev.map(r => (r.u === updatedReading.u ? updatedReading : r)));
    if (activeReadingPage && activeReadingPage.u === updatedReading.u) {
      setActiveReadingPage(updatedReading);
    }
  };

  const checkIsSubstituted = (r) => {
    if (!r) return false;
    const d = r.rawData?.data || {};
    const st = r.rawData?.station || {};
    const hasRawSelection =
      d.fld_OperatorSHVSelection !== undefined ||
      d[25] !== undefined ||
      d.fld_SHVSelection !== undefined ||
      d[36] !== undefined ||
      st.fld_OrganizationSHVSelection !== undefined ||
      st[33] !== undefined;

    if (hasRawSelection) {
      if (d.fld_OperatorSHVSelection !== undefined && d.fld_OperatorSHVSelection !== null && Number(d.fld_OperatorSHVSelection) === 0) return true;
      if (d[25] !== undefined && d[25] !== null && Number(d[25]) === 0) return true;
      if (d.fld_SHVSelection !== undefined && d.fld_SHVSelection !== null && Number(d.fld_SHVSelection) === 0) return true;
      if (d[36] !== undefined && d[36] !== null && Number(d[36]) === 0) return true;
      if (st.fld_OrganizationSHVSelection !== undefined && st.fld_OrganizationSHVSelection !== null && Number(st.fld_OrganizationSHVSelection) === 0) return true;
      if (st[33] !== undefined && st[33] !== null && Number(st[33]) === 0) return true;
      if (d.fld_GCOrganizationId !== undefined && d.fld_GCOrganizationId !== null && Number(d.fld_GCOrganizationId) > 0) return true;
      return false;
    }

    return Boolean(r.isSubstitutedSHV);
  };

  const handleExportExcel = () => {
    const exportData = readings.map((r, idx) => ({
      'No': idx + 1,
      'İstasyon Adı': r.stationName,
      'Kullanıcı Kodu': r.u,
      'Gaz Günü': r.gasDate,
      'dt1 (Başlangıç)': r.dt1,
      'dt3 (Bitiş)': r.dt3,
      'Tüketim (Sm³)': r.consumption || 0,
      'Enerji (kcal)': r.energy || 0,
      'Üst Isıl Değer (Ho)': r.superiorHeatingValue || 0,
      'Isıl Değer Kaynağı': checkIsSubstituted(r) ? 'İKAME VERİ (BAŞKA İSTASYON GC)' : 'KENDİ GC VERİSİ',
      'Basınç (Bar)': r.pressure || 0,
      'Sıcaklık (°C)': r.temperature || 0,
      'Durum': r.status === 'APPROVED' ? 'ONAYLANDI' : r.status === 'DENIED' ? 'REDDEDİLDİ' : 'BEKLEMEDE',
      'İşlem Yapan': r.approvalInfo?.actionBy || '',
      'İşlem Tarihi ve Saati': r.approvalInfo?.actionAt ? new Date(r.approvalInfo.actionAt).toLocaleString('tr-TR') : '',
      'Yüklü Dosya Sayısı': r.files ? r.files.length : 0,
      'Açıklama / Not': r.operatorNote || r.approvalInfo?.notes || r.approvalInfo?.rejectionReason || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Gaz_Okumalari_${selectedDate}`);
    XLSX.writeFile(wb, `Gaz_Alim_Raporu_${selectedDate}.xlsx`);
  };

  // KPI Calculations
  const totalConsumption = readings.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalEnergy = readings.reduce((sum, r) => sum + (Number(r.energy) || 0), 0);
  const approvedCount = readings.filter(r => r.status === 'APPROVED').length;
  const pendingCount = readings.filter(r => r.status === 'PENDING').length;
  const deniedCount = readings.filter(r => r.status === 'DENIED').length;
  const withReportCount = readings.filter(r => r.files && r.files.length > 0).length;
  const substitutedCount = readings.filter(r => checkIsSubstituted(r)).length;
  const approvalProgress = readings.length > 0 ? Math.round((approvedCount / readings.length) * 100) : 0;
  const maxStationConsumption = Math.max(...readings.map(r => Number(r.consumption) || 0), 1);

  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const matchesSearch = !searchQuery.trim() || 
        (r.stationName && r.stationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.u && r.u.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'APPROVED') return r.status === 'APPROVED';
      if (statusFilter === 'PENDING') return r.status === 'PENDING';
      if (statusFilter === 'DENIED') return r.status === 'DENIED';
      if (statusFilter === 'WITH_REPORT') return r.files && r.files.length > 0;
      if (statusFilter === 'SUBSTITUTED') return checkIsSubstituted(r);
      return true;
    });
  }, [readings, searchQuery, statusFilter]);

  // If a station reading is selected for verification/approval, show full page instead of modal
  if (activeReadingPage) {
    return (
      <ReadingVerificationPage
        reading={activeReadingPage}
        initialShowReject={initialRejectMode}
        onBack={() => {
          setActiveReadingPage(null);
          setInitialRejectMode(false);
        }}
        onReadingUpdated={handleFilesUpdated}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Tremor Control Bar */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Title & Date Navigator */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Günlük Gaz Okuma Özeti</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Aksa RMS-A canlı istasyon tüketim, üst ısıl değer ve PDF rapor kontrol paneli
              </p>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            {/* Date Stepper */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStepDate(-1)}
                disabled={fetchingAll}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 ring-1 ring-inset ring-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
                title="Önceki Gün"
              >
                <ChevronLeft size={16} />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border-0 py-1.5 px-3 text-xs font-bold text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
              />

              <button
                type="button"
                onClick={() => handleStepDate(1)}
                disabled={fetchingAll}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 ring-1 ring-inset ring-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
                title="Sonraki Gün"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getDefaultGasDate())}
                disabled={fetchingAll}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer"
              >
                Dün
              </button>
            </div>
          </div>

          {/* Right: OYS Period & Primary Buttons */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            {gasInfo && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200/80 text-xs">
                <Clock size={14} className="text-blue-600 shrink-0" />
                <span className="text-slate-500 font-medium hidden xl:inline">Gaz Günü:</span>
                <span className="font-semibold text-slate-800">{gasInfo.dt1}</span>
                <span className="text-slate-400">&rarr;</span>
                <span className="font-semibold text-emerald-700">{gasInfo.dt3}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {readings.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ring-1 ring-inset transition-all cursor-pointer ${
                    showAnalytics
                      ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                  }`}
                  title="Tüketim Dağılım Grafiğini Göster/Gizle"
                >
                  <BarChart3 size={15} />
                  <span className="hidden sm:inline">Analitik</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={readings.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-600/20 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet size={15} />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={handleFetchAll}
                disabled={fetchingAll || loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-2xs disabled:opacity-50 transition-all cursor-pointer"
              >
                <RefreshCw size={15} className={fetchingAll ? 'spin' : ''} />
                <span>{fetchingAll ? 'Sorgulanıyor...' : 'Canlı Veri Çek'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
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

      {/* Tremor 4-Column KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Total Consumption */}
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-5 flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">Toplam Düzeltilmiş Tüketim (5 Nolu)</span>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 shrink-0">
              Sm³
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums break-all">
              {totalConsumption.toLocaleString('tr-TR')}
            </span>
            <span className="text-xs font-medium text-slate-400 shrink-0">Sm³</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Listelenen İstasyon</span>
            <span className="font-semibold text-slate-700">{readings.length} İstasyon</span>
          </div>
        </div>

        {/* KPI 2: Total Energy */}
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-5 flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">Toplam Enerji Miktarı (6 Nolu)</span>
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 shrink-0">
              kcal
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums break-all">
              {totalEnergy.toLocaleString('tr-TR')}
            </span>
            <span className="text-xs font-medium text-slate-400 shrink-0">kcal</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Ort. Üst Isıl Değer (Ho)</span>
            <span className="font-semibold text-slate-700 tabular-nums">
              {readings.some(r => r.superiorHeatingValue)
                ? Math.round(
                    readings.reduce((acc, r) => acc + (Number(r.superiorHeatingValue) || 0), 0) /
                      (readings.filter(r => r.superiorHeatingValue).length || 1)
                  ).toLocaleString('tr-TR') + ' kcal/Sm³'
                : '—'}
            </span>
          </div>
        </div>

        {/* KPI 3: Approval Progress (Tremor ProgressBar + CategoryBar style) */}
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Onay & Doğrulama Oranı</span>
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              %{approvalProgress}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {approvedCount} <span className="text-lg font-normal text-slate-400">/ {readings.length}</span>
            </span>
            <span className="text-xs text-emerald-600 font-medium">Onaylandı</span>
          </div>
          {/* Tremor ProgressBar */}
          <div className="mt-3">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${approvalProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Status & Report Breakdown */}
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kontrol & Rapor Dağılımı</span>
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
              {withReportCount} PDF Rapor
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 pt-1">
            <div className="bg-emerald-50/60 rounded-lg p-2 text-center ring-1 ring-inset ring-emerald-500/15">
              <div className="text-lg font-bold text-emerald-700 tabular-nums leading-none">{approvedCount}</div>
              <div className="text-[10px] font-medium text-emerald-600 mt-1">Onaylı</div>
            </div>
            <div className="bg-amber-50/60 rounded-lg p-2 text-center ring-1 ring-inset ring-amber-500/15">
              <div className="text-lg font-bold text-amber-700 tabular-nums leading-none">{pendingCount}</div>
              <div className="text-[10px] font-medium text-amber-600 mt-1">Bekleyen</div>
            </div>
            <div className="bg-rose-50/60 rounded-lg p-2 text-center ring-1 ring-inset ring-rose-500/15">
              <div className="text-lg font-bold text-rose-700 tabular-nums leading-none">{deniedCount}</div>
              <div className="text-[10px] font-medium text-rose-600 mt-1">Red</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tremor BarList Analytics Panel (Collapsible, shown when multiple stations exist) */}
      {showAnalytics && readings.length > 1 && totalConsumption > 0 && (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">İstasyon Bazlı Tüketim Dağılımı (Tremor BarList)</h2>
              <p className="text-xs text-slate-500">Seçili gaz günündeki düzeltilmiş tüketim (Sm³) karşılaştırması</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">5 Nolu Tüketim (Sm³)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
            {[...readings]
              .sort((a, b) => (Number(b.consumption) || 0) - (Number(a.consumption) || 0))
              .map((r) => {
                const val = Number(r.consumption) || 0;
                const pct = Math.max(Math.round((val / maxStationConsumption) * 100), 2);
                const sharePct = totalConsumption > 0 ? ((val / totalConsumption) * 100).toFixed(1) : '0.0';
                return (
                  <div key={r.u} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{r.stationName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({r.u})</span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="font-bold text-slate-900">{val.toLocaleString('tr-TR')} Sm³</span>
                        <span className="text-[11px] text-slate-400 w-11 text-right">%{sharePct}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-md overflow-hidden">
                      <div
                        className="bg-blue-500/85 group-hover:bg-blue-600 h-full rounded-md transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Main Tremor Table & Mobile Cards Container */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs overflow-hidden">
        {/* Filter Tabs & Search Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Tremor TabList */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Tüm İstasyonlar', count: readings.length },
              { id: 'PENDING', label: 'Kontrol Bekleyen', count: pendingCount },
              { id: 'APPROVED', label: 'Onaylanan', count: approvedCount },
              { id: 'DENIED', label: 'Reddedilen', count: deniedCount },
              { id: 'WITH_REPORT', label: 'PDF Raporlu', count: withReportCount },
              { id: 'SUBSTITUTED', label: 'İkame Veri Kullanan', count: substitutedCount }
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-lg text-[10px] tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İstasyon veya kullanıcı ara..."
              className="w-full rounded-xl border-0 py-2 pl-9 pr-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 outline-none"
            />
          </div>
        </div>

        {/* Content Body */}
        {loading || (fetchingAll && readings.length === 0) ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-xs font-medium text-slate-500">
              İstasyon verileri ve PDF raporları Aksa RMS-A üzerinden sorgulanıyor...
            </p>
          </div>
        ) : filteredReadings.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-500">
            Seçili filtre kriterlerine uygun istasyon kaydı bulunamadı.
          </div>
        ) : (
          <>
            {/* DESKTOP TREMOR TABLE (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-3 pl-6 pr-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-10">#</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">İstasyon</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">5 - Tüketim (Sm³)</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">6 - Enerji (kcal)</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">7 - Üst Isıl (Ho)</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Basınç / Sıcaklık</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Durum & Zaman</th>
                    <th className="py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">Rapor / Belge</th>
                    <th className="py-3 pl-3 pr-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {filteredReadings.map((reading, index) => {
                    const isApproved = reading.status === 'APPROVED';
                    const isDenied = reading.status === 'DENIED';
                    const isPending = reading.status === 'PENDING';
                    const hasFiles = reading.files && reading.files.length > 0;
                    const stationId = reading.stationId?._id || reading.stationId;
                    const isSubstituted = checkIsSubstituted(reading);

                    return (
                      <tr key={reading.u || index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pl-6 pr-2 text-xs font-medium text-slate-400 tabular-nums">
                          {index + 1}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openVerificationPage(reading)}
                              className="font-semibold text-slate-900 hover:text-blue-600 text-xs sm:text-sm text-left transition-colors cursor-pointer"
                            >
                              {reading.stationName}
                            </button>
                            {isSubstituted && (
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/25"
                                title={reading.operatorNote || 'GC olmaması / bakımda olması sebebiyle başka istasyonun ikame ısıl değeri kullanılmıştır (fld_SHVSelection: 0)'}
                              >
                                ⚠️ İkame Veri
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {reading.u}
                            </span>
                            {reading.operatorNote && (
                              <span
                                className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                                title={reading.operatorNote}
                              >
                                📝 {reading.operatorNote.length > 28 ? reading.operatorNote.slice(0, 28) + '...' : reading.operatorNote}
                              </span>
                            )}
                          </div>
                          {reading.fetchStatus?.errorMessage && (
                            <div className="text-[11px] text-rose-600 mt-1">
                              ⚠️ {reading.fetchStatus.errorMessage}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right tabular-nums">
                          <span className="font-bold text-slate-900">
                            {reading.consumption !== null && reading.consumption !== undefined
                              ? Number(reading.consumption).toLocaleString('tr-TR')
                              : <span className="text-slate-300">—</span>}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right tabular-nums">
                          <span className="font-semibold text-slate-700">
                            {reading.energy !== null && reading.energy !== undefined
                              ? Number(reading.energy).toLocaleString('tr-TR')
                              : <span className="text-slate-300">—</span>}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center tabular-nums">
                          {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="font-semibold text-slate-900">
                                {Number(reading.superiorHeatingValue).toLocaleString('tr-TR')}
                              </span>
                              {isSubstituted ? (
                                <span
                                  className="mt-1 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/25"
                                  title="fld_OperatorSHVSelection: 0 / fld_SHVSelection: 0 — Başka istasyonun ısıl değeri (ikame veri) kullanılmıştır"
                                >
                                  ⚠️ İkame Isıl Değer
                                </span>
                              ) : (
                                <span
                                  className="mt-1 inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                  title="fld_OperatorSHVSelection: 1 / fld_SHVSelection: 1 — İstasyonun kendi GC ısıl değeri kullanılmıştır"
                                >
                                  ✓ Kendi GC Verisi
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center tabular-nums">
                          <div className="text-xs font-semibold text-slate-800">
                            {reading.pressure !== null && reading.pressure !== undefined ? `${reading.pressure} Bar` : '—'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {reading.temperature !== null && reading.temperature !== undefined ? `${reading.temperature} °C` : '—'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {isApproved && (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Onaylandı
                              </span>
                              {reading.approvalInfo?.actionAt && (
                                <span className="text-[10px] text-slate-500 mt-1 tabular-nums">
                                  {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {reading.approvalInfo.actionBy && ` (${reading.approvalInfo.actionBy})`}
                                </span>
                              )}
                            </div>
                          )}
                          {isDenied && (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Reddedildi
                              </span>
                              {reading.approvalInfo?.actionAt && (
                                <span className="text-[10px] text-slate-500 mt-1 tabular-nums">
                                  {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {reading.approvalInfo.actionBy && ` (${reading.approvalInfo.actionBy})`}
                                </span>
                              )}
                            </div>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {reading.fetchStatus?.isFetched ? 'Kontrol Bekliyor' : 'Veri Bekleniyor'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {hasFiles ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openVerificationPage(reading)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-600/20 transition-colors cursor-pointer"
                                  title="PDF Raporu ve Verileri Yan Yana İncele"
                                >
                                  <FileText size={13} />
                                  <span>{reading.files.length} Rapor</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openVerificationPage(reading)}
                                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer"
                                  title="Yeni Dosya Ekle"
                                >
                                  <Upload size={13} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openVerificationPage(reading)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer"
                              >
                                <Upload size={13} />
                                <span>Yükle</span>
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 pl-3 pr-6 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openVerificationPage(reading)}
                              className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer"
                              title="Detay & Karşılaştırma Sayfasına Git"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              disabled={fetchingSingleId === stationId}
                              onClick={() => handleFetchSingle(reading)}
                              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 ring-1 ring-inset ring-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
                              title="Bu İstasyonu Tekrar Çek"
                            >
                              <RefreshCw size={15} className={fetchingSingleId === stationId ? 'spin' : ''} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openVerificationPage(reading)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Check size={14} />
                              <span>{isApproved ? 'İncele / Onaylı' : 'Kontrol Et & Onayla'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isDenied}
                              onClick={() => openVerificationPage(reading, true)}
                              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 ring-1 ring-inset ring-rose-200 disabled:opacity-40 transition-colors cursor-pointer"
                              title="Reddet"
                            >
                              <XCircle size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE TREMOR CARDS (below md) */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredReadings.map((reading, index) => {
                const isApproved = reading.status === 'APPROVED';
                const isDenied = reading.status === 'DENIED';
                const hasFiles = reading.files && reading.files.length > 0;
                const stationId = reading.stationId?._id || reading.stationId;

                return (
                  <div key={reading.u || index} className="p-4 bg-white space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => openVerificationPage(reading)}
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 text-left"
                        >
                          {reading.stationName}
                        </button>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{reading.u}</span>
                          <span className="mx-1.5">•</span>
                          <span>{reading.gasDate}</span>
                        </p>
                      </div>
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Onaylandı
                        </span>
                      )}
                      {isDenied && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                          Reddedildi
                        </span>
                      )}
                      {!isApproved && !isDenied && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          Beklemede
                        </span>
                      )}
                    </div>

                    {/* 2x2 Tremor Metric Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-inset ring-slate-200/70">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">5-Tüketim (Sm³)</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums mt-0.5 block">
                          {reading.consumption !== null && reading.consumption !== undefined
                            ? Number(reading.consumption).toLocaleString('tr-TR')
                            : '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-inset ring-slate-200/70">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">6-Enerji (kcal)</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums mt-0.5 block">
                          {reading.energy !== null && reading.energy !== undefined
                            ? Number(reading.energy).toLocaleString('tr-TR')
                            : '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-inset ring-slate-200/70">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">7-Üst Isıl (Ho)</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums mt-0.5 block">
                          {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined
                            ? Number(reading.superiorHeatingValue).toLocaleString('tr-TR')
                            : '—'}
                        </span>
                        {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined && (
                          checkIsSubstituted(reading) ? (
                            <span className="mt-1 inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/25">
                              ⚠️ İkame Veri
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              ✓ Kendi GC
                            </span>
                          )
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-inset ring-slate-200/70">
                        <span className="text-[10px] font-semibold uppercase text-slate-500 block">Basınç / Sıcaklık</span>
                        <span className="text-xs font-semibold text-slate-800 tabular-nums mt-1 block">
                          {reading.pressure ?? '—'} Bar / {reading.temperature ?? '—'} °C
                        </span>
                      </div>
                    </div>

                    {reading.operatorNote && (
                      <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 ring-1 ring-inset ring-blue-600/20">
                        📝 {reading.operatorNote}
                      </div>
                    )}

                    {reading.approvalInfo?.actionAt && (
                      <div className="text-[11px] text-slate-500">
                        ⏱️ İşlem: {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR')} ({reading.approvalInfo.actionBy})
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openVerificationPage(reading)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-600/20"
                      >
                        <Eye size={14} />
                        <span>{hasFiles ? `Rapor & İncele (${reading.files.length})` : 'İncele'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openVerificationPage(reading)}
                        className="p-2 rounded-xl text-slate-600 bg-slate-100 ring-1 ring-inset ring-slate-200"
                        title="Dosya Yükle"
                      >
                        <Upload size={15} />
                      </button>

                      <button
                        type="button"
                        disabled={fetchingSingleId === stationId}
                        onClick={() => handleFetchSingle(reading)}
                        className="p-2 rounded-xl text-slate-600 bg-slate-100 ring-1 ring-inset ring-slate-200"
                      >
                        <RefreshCw size={15} className={fetchingSingleId === stationId ? 'spin' : ''} />
                      </button>

                      <button
                        type="button"
                        onClick={() => openVerificationPage(reading)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600"
                      >
                        <Check size={14} />
                        <span>{isApproved ? 'Onaylı' : 'Onayla'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isDenied}
                        onClick={() => openVerificationPage(reading, true)}
                        className="p-2 rounded-xl text-rose-600 bg-rose-50 ring-1 ring-inset ring-rose-500/20 disabled:opacity-40"
                      >
                        <XCircle size={15} />
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
