import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { XCircle, AlertCircle } from 'lucide-react';

export default function DenyReasonModal({ show, onHide, onDeny, reading, loading }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  if (!reading) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Lütfen ret sebebini yazınız.');
      return;
    }
    setError('');
    onDeny(reading._id || reading.id, rejectionReason.trim());
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
            <XCircle size={22} />
            <span>Okumayı Reddet</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <div className="text-center mb-3">
            <h5 className="fw-bold mb-1">{reading.stationName}</h5>
            <p className="text-muted small mb-0">Gaz Günü: {reading.gasDate}</p>
          </div>

          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small">Ret Sebebi (Zorunlu) *:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              required
              placeholder="Örn: Basınç değeri olağandışı yüksek, saha kontrolü yapılacak."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Vazgeç
          </Button>
          <Button type="submit" variant="danger" disabled={loading} className="d-flex align-items-center gap-2">
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status"></span>
                <span>İşleniyor...</span>
              </>
            ) : (
              <>
                <XCircle size={18} />
                <span>Kaydı Reddet</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
