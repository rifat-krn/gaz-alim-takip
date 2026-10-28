import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Badge, Tabs, Tab, Row, Col, Form, Alert, Spinner } from 'react-bootstrap';
import { 
  Info, Clock, CheckCircle2, XCircle, FileText, UploadCloud, 
  Download, Trash2, ExternalLink, File, Activity, Flame, Gauge, Scale
} from 'lucide-react';
import api from '../api/axiosClient';

export default function ReadingDetailModal({ show, onHide, reading, onReadingUpdated }) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
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

  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down" centered dialogClassName="detail-modal-96w">
      <style>{`
        .detail-modal-96w {
          max-width: 96vw !important;
          width: 96vw !important;
        }
        .detail-metric-box {
          padding: 1.2rem 1.25rem;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e9ecef;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
          height: 100%;
        }
        .detail-metric-box:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        .detail-metric-primary {
          background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
          border-left: 4px solid #0d6efd;
        }
        .detail-metric-success {
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
          border-left: 4px solid #198754;
        }
        .detail-metric-warning {
          background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
          border-left: 4px solid #f59e0b;
        }
      `}</style>

      <Modal.Header closeButton className="bg-dark text-white py-3 px-4 border-0">
        <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0 fw-bold">
          <Info size={24} className="text-warning" />
          <span>İstasyon Ölçüm, Belge Karşılaştırma & Kontrol Ekranı</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4" style={{ backgroundColor: '#f8fafc' }}>
        {/* Top Station Summary Bar */}
        <div className="bg-white p-3.5 px-4 py-3 rounded-3 shadow-sm border mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h4 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
              <span>{reading.stationName}</span>
              <Badge bg="secondary" className="fs-6 fw-normal px-2.5 py-1"><code>{reading.u}</code></Badge>
            </h4>
            <div className="text-muted small">
              Gaz Günü: <strong className="text-dark">{reading.gasDate}</strong> • Arşiv Klasörü: <code>uploads/{safeStation}-{yearMonth}</code>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {reading.status === 'APPROVED' && (
              <div className="text-end">
                <Badge bg="success" className="px-3 py-2 fs-6 rounded-pill">ONAYLANDI</Badge>
                {reading.approvalInfo?.actionAt && (
                  <div className="text-success small fw-semibold mt-1" style={{ fontSize: '11px' }}>
                    {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR')} ({reading.approvalInfo.actionBy})
                  </div>
                )}
              </div>
            )}
            {reading.status === 'DENIED' && (
              <div className="text-end">
                <Badge bg="danger" className="px-3 py-2 fs-6 rounded-pill">REDDEDİLDİ</Badge>
                {reading.approvalInfo?.actionAt && (
                  <div className="text-danger small fw-semibold mt-1" style={{ fontSize: '11px' }}>
                    {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR')} ({reading.approvalInfo.actionBy})
                  </div>
                )}
              </div>
            )}
            {reading.status === 'PENDING' && <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 rounded-pill">KONTROL BEKLİYOR</Badge>}
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')} className="py-2.5 px-3 small rounded-3">{error}</Alert>}
        {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="py-2.5 px-3 small rounded-3">{successMsg}</Alert>}

        <Row className="g-4">
          {/* LEFT COLUMN (5 Cols): Measurements, Gas Composition, and Quick Approval */}
          <Col lg={5}>
            <div className="bg-white p-4 rounded-3 shadow-sm border h-100 d-flex flex-column justify-content-between">
              <div>
                <Tabs defaultActiveKey="measurements" className="mb-3">
                  <Tab eventKey="measurements" title="Sayaç & Gaz Değerleri">
                    <Row className="g-3 mb-3">
                      <Col sm={6}>
                        <div className="detail-metric-box detail-metric-primary">
                          <div className="d-flex align-items-center justify-content-between text-muted small fw-semibold mb-2">
                            <span>5 - DÜZELTİLMİŞ TÜKETİM</span>
                            <Activity size={16} className="text-primary" />
                          </div>
                          <div className="fs-4 fw-bold text-primary">
                            {reading.consumption !== null && reading.consumption !== undefined
                              ? Number(reading.consumption).toLocaleString('tr-TR')
                              : '—'}
                            <small className="fs-6 fw-normal text-muted ms-1">Sm³</small>
                          </div>
                        </div>
                      </Col>

                      <Col sm={6}>
                        <div className="detail-metric-box detail-metric-success">
                          <div className="d-flex align-items-center justify-content-between text-muted small fw-semibold mb-2">
                            <span>6 - TOPLAM ENERJİ</span>
                            <Flame size={16} className="text-success" />
                          </div>
                          <div className="fs-4 fw-bold text-success">
                            {reading.energy !== null && reading.energy !== undefined
                              ? Number(reading.energy).toLocaleString('tr-TR')
                              : '—'}
                            <small className="fs-6 fw-normal text-muted ms-1">kcal</small>
                          </div>
                        </div>
                      </Col>

                      <Col sm={6}>
                        <div className="detail-metric-box detail-metric-warning">
                          <div className="d-flex align-items-center justify-content-between text-muted small fw-semibold mb-2">
                            <span>7 - ÜST ISIL DEĞER (Ho)</span>
                            <Flame size={16} className="text-warning" />
                          </div>
                          <div className="fs-4 fw-bold text-dark">
                            {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined
                              ? Number(reading.superiorHeatingValue).toLocaleString('tr-TR')
                              : '—'}
                            <small className="fs-6 fw-normal text-muted ms-1">kcal/Sm³</small>
                          </div>
                          {reading.isSubstitutedSHV && (
                            <div>
                              <Badge bg="info" className="mt-2" style={{ fontSize: '10px' }}>
                                7 Nolu İkame Ho Aktif
                              </Badge>
                            </div>
                          )}
                        </div>
                      </Col>

                      <Col sm={6}>
                        <div className="detail-metric-box">
                          <div className="d-flex align-items-center justify-content-between text-muted small fw-semibold mb-2">
                            <span>BASINÇ & SICAKLIK</span>
                            <Gauge size={16} className="text-secondary" />
                          </div>
                          <div className="fs-5 fw-bold text-dark">
                            {reading.pressure !== null && reading.pressure !== undefined ? `${reading.pressure} Bar` : '—'}
                            <span className="text-muted mx-2">/</span>
                            {reading.temperature !== null && reading.temperature !== undefined ? `${reading.temperature} °C` : '—'}
                          </div>
                        </div>
                      </Col>

                      <Col sm={12}>
                        <div className="detail-metric-box d-flex justify-content-between align-items-center">
                          <div>
                            <div className="text-muted small fw-semibold mb-1">ÖZGÜL AĞIRLIK (SG)</div>
                            <div className="fs-5 fw-bold text-dark">
                              {reading.specificGravity !== null && reading.specificGravity !== undefined ? reading.specificGravity : '—'}
                            </div>
                          </div>
                          <Scale size={24} className="text-secondary opacity-50" />
                        </div>
                      </Col>
                    </Row>

                    {reading.operatorNote && (
                      <div className="alert alert-info p-3 rounded-3 mb-3 small d-flex align-items-center gap-2">
                        <FileText size={18} className="flex-shrink-0" />
                        <div>
                          <strong>İstasyon / Operatör Notu:</strong> {reading.operatorNote}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-light rounded-3 border mb-3">
                      <h6 className="fw-bold mb-2 small text-muted">Isıl Değer (Ho) Kaynak Karşılaştırması</h6>
                      <div className="row g-2 small">
                        <div className="col-md-6">
                          <span className="text-muted">7 Nolu Veri (Operatör / İkame Ho):</span>
                          <div className="fw-bold text-primary mt-1">
                            {reading.operatorSuperiorHeatingValue ? `${Number(reading.operatorSuperiorHeatingValue).toLocaleString('tr-TR')} kcal/Sm³` : '—'}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <span className="text-muted">30 Nolu Veri (İstasyon Toplam Ho):</span>
                          <div className="fw-bold text-dark mt-1">
                            {reading.stationTotalSuperiorHeatingValue ? `${Number(reading.stationTotalSuperiorHeatingValue).toLocaleString('tr-TR')} kcal/Sm³` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-light rounded-3 border mb-2">
                      <h6 className="fw-bold mb-2 d-flex align-items-center gap-1 small">
                        <Clock size={15} />
                        <span>OYS Sorgu Zaman Aralıkları</span>
                      </h6>
                      <div className="row small text-muted">
                        <div className="col-md-6"><strong>Başlangıç:</strong> {reading.dt1 || '—'}</div>
                        <div className="col-md-6"><strong>Bitiş:</strong> {reading.dt3 || '—'}</div>
                      </div>
                    </div>
                  </Tab>

                  <Tab eventKey="composition" title="Kromatografi (Gaz Bileşimi %)">
                    <Table bordered hover responsive size="sm" className="mb-0 small">
                      <thead className="table-secondary">
                        <tr>
                          <th className="p-2">Bileşen</th>
                          <th className="p-2">Kimyasal Formül</th>
                          <th className="p-2 text-end">Mol % Oranı</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-2">Metan</td><td className="p-2">CH4</td><td className="p-2 text-end fw-semibold">{comp.methane !== null && comp.methane !== undefined ? `%${comp.methane}` : '—'}</td></tr>
                        <tr><td className="p-2">Etan</td><td className="p-2">C2H6</td><td className="p-2 text-end fw-semibold">{comp.ethane !== null && comp.ethane !== undefined ? `%${comp.ethane}` : '—'}</td></tr>
                        <tr><td className="p-2">Propan</td><td className="p-2">C3H8</td><td className="p-2 text-end fw-semibold">{comp.propane !== null && comp.propane !== undefined ? `%${comp.propane}` : '—'}</td></tr>
                        <tr><td className="p-2">İzo-Bütan</td><td className="p-2">i-C4H10</td><td className="p-2 text-end fw-semibold">{comp.iButane !== null && comp.iButane !== undefined ? `%${comp.iButane}` : '—'}</td></tr>
                        <tr><td className="p-2">Normal-Bütan</td><td className="p-2">n-C4H10</td><td className="p-2 text-end fw-semibold">{comp.nButane !== null && comp.nButane !== undefined ? `%${comp.nButane}` : '—'}</td></tr>
                        <tr><td className="p-2">İzo-Pentan</td><td className="p-2">i-C5H12</td><td className="p-2 text-end fw-semibold">{comp.iPentane !== null && comp.iPentane !== undefined ? `%${comp.iPentane}` : '—'}</td></tr>
                        <tr><td className="p-2">Normal-Pentan</td><td className="p-2">n-C5H12</td><td className="p-2 text-end fw-semibold">{comp.nPentane !== null && comp.nPentane !== undefined ? `%${comp.nPentane}` : '—'}</td></tr>
                        <tr><td className="p-2">Hekzan+</td><td className="p-2">C6+</td><td className="p-2 text-end fw-semibold">{comp.hexane !== null && comp.hexane !== undefined ? `%${comp.hexane}` : '—'}</td></tr>
                        <tr><td className="p-2">Azot</td><td className="p-2">N2</td><td className="p-2 text-end fw-semibold">{comp.nitrogen !== null && comp.nitrogen !== undefined ? `%${comp.nitrogen}` : '—'}</td></tr>
                        <tr><td className="p-2">Karbondioksit</td><td className="p-2">CO2</td><td className="p-2 text-end fw-semibold">{comp.co2 !== null && comp.co2 !== undefined ? `%${comp.co2}` : '—'}</td></tr>
                        <tr className="table-light fw-bold"><td className="p-2">TOPLAM</td><td className="p-2">—</td><td className="p-2 text-end">{comp.total !== null && comp.total !== undefined ? `%${comp.total}` : '—'}</td></tr>
                      </tbody>
                    </Table>
                  </Tab>

                  {reading.approvalInfo && (reading.approvalInfo.actionBy || reading.approvalInfo.notes || reading.approvalInfo.rejectionReason) && (
                    <Tab eventKey="approval" title="Onay / Red Geçmişi">
                      <div className="p-3 bg-light rounded-3 border small">
                        <p className="mb-2"><strong>İşlem Yapan:</strong> {reading.approvalInfo.actionBy || '—'}</p>
                        <p className="mb-2"><strong>İşlem Tarihi ve Saati:</strong> {reading.approvalInfo.actionAt ? new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR') : '—'}</p>
                        {reading.approvalInfo.notes && (
                          <p className="mb-2 text-success"><strong>Onay Notu:</strong> {reading.approvalInfo.notes}</p>
                        )}
                        {reading.approvalInfo.rejectionReason && (
                          <p className="mb-0 text-danger"><strong>Ret Sebebi:</strong> {reading.approvalInfo.rejectionReason}</p>
                        )}
                      </div>
                    </Tab>
                  )}

                  <Tab eventKey="raw" title="Ham OYS Yanıtı">
                    <pre className="bg-dark text-light p-3 rounded-3 small mb-0" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                      {JSON.stringify(reading.rawData || reading, null, 2)}
                    </pre>
                  </Tab>
                </Tabs>
              </div>

              {/* Quick Verification & Approval Box at Bottom of Left Panel */}
              {reading._id && (
                <div className="border-top pt-3 mt-3">
                  <h6 className="fw-bold small text-dark mb-2">Hızlı Kontrol & Onay İşlemi</h6>
                  {!showRejectInput ? (
                    <div className="d-flex flex-column gap-2">
                      <Form.Control
                        size="sm"
                        type="text"
                        className="p-2.5"
                        placeholder="Onay notu / açıklama yazabilirsiniz (isteğe bağlı)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <Button
                          variant="success"
                          disabled={reading.status === 'APPROVED' || actionLoading}
                          onClick={handleQuickApprove}
                          className="d-inline-flex align-items-center justify-content-center gap-2 fw-bold px-4 py-2 flex-grow-1 shadow-sm"
                        >
                          <CheckCircle2 size={18} />
                          <span>{reading.status === 'APPROVED' ? 'Onaylandı' : 'Verileri Onayla'}</span>
                        </Button>
                        <Button
                          variant="outline-danger"
                          disabled={reading.status === 'DENIED' || actionLoading}
                          onClick={() => setShowRejectInput(true)}
                          className="d-inline-flex align-items-center gap-1 px-3 py-2"
                        >
                          <XCircle size={18} />
                          <span>Reddet</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-danger-subtle p-3 rounded-3 border border-danger">
                      <Form.Control
                        size="sm"
                        as="textarea"
                        rows={2}
                        placeholder="Ret sebebini yazınız (Zorunlu)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mb-2 p-2"
                      />
                      <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setShowRejectInput(false)}>
                          İptal
                        </Button>
                        <Button variant="danger" size="sm" onClick={handleQuickDeny} disabled={actionLoading}>
                          Kaydı Reddet
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Col>

          {/* RIGHT COLUMN (7 Cols): Expanded Side-by-side PDF / Document Viewer & Upload */}
          <Col lg={7}>
            <div className="bg-white p-4 rounded-3 shadow-sm border h-100 d-flex flex-column">
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom gap-2">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2 text-primary">
                  <FileText size={20} />
                  <span>Gaz Alım Raporu / Belge Önizleme ({files.length})</span>
                </h6>
                {activeFile && (
                  <div className="d-flex align-items-center gap-2">
                    <a
                      href={activeFile.relativeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-primary btn-sm px-3 py-1.5 d-inline-flex align-items-center gap-1 fw-semibold"
                      title="Yeni Sekmede Aç"
                    >
                      <ExternalLink size={14} />
                      <span>Tam Ekran Aç</span>
                    </a>
                    <a
                      href={activeFile.relativeUrl}
                      download={activeFile.filename}
                      className="btn btn-outline-secondary btn-sm px-2.5 py-1.5 d-inline-flex align-items-center gap-1"
                      title="İndir"
                    >
                      <Download size={14} />
                    </a>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="px-2.5 py-1.5"
                      onClick={() => handleDeleteFile(activeFile._id)}
                      title="Dosyayı Sil"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>

              {/* File Selector Tabs if multiple files exist */}
              {files.length > 1 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {files.map((f, idx) => (
                    <Button
                      key={f._id || idx}
                      size="sm"
                      variant={idx === selectedFileIndex ? 'primary' : 'outline-secondary'}
                      onClick={() => setSelectedFileIndex(idx)}
                      className="px-3 py-1 small"
                    >
                      {f.filename || f.originalName}
                    </Button>
                  ))}
                </div>
              )}

              {/* Document Viewer or Empty Upload Prompt */}
              {hasFiles && activeFile ? (
                <div className="flex-grow-1 d-flex flex-column">
                  <div className="bg-light px-3 py-2 rounded-3 border mb-3 d-flex justify-content-between align-items-center small text-muted">
                    <span className="text-truncate">
                      <strong>Aktif Dosya:</strong> {activeFile.filename} 
                      {activeFile.originalName && activeFile.originalName !== activeFile.filename && ` (Kaynak: ${activeFile.originalName})`}
                    </span>
                    <Badge bg="secondary" className="px-2.5 py-1">{activeFile.uploadedBy || 'Sistem'}</Badge>
                  </div>

                  <div className="border rounded-3 overflow-hidden bg-dark flex-grow-1" style={{ minHeight: '620px' }}>
                    {isPdf ? (
                      <iframe
                        src={activeFile.relativeUrl}
                        title={activeFile.filename || 'PDF Raporu'}
                        width="100%"
                        height="620px"
                        style={{ border: 'none', display: 'block', minHeight: '620px' }}
                      />
                    ) : isImage ? (
                      <div className="text-center p-3 bg-dark h-100 d-flex align-items-center justify-content-center">
                        <img
                          src={activeFile.relativeUrl}
                          alt={activeFile.filename}
                          style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div className="text-center text-light p-5">
                        <File size={48} className="mb-3 text-warning" />
                        <p className="mb-3">{activeFile.filename}</p>
                        <a
                          href={activeFile.relativeUrl}
                          download
                          className="btn btn-primary"
                        >
                          Dosyayı İndir ve İncele
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center bg-light rounded-3 border p-5 text-center mb-3" style={{ minHeight: '420px' }}>
                  <UploadCloud size={56} className="text-secondary mb-3" />
                  <h5 className="fw-bold text-dark mb-2">Bu Okumaya Ait Rapor Dosyası Bulunamadı</h5>
                  <p className="text-muted small mb-3" style={{ maxWidth: '420px' }}>
                    Aksa RMSA üzerinde henüz otomatik rapor yüklenmemiş. Aşağıdaki alandan gaz alım raporunu manuel olarak yükleyebilirsiniz.
                  </p>
                </div>
              )}

              {/* Upload Form at the bottom of Right Column */}
              <Form onSubmit={handleUpload} className="mt-3 pt-3 border-top">
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <div className="flex-grow-1">
                    <Form.Control
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={uploading || selectedFiles.length === 0}
                    className="d-flex align-items-center gap-2 text-nowrap px-4"
                  >
                    {uploading ? (
                      <>
                        <Spinner size="sm" animation="border" />
                        <span>Yükleniyor...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={18} />
                        <span>{hasFiles ? 'Yeni Dosya Ekle' : 'Dosya Yükle'}</span>
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer className="bg-white py-3 px-4 border-top">
        <Button variant="secondary" className="px-4" onClick={onHide}>
          Kapat
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
