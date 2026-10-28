import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Badge, Row, Col } from 'react-bootstrap';
import { 
  CheckCircle2, AlertTriangle, FileText, ExternalLink, Download, 
  Flame, Activity, Gauge, Thermometer, Scale, Calendar
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
      dialogClassName={hasFiles ? 'confirm-modal-wide' : 'confirm-modal-medium'}
    >
      <style>{`
        .confirm-modal-wide {
          max-width: 96vw !important;
          width: 96vw !important;
        }
        .confirm-modal-medium {
          max-width: 720px !important;
        }
        .metric-box {
          padding: 1.15rem 1.25rem;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #e9ecef;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          transition: all 0.2s ease;
          height: 100%;
        }
        .metric-box:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }
        .metric-box-primary {
          background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
          border-left: 4px solid #0d6efd;
        }
        .metric-box-success {
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
          border-left: 4px solid #198754;
        }
        .metric-box-warning {
          background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
          border-left: 4px solid #f59e0b;
        }
      `}</style>

      <Modal.Header closeButton className="bg-success text-white py-3 px-4 border-0">
        <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0 fw-bold">
          <CheckCircle2 size={24} />
          <span>Gaz Alım Verisi Kontrol & Onay Ekranı</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4" style={{ backgroundColor: '#f8fafc' }}>
        <Row className="g-4">
          {/* Sol Panel: İstasyon Bilgisi ve Ölçüm Verileri */}
          <Col lg={hasFiles ? 5 : 12}>
            <div className="d-flex flex-column h-100 justify-content-between">
              <div>
                {/* İstasyon Başlık Kartı */}
                <div className="bg-white p-4 rounded-3 shadow-sm border mb-3 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-success-subtle text-success p-3 rounded-circle d-inline-flex align-items-center justify-content-center">
                      <CheckCircle2 size={30} />
                    </div>
                    <div>
                      <h5 className="fw-bold mb-1 text-dark">{reading.stationName}</h5>
                      <div className="text-muted small d-flex align-items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        <span>Gaz Günü: <strong className="text-dark">{reading.gasDate}</strong></span>
                        <span>•</span>
                        <code>{reading.u}</code>
                      </div>
                    </div>
                  </div>
                  <Badge bg={hasFiles ? 'primary' : 'secondary'} className="px-3 py-2 rounded-pill">
                    {hasFiles ? `${files.length} Rapor Mevcut` : 'Rapor Yok'}
                  </Badge>
                </div>

                {/* Bilgilendirme Kutusu */}
                <Alert variant="warning" className="d-flex align-items-center gap-3 p-3 rounded-3 border-0 shadow-sm mb-3">
                  <AlertTriangle size={22} className="flex-shrink-0 text-warning-emphasis" />
                  <div className="small lh-base">
                    {hasFiles 
                      ? 'Sağ taraftaki PDF gaz alım raporundaki değerler ile aşağıdaki sistem ölçüm verilerini karşılaştırarak onaylayınız.'
                      : 'Verileri son kez kontrol ettiniz mi? Bu işlem kaydı ONAYLANDI (APPROVED) durumuna geçirecektir.'}
                  </div>
                </Alert>

                {/* Ölçüm Veri Kutuları (Modern Paddingli Kartlar) */}
                <Row className="g-3 mb-3">
                  <Col sm={6}>
                    <div className="metric-box metric-box-primary">
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
                    <div className="metric-box metric-box-success">
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
                    <div className="metric-box metric-box-warning">
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
                        <Badge bg="info" className="mt-2" style={{ fontSize: '10px' }}>
                          7 Nolu İkame Ho Aktif
                        </Badge>
                      )}
                    </div>
                  </Col>

                  <Col sm={6}>
                    <div className="metric-box">
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

                  <Col sm={6}>
                    <div className="metric-box">
                      <div className="d-flex align-items-center justify-content-between text-muted small fw-semibold mb-2">
                        <span>ÖZGÜL AĞIRLIK (SG)</span>
                        <Scale size={16} className="text-secondary" />
                      </div>
                      <div className="fs-5 fw-bold text-dark">
                        {reading.specificGravity ?? '—'}
                      </div>
                    </div>
                  </Col>

                  <Col sm={6}>
                    <div className="metric-box">
                      <div className="d-flex align-items-center justify-content-between text-muted small fw-semibold mb-2">
                        <span>YÜKLÜ BELGE DURUMU</span>
                        <FileText size={16} className="text-secondary" />
                      </div>
                      <div className="fw-bold text-dark d-flex align-items-center gap-2 mt-1">
                        {hasFiles ? (
                          <span className="text-success">{reading.files.length} Rapor Yüklü</span>
                        ) : (
                          <span className="text-muted">Dosya yüklenmedi</span>
                        )}
                      </div>
                    </div>
                  </Col>
                </Row>

                {reading.operatorNote && (
                  <div className="bg-info-subtle text-info-emphasis p-3 rounded-3 border border-info-subtle mb-3 small">
                    <strong>📝 İstasyon / Operatör Notu:</strong> {reading.operatorNote}
                  </div>
                )}
              </div>

              {/* Onay Notu Giriş Alanı */}
              <div className="bg-white p-4 rounded-3 shadow-sm border mt-2">
                <Form.Group>
                  <Form.Label className="fw-bold small text-dark mb-2">
                    Onay Notu / Açıklama (İsteğe bağlı):
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    className="p-3"
                    placeholder="Örn: Sayaç, üst ısıl değer ve PDF raporu kontrol edildi, tüm değerler uyumlu."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Form.Group>
              </div>
            </div>
          </Col>

          {/* Sağ Panel: Genişletilmiş PDF / Dosya Görüntüleme Ekranı */}
          {hasFiles && activeFile && (
            <Col lg={7}>
              <div className="bg-white rounded-3 shadow-sm border p-3 h-100 d-flex flex-column">
                <div className="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-3 border-bottom gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="bg-primary-subtle text-primary p-2 rounded">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="fw-bold text-dark">{activeFile.filename || activeFile.originalName}</div>
                      {activeFile.originalName && activeFile.originalName !== activeFile.filename && (
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          Orijinal Rapor: {activeFile.originalName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {files.length > 1 && files.map((f, idx) => (
                      <Button
                        key={f._id || idx}
                        size="sm"
                        variant={idx === selectedFileIndex ? 'primary' : 'outline-secondary'}
                        onClick={() => setSelectedFileIndex(idx)}
                        className="px-3 py-1"
                      >
                        Rapor #{idx + 1}
                      </Button>
                    ))}
                    <a
                      href={activeFile.relativeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-primary btn-sm px-3 py-1.5 d-inline-flex align-items-center gap-1 fw-semibold"
                    >
                      <ExternalLink size={15} />
                      <span>Yeni Sekmede Aç</span>
                    </a>
                    <a
                      href={activeFile.relativeUrl}
                      download={activeFile.filename}
                      className="btn btn-outline-secondary btn-sm px-2.5 py-1.5 d-inline-flex align-items-center"
                      title="İndir"
                    >
                      <Download size={15} />
                    </a>
                  </div>
                </div>

                <div className="border rounded-3 overflow-hidden bg-dark flex-grow-1" style={{ minHeight: '640px' }}>
                  {isPdf ? (
                    <iframe
                      src={activeFile.relativeUrl}
                      title={activeFile.filename}
                      width="100%"
                      height="640px"
                      style={{ border: 'none', display: 'block', minHeight: '640px' }}
                    />
                  ) : (
                    <div className="text-center text-light p-5 d-flex flex-column align-items-center justify-content-center h-100">
                      <FileText size={48} className="mb-3 text-warning" />
                      <h6 className="mb-3">{activeFile.filename}</h6>
                      <a href={activeFile.relativeUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                        Dosyayı Görüntüle / İndir
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          )}
        </Row>
      </Modal.Body>

      <Modal.Footer className="bg-white py-3 px-4 border-top">
        <Button variant="outline-secondary" className="px-4 py-2" onClick={onHide} disabled={loading}>
          Vazgeç
        </Button>
        <Button variant="success" onClick={handleConfirm} disabled={loading} className="px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm">
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Onaylanıyor...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              <span>Evet, Verileri Onayla</span>
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
