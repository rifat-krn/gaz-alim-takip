import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { Database, Save } from 'lucide-react';

export default function StationModal({ show, onHide, station, onSave, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    u: '',
    p: '',
    description: '',
    order: 0,
    isActive: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name || '',
        u: station.u || '',
        p: station.p || '',
        description: station.description || '',
        order: station.order || 0,
        isActive: station.isActive !== undefined ? station.isActive : true
      });
    } else {
      setFormData({
        name: '',
        u: '',
        p: '',
        description: '',
        order: 0,
        isActive: true
      });
    }
    setError('');
  }, [station, show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.u.trim() || !formData.p.trim()) {
      setError('İstasyon Adı, OYS Kullanıcı Adı (u) ve Şifre (p) zorunludur');
      return;
    }
    onSave(formData);
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
            <Database size={20} />
            <span>{station ? 'İstasyonu Düzenle' : 'Yeni İstasyon Ekle'}</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">İstasyon Tanımı / Adı *</Form.Label>
            <Form.Control
              type="text"
              required
              placeholder="Örn: Kepez İstasyonu"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Form.Group>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-semibold">OYS Kullanıcı Adı (u) *</Form.Label>
                <Form.Control
                  type="text"
                  required
                  placeholder="Örn: kepez"
                  value={formData.u}
                  onChange={(e) => setFormData({ ...formData, u: e.target.value })}
                />
              </Form.Group>
            </div>

            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-semibold">OYS Şifresi (p) *</Form.Label>
                <Form.Control
                  type="text"
                  required
                  placeholder="Örn: kepez"
                  value={formData.p}
                  onChange={(e) => setFormData({ ...formData, p: e.target.value })}
                />
              </Form.Group>
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-semibold">Sıralama (Order)</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </Form.Group>
            </div>

            <div className="col-md-6 d-flex align-items-center mt-3">
              <Form.Check
                type="switch"
                id="station-active-switch"
                label="İstasyon Aktif"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </div>
          </div>

          <Form.Group>
            <Form.Label className="small fw-semibold">Açıklama / Lokasyon Notu</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="İstasyon hakkında ek bilgi..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Vazgeç
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="d-flex align-items-center gap-2">
            <Save size={18} />
            <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
