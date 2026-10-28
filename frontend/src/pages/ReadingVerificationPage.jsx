import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, XCircle, FileText, UploadCloud, 
  Download, Trash2, ExternalLink, File, Activity, Flame, 
  Gauge, Scale, Clock, RefreshCw, AlertCircle, Check, Calendar, X, Copy
} from 'lucide-react';
import api from '../api/axiosClient';

export default function ReadingVerificationPage({ 
  reading: initialReading, 
  initialShowReject = false,
  onBack, 
  onReadingUpdated 
}) {
  const [reading, setReading] = useState(initialReading);
  const [activeTab, setActiveTab] = useState('measurements');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(initialShowReject);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopyRawJson = async () => {
    const jsonText = JSON.stringify(reading?.rawData || reading, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = jsonText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  useEffect(() => {
    setReading(initialReading);
    setSelectedFileIndex(0);
    setSelectedFiles([]);
    setError('');
    setSuccessMsg('');
    setShowRejectBox(initialShowReject);
    setNotes(initialReading?.approvalInfo?.notes || '');
    setRejectionReason(initialReading?.approvalInfo?.rejectionReason || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialReading?._id, initialReading?.u, initialReading?.gasDate, initialShowReject]);

  if (!reading) return null;

  const comp = reading.composition || {};
  const files = reading.files || [];
  const hasFiles = files.length > 0;
  const activeFile = hasFiles ? (files[selectedFileIndex] || files[0]) : null;
  const isPdf = activeFile && (
    (activeFile.filename && activeFile.filename.toLowerCase().endsWith('.pdf')) ||
    (activeFile.originalName && activeFile.originalName.toLowerCase().endsWith('.pdf')) ||
    (activeFile.mimeType && activeFile.mimeType.includes('pdf'))
  );
  const isImage = activeFile && (
    (activeFile.mimeType && activeFile.mimeType.startsWith('image/')) ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(activeFile.filename || activeFile.originalName || '')
  );

  const updateLocalAndParent = (updated) => {
    setReading(updated);
    if (onReadingUpdated) {
      onReadingUpdated(updated);
    }
  };

  // Re-fetch live from Aksa RMSA for this station & date
  const handleRefreshStation = async () => {
    const stationId = reading.stationId?._id || reading.stationId;
    if (!stationId) return;

    setRefreshing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/readings/fetch-single', {
        stationId,
        gasDate: reading.gasDate
      });
      if (res.data.success) {
        updateLocalAndParent(res.data.reading);
        setSuccessMsg('İstasyon verileri ve raporları Aksa RMSA üzerinden güncellendi.');
      } else {
        setError(res.data.message || 'Veri güncellenemedi.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Bağlantı hatası');
    } finally {
      setRefreshing(false);
    }
  };

  // Approve reading
  const handleApprove = async () => {
    if (!reading._id) {
      setError('Bu istasyon için henüz okuma kaydı oluşturulmamış. Lütfen önce "Veriyi Yenile" butonuna tıklayın.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/readings/${reading._id}/approve`, { notes });
      if (res.data.success) {
        updateLocalAndParent(res.data.reading);
        setSuccessMsg(`${reading.stationName} okuması başarıyla ONAYLANDI!`);
        setShowRejectBox(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Onaylama sırasında hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  // Deny reading
  const handleDeny = async () => {
    if (!reading._id) {
      setError('Bu istasyon için henüz okuma kaydı oluşturulmamış.');
      return;
    }
    if (!rejectionReason.trim()) {
      setError('Lütfen ret sebebini belirtiniz.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/readings/${reading._id}/deny`, {
        rejectionReason: rejectionReason.trim(),
        notes
      });
      if (res.data.success) {
        updateLocalAndParent(res.data.reading);
        setSuccessMsg(`${reading.stationName} okuması REDDEDİLDİ olarak işaretlendi.`);
        setShowRejectBox(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Reddetme sırasında hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  // Upload files
  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Lütfen yüklenecek dosyayı seçiniz.');
      return;
    }

    const formData = new FormData();
    formData.append('u', reading.u);
    formData.append('stationName', reading.stationName);
    formData.append('gasDate', reading.gasDate);

    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.post('/readings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSuccessMsg('Rapor dosyası başarıyla yüklendi!');
        setSelectedFiles([]);
        updateLocalAndParent(res.data.reading);
        setSelectedFileIndex((res.data.reading.files?.length || 1) - 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Dosya yükleme hatası');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Bu rapor dosyasını silmek istediğinizden emin misiniz?')) return;

    try {
      const res = await api.delete(`/readings/${reading._id}/file/${fileId}`);
      if (res.data.success) {
        setSelectedFileIndex(0);
        updateLocalAndParent({ ...reading, files: res.data.files });
        setSuccessMsg('Dosya silindi.');
      }
    } catch (err) {
      setError('Dosya silinirken hata oluştu');
    }
  };

  const safeStation = String(reading.u || reading.stationName || 'istasyon')
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const yearMonth = reading.gasDate ? reading.gasDate.substring(0, 7) : '';

  const isApproved = reading.status === 'APPROVED';
  const isDenied = reading.status === 'DENIED';

  return (
    <div className="space-y-5 pb-8">
      {/* Top Navigation & Station Header Bar */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
          {/* Left: Back Button & Station Info */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 ring-1 ring-inset ring-slate-200/80 transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft size={16} />
              <span>Listeye Geri Dön</span>
            </button>

            <div className="h-8 w-px bg-slate-200 hidden sm:block shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight break-words">
                  {reading.stationName}
                </h1>
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 ring-1 ring-inset ring-slate-200 shrink-0">
                  {reading.u}
                </span>

                {isApproved && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ONAYLANDI
                  </span>
                )}
                {isDenied && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    REDDEDİLDİ
                  </span>
                )}
                {!isApproved && !isDenied && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    KONTROL BEKLİYOR
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5 min-w-0">
                <span className="inline-flex items-center gap-1 shrink-0">
                  <Calendar size={13} className="text-blue-600 shrink-0" />
                  Gaz Günü: <strong className="text-slate-800">{reading.gasDate}</strong>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="min-w-0 break-all">
                  Arşiv Klasörü: <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded break-all">uploads/{safeStation}-{yearMonth}</code>
                </span>
                {reading.approvalInfo?.actionAt && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-slate-600 font-medium break-words">
                      Son İşlem: {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR')} ({reading.approvalInfo.actionBy})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Refresh & Quick Approve Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefreshStation}
              disabled={refreshing || actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-inset ring-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={refreshing ? 'spin text-blue-600' : ''} />
              <span>{refreshing ? 'Yenileniyor...' : 'Aksa’dan Yenile'}</span>
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproved || actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Check size={16} />
              <span>{isApproved ? 'Onaylandı' : 'Verileri Onayla'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRejectBox(!showRejectBox)}
              disabled={isDenied || actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 ring-1 ring-inset ring-rose-500/20 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <XCircle size={15} />
              <span>Reddet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-inset ring-rose-600/20 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span className="break-words min-w-0">{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="text-rose-400 hover:text-rose-700 shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 p-4 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span className="break-words min-w-0">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-700 shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Split-Screen Layout: 5 Cols Data & Approval / 7 Cols Large PDF Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (5 Cols): Measurement Cards, Tabs & Approval Box */}
        <div className="lg:col-span-5 space-y-5 min-w-0">
          {/* Tremor Metric Cards Card */}
          <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-4 sm:p-5 overflow-hidden">
            {/* Segmented Control Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl mb-5">
              {[
                { id: 'measurements', label: 'Sayaç & Gaz Değerleri' },
                { id: 'composition', label: 'Kromatografi (%)' },
                { id: 'raw', label: 'Ham JSON' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer truncate ${
                    activeTab === t.id
                      ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'measurements' && (
              <div className="space-y-4">
                {/* 2x2 Generously Padded Tremor Metric Boxes with Overflow Protection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4 sm:p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                      <span className="truncate" title="5 - Düzeltilmiş Tüketim">5 - Düzeltilmiş Tüketim</span>
                      <Activity size={16} className="text-blue-600 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
                      <span className="text-lg sm:text-xl xl:text-2xl font-bold text-slate-900 tabular-nums break-all leading-tight">
                        {reading.consumption !== null && reading.consumption !== undefined
                          ? Number(reading.consumption).toLocaleString('tr-TR')
                          : '—'}
                      </span>
                      <span className="text-xs font-medium text-slate-400 shrink-0">Sm³</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4 sm:p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                      <span className="truncate" title="6 - Toplam Enerji">6 - Toplam Enerji</span>
                      <Flame size={16} className="text-emerald-600 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
                      <span className="text-lg sm:text-xl xl:text-2xl font-bold text-slate-900 tabular-nums break-all leading-tight">
                        {reading.energy !== null && reading.energy !== undefined
                          ? Number(reading.energy).toLocaleString('tr-TR')
                          : '—'}
                      </span>
                      <span className="text-xs font-medium text-slate-400 shrink-0">kcal</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4 sm:p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                      <span className="truncate" title="7 - Üst Isıl Değer (Ho)">7 - Üst Isıl Değer (Ho)</span>
                      <Flame size={16} className="text-amber-500 shrink-0" />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
                      <span className="text-lg sm:text-xl xl:text-2xl font-bold text-slate-900 tabular-nums break-all leading-tight">
                        {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined
                          ? Number(reading.superiorHeatingValue).toLocaleString('tr-TR')
                          : '—'}
                      </span>
                      <span className="text-xs font-medium text-slate-400 shrink-0">kcal/Sm³</span>
                    </div>
                    {(reading.rawData?.data?.fld_OperatorSHVSelection !== undefined ||
                      reading.rawData?.data?.fld_SHVSelection !== undefined ||
                      reading.rawData?.station?.fld_OrganizationSHVSelection !== undefined
                        ? (Number(reading.rawData?.data?.fld_OperatorSHVSelection) === 0 ||
                           Number(reading.rawData?.data?.fld_SHVSelection) === 0 ||
                           Number(reading.rawData?.station?.fld_OrganizationSHVSelection) === 0 ||
                           Number(reading.rawData?.data?.fld_GCOrganizationId) > 0)
                        : Boolean(reading.isSubstitutedSHV)) ? (
                      <span className="mt-2 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/25 max-w-full truncate">
                        ⚠️ İkame Veri (fld_SHVSelection: 0)
                      </span>
                    ) : (
                      <span className="mt-2 inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 max-w-full truncate">
                        ✓ Kendi GC Verisi (fld_SHVSelection: 1)
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4 sm:p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                      <span className="truncate" title="Basınç & Sıcaklık">Basınç & Sıcaklık</span>
                      <Gauge size={16} className="text-slate-400 shrink-0" />
                    </div>
                    <div className="mt-2.5 text-base sm:text-lg xl:text-xl font-bold text-slate-900 tabular-nums break-words leading-tight">
                      {reading.pressure !== null && reading.pressure !== undefined ? `${reading.pressure} Bar` : '—'}
                      <span className="text-slate-300 mx-1.5">/</span>
                      {reading.temperature !== null && reading.temperature !== undefined ? `${reading.temperature} °C` : '—'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4 sm:p-5 sm:col-span-2 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-500 block truncate">Özgül Ağırlık (SG - 33 Nolu Veri)</span>
                      <span className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums mt-1 block break-all">
                        {reading.specificGravity !== null && reading.specificGravity !== undefined ? reading.specificGravity : '—'}
                      </span>
                    </div>
                    <Scale size={24} className="text-slate-300 shrink-0" />
                  </div>
                </div>

                {reading.operatorNote && (
                  <div className="rounded-xl bg-blue-50 p-4 text-xs text-blue-800 ring-1 ring-inset ring-blue-600/20 break-words overflow-hidden">
                    <strong>📝 İstasyon / Operatör Notu:</strong> {reading.operatorNote}
                  </div>
                )}

                {/* Period Info */}
                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs overflow-hidden">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Clock size={15} className="text-slate-400 shrink-0" />
                    <span>OYS Gaz Günü Zaman Aralığı:</span>
                  </span>
                  <span className="font-semibold text-slate-800 tabular-nums break-all">
                    {reading.dt1 || '—'} &rarr; {reading.dt3 || '—'}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'composition' && (
              <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold text-slate-600">Bileşen</th>
                      <th className="py-3 px-4 text-left font-semibold text-slate-600">Formül</th>
                      <th className="py-3 px-4 text-right font-semibold text-slate-600">Mol % Oranı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {[
                      ['Metan', 'CH4', comp.methane],
                      ['Etan', 'C2H6', comp.ethane],
                      ['Propan', 'C3H8', comp.propane],
                      ['İzo-Bütan', 'i-C4H10', comp.iButane],
                      ['Normal-Bütan', 'n-C4H10', comp.nButane],
                      ['İzo-Pentan', 'i-C5H12', comp.iPentane],
                      ['Normal-Pentan', 'n-C5H12', comp.nPentane],
                      ['Hekzan+', 'C6+', comp.hexane],
                      ['Azot', 'N2', comp.nitrogen],
                      ['Karbondioksit', 'CO2', comp.co2]
                    ].map(([label, formula, val]) => (
                      <tr key={formula}>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{label}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{formula}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                          {val !== null && val !== undefined ? `%${val}` : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-3 px-4 text-slate-900">TOPLAM</td>
                      <td className="py-3 px-4">—</td>
                      <td className="py-3 px-4 text-right text-blue-600 tabular-nums">
                        {comp.total !== null && comp.total !== undefined ? `%${comp.total}` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={handleCopyRawJson}
                  title="Ham JSON Verisini Kopyala"
                  className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-200 ring-1 ring-inset ring-slate-600/80 shadow-sm transition-all cursor-pointer"
                >
                  {copiedJson ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
                <pre className="bg-slate-900 text-slate-100 p-4 pt-12 rounded-xl text-[11px] overflow-auto max-h-[520px] mb-0">
                  {JSON.stringify(reading.rawData || reading, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Dedicated Approval & Decision Card */}
          <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-4 sm:p-5 space-y-4 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">Veri Doğrulama & Onay Kararı</h3>
                <p className="text-xs text-slate-500 break-words mt-0.5">
                  Yandaki PDF gaz alım raporu ile sayaç değerlerini karşılaştırıp işleminizi tamamlayın
                </p>
              </div>
              {reading.approvalInfo?.actionAt && (
                <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                  {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR')}
                </span>
              )}
            </div>

            {reading.approvalInfo?.rejectionReason && isDenied && !showRejectBox && (
              <div className="rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 ring-1 ring-inset ring-rose-600/20 break-words overflow-hidden">
                <strong>Ret Sebebi:</strong> {reading.approvalInfo.rejectionReason}
              </div>
            )}

            {!showRejectBox ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Onay Notu / Açıklama (İsteğe bağlı)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Örn: Sayaç tüketimi, üst ısıl değer ve PDF raporu kontrol edildi, tüm değerler uyumlu."
                    className="w-full rounded-xl border-0 p-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600 outline-none break-words"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproved || actionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <CheckCircle2 size={18} className="shrink-0" />
                    <span>{isApproved ? 'Bu Okuma Onaylandı' : 'Evet, Verileri Onayla'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectBox(true)}
                    disabled={isDenied || actionLoading}
                    className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 ring-1 ring-inset ring-rose-500/20 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <XCircle size={17} className="shrink-0" />
                    <span>Reddet</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-rose-50/80 p-4 ring-1 ring-rose-500/25 space-y-3 overflow-hidden">
                <label className="block text-xs font-bold text-rose-900">
                  Ret Sebebi (Zorunlu) *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Lütfen veriyi neden reddettiğinizi açıklayınız (Örn: PDF raporundaki tüketim ile sistem verisi uyuşmuyor)..."
                  className="w-full rounded-xl bg-white p-3 text-xs text-slate-900 ring-1 ring-rose-300 focus:ring-2 focus:ring-rose-600 outline-none break-words"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white ring-1 ring-slate-200 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleDeny}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer"
                  >
                    <XCircle size={15} />
                    <span>Kaydı Reddet</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (7 Cols): Full-Height Side-by-Side PDF / Document Viewer & Upload */}
        <div className="lg:col-span-7 min-w-0 bg-white rounded-xl ring-1 ring-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
          <div className="min-w-0">
            {/* PDF Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-100 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                    Gaz Alım Raporu & Belge Görüntüleyici ({files.length})
                  </h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5" title={activeFile ? activeFile.filename : ''}>
                    {activeFile ? activeFile.filename : 'Rapor yüklenmedi'}
                  </p>
                </div>
              </div>

              {activeFile && (
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={activeFile.relativeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-600/20 text-decoration-none"
                  >
                    <ExternalLink size={14} />
                    <span>Yeni Sekmede Aç</span>
                  </a>
                  <a
                    href={activeFile.relativeUrl}
                    download={activeFile.filename}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 ring-1 ring-inset ring-slate-200"
                    title="İndir"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteFile(activeFile._id)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 ring-1 ring-inset ring-rose-200 cursor-pointer"
                    title="Dosyayı Sil"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Multiple File Tabs */}
            {files.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3 min-w-0">
                {files.map((f, idx) => (
                  <button
                    key={f._id || idx}
                    type="button"
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer max-w-full truncate ${
                      idx === selectedFileIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={f.filename || f.originalName}
                  >
                    {f.filename || f.originalName}
                  </button>
                ))}
              </div>
            )}

            {/* Embedded PDF or Empty State */}
            {hasFiles && activeFile ? (
              <div className="min-w-0">
                <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl ring-1 ring-slate-200/80 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1 break-all">
                    <strong className="text-slate-800">Arşiv Dosyası:</strong> {activeFile.filename}
                    {activeFile.originalName && activeFile.originalName !== activeFile.filename && (
                      <span className="text-slate-500"> (Orijinal: {activeFile.originalName})</span>
                    )}
                  </div>
                  <span className="rounded-lg bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shrink-0">
                    {activeFile.uploadedBy || 'Sistem'}
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden bg-slate-900 ring-1 ring-slate-200" style={{ minHeight: '720px' }}>
                  {isPdf ? (
                    <iframe
                      src={activeFile.relativeUrl}
                      title={activeFile.filename || 'PDF Raporu'}
                      width="100%"
                      height="720px"
                      style={{ border: 'none', display: 'block', minHeight: '720px' }}
                    />
                  ) : isImage ? (
                    <div className="p-4 flex items-center justify-center h-full">
                      <img
                        src={activeFile.relativeUrl}
                        alt={activeFile.filename}
                        style={{ maxWidth: '100%', maxHeight: '700px', objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-white p-14 break-words">
                      <File size={48} className="mx-auto mb-3 text-amber-400" />
                      <p className="text-sm mb-3 break-all">{activeFile.filename}</p>
                      <a href={activeFile.relativeUrl} download className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold">
                        Dosyayı İndir
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 p-8 sm:p-10 text-center overflow-hidden" style={{ minHeight: '500px' }}>
                <UploadCloud size={52} className="text-slate-400 mb-3 shrink-0" />
                <h4 className="text-base font-bold text-slate-800 mb-1 break-words">Bu Okumaya Ait Rapor Dosyası Bulunamadı</h4>
                <p className="text-xs text-slate-500 max-w-md mb-4 break-words">
                  Aksa RMSA üzerinde bu tarihe ait otomatik rapor dosyası bulunmuyor. Aşağıdaki dosya yükleme alanından PDF veya belge yükleyebilirsiniz.
                </p>
              </div>
            )}
          </div>

          {/* File Upload Bar at Bottom of Right Panel */}
          <form onSubmit={handleUpload} className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <div className="flex-1 min-w-0 overflow-hidden">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer truncate"
              />
            </div>
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 shrink-0 transition-colors cursor-pointer"
            >
              <UploadCloud size={16} />
              <span>{uploading ? 'Yükleniyor...' : hasFiles ? 'Yeni Rapor Dosyası Ekle' : 'Rapor Dosyası Yükle'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
