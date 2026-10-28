import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { 
  Info, Clock, CheckCircle2, XCircle, FileText, UploadCloud, 
  Download, Trash2, ExternalLink, File, Activity, Flame, Gauge, Scale, X, Check, Copy
} from 'lucide-react';
import api from '../api/axiosClient';

export default function ReadingDetailModal({ show, onHide, reading, onReadingUpdated }) {
  const [activeTab, setActiveTab] = useState('measurements');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
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
    setActiveTab('measurements');
    setSelectedFileIndex(0);
    setSelectedFiles([]);
    setError('');
    setSuccessMsg('');
    setShowRejectInput(false);
    setNotes('');
    setRejectionReason('');
  }, [reading?._id, reading?.u, reading?.gasDate, show]);

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

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Lütfen en az bir dosya seçin');
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
        setSuccessMsg('Dosya başarıyla yüklendi!');
        setSelectedFiles([]);
        if (onReadingUpdated) {
          onReadingUpdated(res.data.reading);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Dosya yükleme hatası');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return;

    try {
      const res = await api.delete(`/readings/${reading._id}/file/${fileId}`);
      if (res.data.success) {
        setSelectedFileIndex(0);
        if (onReadingUpdated) {
          onReadingUpdated({ ...reading, files: res.data.files });
        }
      }
    } catch (err) {
      setError('Dosya silinirken hata oluştu');
    }
  };

  const handleQuickApprove = async () => {
    if (!reading._id) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post(`/readings/${reading._id}/approve`, { notes });
      if (res.data.success) {
        setSuccessMsg('Okuma başarıyla onaylandı.');
        if (onReadingUpdated) {
          onReadingUpdated(res.data.reading);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Onaylama hatası');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickDeny = async () => {
    if (!reading._id) return;
    if (!rejectionReason.trim()) {
      setError('Lütfen ret sebebini belirtiniz.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post(`/readings/${reading._id}/deny`, { rejectionReason: rejectionReason.trim(), notes });
      if (res.data.success) {
        setSuccessMsg('Okuma reddedildi.');
        setShowRejectInput(false);
        if (onReadingUpdated) {
          onReadingUpdated(res.data.reading);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Reddetme hatası');
    } finally {
      setActionLoading(false);
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

  const tabs = [
    { id: 'measurements', label: 'Sayaç & Gaz Değerleri' },
    { id: 'composition', label: 'Kromatografi (%)' },
    ...(reading.approvalInfo && (reading.approvalInfo.actionBy || reading.approvalInfo.notes || reading.approvalInfo.rejectionReason)
      ? [{ id: 'approval', label: 'Onay / Red Geçmişi' }]
      : []),
    { id: 'raw', label: 'Ham JSON' }
  ];

  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down" centered dialogClassName="detail-modal-96w">
      <style>{`
        .detail-modal-96w {
          max-width: 96vw !important;
          width: 96vw !important;
        }
      `}</style>

      {/* Tremor Modal Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 flex items-center justify-center">
            <Info size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 leading-tight">{reading.stationName}</h3>
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{reading.u}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gaz Günü: <strong className="text-slate-800">{reading.gasDate}</strong> • Arşiv: <code className="text-slate-600">uploads/{safeStation}-{yearMonth}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {reading.status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Onaylandı
            </span>
          )}
          {reading.status === 'DENIED' && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Reddedildi
            </span>
          )}
          {reading.status === 'PENDING' && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Kontrol Bekliyor
            </span>
          )}

          <button
            type="button"
            onClick={onHide}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Modal Body */}
      <div className="p-5 sm:p-6 bg-slate-50/70">
        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-800 ring-1 ring-inset ring-rose-600/20 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20 flex items-center justify-between">
            <span>{successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg('')}><X size={14} /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN (5 Cols): Measurements, Tabs, and Quick Approval */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-xl ring-1 ring-slate-200 p-5 shadow-2xs">
            <div>
              {/* Tremor Segmented Tabs */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl mb-5">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === t.id
                        ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: Measurements */}
              {activeTab === 'measurements' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>5 - Düzeltilmiş Tüketim</span>
                        <Activity size={15} className="text-blue-600" />
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-900 tabular-nums">
                          {reading.consumption !== null && reading.consumption !== undefined
                            ? Number(reading.consumption).toLocaleString('tr-TR')
                            : '—'}
                        </span>
                        <span className="text-xs text-slate-400">Sm³</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>6 - Toplam Enerji</span>
                        <Flame size={15} className="text-emerald-600" />
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-900 tabular-nums">
                          {reading.energy !== null && reading.energy !== undefined
                            ? Number(reading.energy).toLocaleString('tr-TR')
                            : '—'}
                        </span>
                        <span className="text-xs text-slate-400">kcal</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>7 - Üst Isıl Değer (Ho)</span>
                        <Flame size={15} className="text-amber-500" />
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-slate-900 tabular-nums">
                          {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined
                            ? Number(reading.superiorHeatingValue).toLocaleString('tr-TR')
                            : '—'}
                        </span>
                        <span className="text-xs text-slate-400">kcal/Sm³</span>
                      </div>
                      {reading.isSubstitutedSHV && (
                        <span className="mt-2 inline-flex items-center rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20">
                          7 Nolu İkame Ho Aktif
                        </span>
                      )}
                    </div>

                    <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Basınç & Sıcaklık</span>
                        <Gauge size={15} className="text-slate-400" />
                      </div>
                      <div className="mt-2 text-lg font-bold text-slate-900 tabular-nums">
                        {reading.pressure !== null && reading.pressure !== undefined ? `${reading.pressure} Bar` : '—'}
                        <span className="text-slate-300 mx-1.5">/</span>
                        {reading.temperature !== null && reading.temperature !== undefined ? `${reading.temperature} °C` : '—'}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50/70 ring-1 ring-slate-200/90 p-4 sm:col-span-2 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-slate-500 block">Özgül Ağırlık (SG - 33 Nolu)</span>
                        <span className="text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">
                          {reading.specificGravity !== null && reading.specificGravity !== undefined ? reading.specificGravity : '—'}
                        </span>
                      </div>
                      <Scale size={20} className="text-slate-300" />
                    </div>
                  </div>

                  {reading.operatorNote && (
                    <div className="rounded-xl bg-blue-50 p-3.5 text-xs text-blue-800 ring-1 ring-inset ring-blue-600/20">
                      <strong>📝 İstasyon / Operatör Notu:</strong> {reading.operatorNote}
                    </div>
                  )}

                  {/* Period Box */}
                  <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      <span>OYS Gaz Günü:</span>
                    </span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {reading.dt1 || '—'} &rarr; {reading.dt3 || '—'}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: Gas Composition */}
              {activeTab === 'composition' && (
                <div className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Bileşen</th>
                        <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Formül</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-slate-600">Mol % Oranı</th>
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
                          <td className="py-2 px-3 font-medium text-slate-800">{label}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{formula}</td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">
                            {val !== null && val !== undefined ? `%${val}` : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold">
                        <td className="py-2.5 px-3 text-slate-900">TOPLAM</td>
                        <td className="py-2.5 px-3">—</td>
                        <td className="py-2.5 px-3 text-right text-blue-600 tabular-nums">
                          {comp.total !== null && comp.total !== undefined ? `%${comp.total}` : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: Approval Info */}
              {activeTab === 'approval' && reading.approvalInfo && (
                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">İşlem Yapan:</span>
                    <span className="font-semibold text-slate-900">{reading.approvalInfo.actionBy || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">İşlem Tarihi & Saati:</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {reading.approvalInfo.actionAt ? new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR') : '—'}
                    </span>
                  </div>
                  {reading.approvalInfo.notes && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block mb-1">Onay Notu:</span>
                      <p className="font-medium text-emerald-700 mb-0">{reading.approvalInfo.notes}</p>
                    </div>
                  )}
                  {reading.approvalInfo.rejectionReason && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block mb-1">Ret Sebebi:</span>
                      <p className="font-medium text-rose-700 mb-0">{reading.approvalInfo.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Raw Data */}
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
                  <pre className="bg-slate-900 text-slate-100 p-4 pt-12 rounded-xl text-[11px] overflow-auto max-h-96 mb-0">
                    {JSON.stringify(reading.rawData || reading, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Bottom Quick Verification Bar */}
            {reading._id && (
              <div className="pt-4 mt-5 border-t border-slate-200">
                <span className="block text-xs font-bold text-slate-800 mb-2">Hızlı Kontrol & Onay İşlemi</span>
                {!showRejectInput ? (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Onay notu / açıklama (isteğe bağlı)..."
                      className="w-full rounded-lg border-0 py-2 px-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={reading.status === 'APPROVED' || actionLoading}
                        onClick={handleQuickApprove}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Check size={16} />
                        <span>{reading.status === 'APPROVED' ? 'Onaylandı' : 'Verileri Onayla'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={reading.status === 'DENIED' || actionLoading}
                        onClick={() => setShowRejectInput(true)}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 ring-1 ring-inset ring-rose-500/20 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <XCircle size={16} />
                        <span>Reddet</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-rose-50 p-3.5 ring-1 ring-rose-500/25 space-y-2.5">
                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ret sebebini yazınız (Zorunlu)..."
                      className="w-full rounded-lg bg-white p-2.5 text-xs text-slate-900 ring-1 ring-rose-300 outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white ring-1 ring-slate-200"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickDeny}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500"
                      >
                        Kaydı Reddet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (7 Cols): Expanded PDF Viewer & File Upload */}
          <div className="lg:col-span-7 bg-white rounded-xl ring-1 ring-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex flex-col flex-grow">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-900 mb-0">
                    Gaz Alım Raporu / Belge Önizleme ({files.length})
                  </h4>
                </div>

                {activeFile && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={activeFile.relativeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-600/20 text-decoration-none"
                    >
                      <ExternalLink size={13} />
                      <span>Tam Ekran Aç</span>
                    </a>
                    <a
                      href={activeFile.relativeUrl}
                      download={activeFile.filename}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 ring-1 ring-inset ring-slate-200"
                      title="İndir"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(activeFile._id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 ring-1 ring-inset ring-rose-200 cursor-pointer"
                      title="Dosyayı Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {files.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {files.map((f, idx) => (
                    <button
                      key={f._id || idx}
                      type="button"
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        idx === selectedFileIndex
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.filename || f.originalName}
                    </button>
                  ))}
                </div>
              )}

              {hasFiles && activeFile ? (
                <div className="flex flex-col flex-grow">
                  <div className="bg-slate-50 px-3 py-2 rounded-lg ring-1 ring-slate-200/80 mb-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate">
                      <strong className="text-slate-800">Dosya:</strong> {activeFile.filename}
                      {activeFile.originalName && activeFile.originalName !== activeFile.filename && ` (Kaynak: ${activeFile.originalName})`}
                    </span>
                    <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shrink-0 ml-2">
                      {activeFile.uploadedBy || 'Sistem'}
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden bg-slate-900 ring-1 ring-slate-200 flex-grow" style={{ minHeight: '620px' }}>
                    {isPdf ? (
                      <iframe
                        src={activeFile.relativeUrl}
                        title={activeFile.filename || 'PDF Raporu'}
                        width="100%"
                        height="620px"
                        style={{ border: 'none', display: 'block', minHeight: '620px' }}
                      />
                    ) : isImage ? (
                      <div className="p-4 flex items-center justify-center h-full">
                        <img
                          src={activeFile.relativeUrl}
                          alt={activeFile.filename}
                          style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div className="text-center text-white p-12">
                        <File size={44} className="mx-auto mb-3 text-amber-400" />
                        <p className="text-sm mb-3">{activeFile.filename}</p>
                        <a href={activeFile.relativeUrl} download className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold">
                          Dosyayı İndir
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-300 p-8 text-center" style={{ minHeight: '420px' }}>
                  <UploadCloud size={44} className="text-slate-400 mb-3" />
                  <h5 className="text-sm font-bold text-slate-800 mb-1">Bu Okumaya Ait Rapor Dosyası Bulunamadı</h5>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Aksa RMSA üzerinde henüz otomatik rapor yüklenmemiş. Aşağıdaki alandan gaz alım raporunu manuel olarak yükleyebilirsiniz.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom File Upload Form */}
            <form onSubmit={handleUpload} className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              <button
                type="submit"
                disabled={uploading || selectedFiles.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 shrink-0 transition-colors cursor-pointer"
              >
                <UploadCloud size={15} />
                <span>{uploading ? 'Yükleniyor...' : hasFiles ? 'Yeni Dosya Ekle' : 'Dosya Yükle'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 flex justify-end">
        <button
          type="button"
          onClick={onHide}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          Kapat
        </button>
      </div>
    </Modal>
  );
}
