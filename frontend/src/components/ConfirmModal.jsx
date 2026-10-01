import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function ConfirmModal({ show, onHide, onConfirm, reading, loading }) {
  const [notes, setNotes] = useState('');

  if (!reading) return null;

  const handleConfirm = () => {
    onConfirm(reading._id || reading.id, notes);
    setNotes('');
  };

  const hasFiles = reading.files && reading.files.length > 0;

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="bg-success text-white">
        <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
          <CheckCircle2 size={22} />
          <span>Gaz Alım Onayı</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="text-center mb-4">
          <div className="avatar bg-success-subtle text-success p-3 rounded-circle d-inline-flex mb-2">
            <CheckCircle2 size={40} />
          </div>
          <h5 className="fw-bold mb-1">{reading.stationName}</h5>
          <p className="text-muted small mb-0">Gaz Günü: <strong className="text-dark">{reading.gasDate}</strong></p>
        </div>

        <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 small">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>
            Verileri son kez kontrol ettiniz mi? Bu işlem kaydı <strong>ONAYLANDI (APPROVED)</strong> durumuna geçirecektir.
          </span>
        </Alert>

        <div className="bg-light p-3 rounded border mb-3">
          <div className="row g-2 text-sm">
            <div className="col-6">
              <span className="text-muted small">Tüketim (Sm³):</span>
              <div className="fw-bold text-primary fs-6">
                {reading.consumption !== null && reading.consumption !== undefined
                  ? Number(reading.consumption).toLocaleString('tr-TR') + ' Sm³'
                  : '—'}
              </div>
            </div>
            <div className="col-6">
              <span className="text-muted small">Enerji:</span>
              <div className="fw-bold text-dark fs-6">
                {reading.energy !== null && reading.energy !== undefined
                  ? Number(reading.energy).toLocaleString('tr-TR') + ' kcal'
                  : '—'}
              </div>
            </div>
            <div className="col-6">
              <span className="text-muted small">Basınç:</span>
              <div className="fw-bold">{reading.pressure ? `${reading.pressure} Bar` : '—'}</div>
            </div>
            <div className="col-6">
              <span className="text-muted small">Yüklü Belge:</span>
              <div className="fw-bold d-flex align-items-center gap-1">
                <FileText size={14} />
                <span>{hasFiles ? `${reading.files.length} dosya mevcut` : 'Dosya yüklenmedi'}</span>
              </div>
            </div>
          </div>
        </div>

        <Form.Group>
          <Form.Label className="small fw-semibold">Onay Notu / Açıklama (İsteğe bağlı):</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Örn: Sayaç ve basınç değerleri saha kontrolüyle eşleşti."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Vazgeç
        </Button>
        <Button variant="success" onClick={handleConfirm} disabled={loading} className="d-flex align-items-center gap-2">
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Onaylanıyor...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>Evet, Onayla</span>
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
