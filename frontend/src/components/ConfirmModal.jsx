import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { 
  CheckCircle2, AlertTriangle, FileText, ExternalLink, Download, 
  Flame, Activity, Gauge, Scale, Calendar, X, Check
} from 'lucide-react';

export default function ConfirmModal({ show, onHide, onConfirm, reading, loading }) {
  const [notes, setNotes] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  useEffect(() => {
    setSelectedFileIndex(0);
    setNotes('');
  }, [reading?._id, show]);

  if (!reading) return null;

  const handleConfirm = () => {
    onConfirm(reading._id || reading.id, notes);
    setNotes('');
  };

  const files = reading.files || [];
  const hasFiles = files.length > 0;
  const activeFile = hasFiles ? (files[selectedFileIndex] || files[0]) : null;
  const isPdf = activeFile && (
    (activeFile.filename && activeFile.filename.toLowerCase().endsWith('.pdf')) ||
    (activeFile.originalName && activeFile.originalName.toLowerCase().endsWith('.pdf')) ||
    (activeFile.mimeType && activeFile.mimeType.includes('pdf'))
  );

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      fullscreen="lg-down"
      centered
      backdrop="static"
      dialogClassName={hasFiles ? 'tremor-modal-wide' : 'tremor-modal-md'}
    >
      <style>{`
        .tremor-modal-wide {
          max-width: 96vw !important;
          width: 96vw !important;
        }
        .tremor-modal-md {
          max-width: 680px !important;
        }
      `}</style>

      {/* Tremor Modal Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Gaz Alım Verisi Kontrol & Onay Ekranı
            </h3>
            <p className="text-xs text-slate-500">
              İstasyon sayaç verileri ve PDF gaz alım raporunu karşılaştırarak onaylayın
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-5 sm:p-6 bg-slate-50/70">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel (5 cols when PDF exists) */}
          <div className={hasFiles ? 'lg:col-span-5 flex flex-col justify-between space-y-4' : 'lg:col-span-12 space-y-4'}>
            <div className="space-y-4">
              {/* Station Identity Card */}
              <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <h4 className="text-base font-bold text-slate-900">{reading.stationName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Calendar size={13} className="text-blue-600" />
                    <span>Gaz Günü: <strong className="text-slate-800">{reading.gasDate}</strong></span>
                    <span>•</span>
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">{reading.u}</code>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                  hasFiles ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-slate-100 text-slate-600 ring-slate-300'
                }`}>
                  {hasFiles ? `${files.length} Rapor Yüklü` : 'Rapor Yok'}
                </span>
              </div>

              {/* Tremor Callout Alert */}
              <div className="rounded-xl bg-amber-50/80 p-3.5 ring-1 ring-inset ring-amber-500/25 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed mb-0">
                  {hasFiles
                    ? 'Sağ taraftaki PDF gaz alım raporundaki değerler ile aşağıdaki sistem ölçüm verilerini karşılaştırarak onaylayınız.'
                    : 'Verileri son kez kontrol ettiniz mi? Bu işlem kaydı ONAYLANDI (APPROVED) durumuna geçirecektir.'}
                </p>
              </div>

              {/* Tremor Metric Cards Grid (Generous Padding) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-2xs">
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
                    <span className="text-xs font-medium text-slate-400">Sm³</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-2xs">
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
                    <span className="text-xs font-medium text-slate-400">kcal</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-2xs">
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
                    <span className="text-xs font-medium text-slate-400">kcal/Sm³</span>
                  </div>
                  {reading.isSubstitutedSHV && (
                    <span className="mt-2 inline-flex items-center rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20">
                      7 Nolu İkame Ho Aktif
                    </span>
                  )}
                </div>

                <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-2xs">
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

                <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-2xs sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 block">Özgül Ağırlık (SG)</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">
                      {reading.specificGravity ?? '—'}
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
            </div>

            {/* Notes Input Card */}
            <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-2xs">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Onay Notu / Açıklama (İsteğe bağlı)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn: Sayaç, üst ısıl değer ve PDF raporu kontrol edildi, tüm değerler uyumlu."
                className="w-full rounded-lg border-0 p-3 text-xs text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          {/* Right Panel: Wide PDF Preview (7 cols) */}
          {hasFiles && activeFile && (
            <div className="lg:col-span-7">
              <div className="bg-white rounded-xl ring-1 ring-slate-200 p-4 shadow-2xs h-full flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{activeFile.filename || activeFile.originalName}</div>
                      {activeFile.originalName && activeFile.originalName !== activeFile.filename && (
                        <div className="text-[11px] text-slate-400">Kaynak: {activeFile.originalName}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {files.length > 1 && files.map((f, idx) => (
                      <button
                        key={f._id || idx}
                        type="button"
                        onClick={() => setSelectedFileIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          idx === selectedFileIndex
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Rapor #{idx + 1}
                      </button>
                    ))}
                    <a
                      href={activeFile.relativeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-600/20 text-decoration-none"
                    >
                      <ExternalLink size={13} />
                      <span>Yeni Sekme</span>
                    </a>
                    <a
                      href={activeFile.relativeUrl}
                      download={activeFile.filename}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 ring-1 ring-inset ring-slate-200"
                      title="İndir"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden bg-slate-900 ring-1 ring-slate-200 flex-grow" style={{ minHeight: '640px' }}>
                  {isPdf ? (
                    <iframe
                      src={activeFile.relativeUrl}
                      title={activeFile.filename}
                      width="100%"
                      height="640px"
                      style={{ border: 'none', display: 'block', minHeight: '640px' }}
                    />
                  ) : (
                    <div className="text-center text-white p-10 flex flex-col items-center justify-center h-full">
                      <FileText size={42} className="mb-3 text-amber-400" />
                      <p className="text-sm mb-3">{activeFile.filename}</p>
                      <a href={activeFile.relativeUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold">
                        Dosyayı Görüntüle / İndir
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onHide}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 ring-1 ring-inset ring-slate-300 transition-colors cursor-pointer"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Onaylanıyor...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Evet, Verileri Onayla</span>
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
