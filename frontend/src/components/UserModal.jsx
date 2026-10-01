import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { Users, Save } from 'lucide-react';
import api from '../api/axiosClient';

export default function UserModal({ show, onHide, user, onSave, loading }) {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'station_operator',
    assignedStation: '',
    stationU: '',
    isActive: true
  });
  const [stations, setStations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load station list for dropdown
    api.get('/stations').then(res => {
      if (res.data.success) setStations(res.data.stations);
    }).catch(console.error);
  }, [show]);

  useEffect(() => {
    if (user) {
      const stationId = user.assignedStation?._id || user.assignedStation || '';
      setFormData({
        username: user.username || '',
        fullName: user.fullName || '',
        password: '', // blank unless changing
        role: user.role || 'station_operator',
        assignedStation: stationId,
        stationU: user.stationU || '',
        isActive: user.isActive !== undefined ? user.isActive : true
      });
    } else {
      setFormData({
        username: '',
        fullName: '',
        password: '',
        role: 'station_operator',
        assignedStation: '',
        stationU: '',
        isActive: true
      });
    }
    setError('');
  }, [user, show]);

  const handleStationChange = (e) => {
    const stId = e.target.value;
    const selected = stations.find(s => s._id === stId);
    setFormData({
      ...formData,
      assignedStation: stId,
      stationU: selected ? selected.u : ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim()) {
      setError('Kullanıcı Adı ve Ad Soyad alanları zorunludur');
      return;
    }
    if (!user && !formData.password.trim()) {
      setError('Yeni kullanıcı için şifre zorunludur');
      return;
    }
    if (formData.role === 'station_operator' && !formData.assignedStation) {
      setError('İstasyon yetkilisi rolü için lütfen atanacak istasyonu seçiniz');
      return;
    }
    onSave(formData);
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <form onSubmit={handleSubmit}>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
            <Users size={20} />
            <span>{user ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Ad Soyad *</Form.Label>
            <Form.Control
              type="text"
              required
              placeholder="Örn: Kepez İstasyon Operatörü"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Kullanıcı Adı (Giriş) *</Form.Label>
            <Form.Control
              type="text"
              required
              placeholder="Örn: kepez"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              {user ? 'Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)' : 'Şifre *'}
            </Form.Label>
            <Form.Control
              type="password"
              placeholder={user ? '******' : 'Şifre giriniz (Örn: kepez123)'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </Form.Group>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="small fw-semibold">Yetki Rolü</Form.Label>
                <Form.Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="station_operator">İstasyon Operatörü (Tek İstasyon)</option>
                  <option value="admin">Yönetici (Tüm İstasyonlar & Admin)</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-6 d-flex align-items-center mt-3">
              <Form.Check
                type="switch"
                id="user-active-switch"
                label="Hesap Aktif"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </div>
          </div>

          {formData.role === 'station_operator' && (
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-primary">Atanacak İstasyon (Sadece bu istasyonu görebilir) *</Form.Label>
              <Form.Select
                value={formData.assignedStation}
                onChange={handleStationChange}
                required
              >
                <option value="">İstasyon Seçiniz...</option>
                {stations.map(st => (
                  <option key={st._id} value={st._id}>{st.name} ({st.u})</option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
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
