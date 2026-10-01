import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Database, Plus, Edit2, Trash2, CheckCircle2, XCircle, RefreshCw, Radio, PlayCircle } from 'lucide-react';
import api from '../api/axiosClient';
import StationModal from '../components/StationModal';

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [testStatus, setTestStatus] = useState({}); // { [stationId]: { loading, result } }
  const [message, setMessage] = useState(null);

  const loadStations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stations');
      if (res.data.success) {
        setStations(res.data.stations);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'İstasyonlar yüklenemedi: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleCreate = () => {
    setSelectedStation(null);
    setModalOpen(true);
  };

  const handleEdit = (st) => {
    setSelectedStation(st);
    setModalOpen(true);
  };

  const handleDelete = async (st) => {
    if (!window.confirm(`'${st.name}' istasyonunu silmek istediğinizden emin misiniz?`)) return;

    try {
      const res = await api.delete(`/stations/${st._id}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'İstasyon silindi' });
        loadStations();
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Silme hatası: ' + (err.response?.data?.message || err.message) });
    }
  };

  const handleSave = async (formData) => {
    setSaveLoading(true);
    try {
      let res;
      if (selectedStation) {
        res = await api.put(`/stations/${selectedStation._id}`, formData);
      } else {
        res = await api.post('/stations', formData);
      }

      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        setModalOpen(false);
        loadStations();
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Kaydetme hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSyncJson = async () => {
    setSyncLoading(true);
    setMessage(null);
    try {
      const res = await api.post('/stations/sync-json');
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        loadStations();
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Senkronizasyon hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleTestLogin = async (st) => {
    setTestStatus(prev => ({ ...prev, [st._id]: { loading: true } }));
    try {
      const res = await api.post(`/stations/${st._id}/test-login`);
      setTestStatus(prev => ({
        ...prev,
        [st._id]: { loading: false, success: res.data.success, message: res.data.message }
      }));
    } catch (err) {
      setTestStatus(prev => ({
        ...prev,
        [st._id]: { loading: false, success: false, message: err.response?.data?.message || err.message }
      }));
    }
  };

  return (
    <div>
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-4">
          <Row className="align-items-center g-3">
            <Col md={6}>
              <div className="d-flex align-items-center gap-2">
                <Database size={24} className="text-primary" />
                <div>
                  <h4 className="fw-bold mb-0">İstasyon Yönetimi (Admin)</h4>
                  <small className="text-muted">Aksa OYS İstasyon ve Giriş Bilgileri CRUD Paneli</small>
                </div>
              </div>
            </Col>

            <Col md={6} className="text-md-end d-flex flex-wrap gap-2 justify-content-md-end">
              <Button
                variant="outline-secondary"
                onClick={handleSyncJson}
                disabled={syncLoading}
                className="d-flex align-items-center gap-2"
                title="istasyon_listesi.json dosyasından istasyonları aktar/güncelle"
              >
                <RefreshCw size={16} className={syncLoading ? 'spin' : ''} />
                <span>JSON'dan İçe Aktar</span>
              </Button>

              <Button
                variant="primary"
                onClick={handleCreate}
                className="d-flex align-items-center gap-2"
              >
                <Plus size={18} />
                <span>Yeni İstasyon Ekle</span>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {message && (
        <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="shadow-sm">
          {message.text}
        </Alert>
      )}

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0">Kayıtlı İstasyonlar ({stations.length})</h5>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : stations.length === 0 ? (
            <div className="text-center py-5 text-muted">
              Henüz istasyon kaydı bulunamadı. "JSON'dan İçe Aktar" butonunu kullanarak istasyon_listesi.json dosyasını yükleyebilirsiniz.
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }}>Sıra</th>
                    <th>İstasyon Tanımı</th>
                    <th>OYS Kullanıcı Adı (u)</th>
                    <th>OYS Şifresi (p)</th>
                    <th>Açıklama</th>
                    <th className="text-center">Durum</th>
                    <th className="text-center">OYS Bağlantı Testi</th>
                    <th className="text-end" style={{ width: '150px' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((st) => {
                    const test = testStatus[st._id];

                    return (
                      <tr key={st._id}>
                        <td className="text-muted fw-bold">{st.order}</td>
                        <td className="fw-bold text-dark">{st.name}</td>
                        <td><code>{st.u}</code></td>
                        <td><code>••••••••</code></td>
                        <td className="text-muted small">{st.description || '—'}</td>
                        <td className="text-center">
                          {st.isActive ? (
                            <Badge bg="success">Aktif</Badge>
                          ) : (
                            <Badge bg="secondary">Pasif</Badge>
                          )}
                        </td>
                        <td className="text-center">
                          <Button
                            variant="outline-info"
                            size="sm"
                            disabled={test?.loading}
                            onClick={() => handleTestLogin(st)}
                            className="d-inline-flex align-items-center gap-1 py-0.5 px-2 small"
                          >
                            <PlayCircle size={14} />
                            <span>{test?.loading ? 'Test ediliyor...' : 'Giriş Test Et'}</span>
                          </Button>
                          {test && !test.loading && (
                            <div className="mt-1" style={{ fontSize: '11px' }}>
                              {test.success ? (
                                <span className="text-success fw-semibold">✓ Bağlantı Başarılı</span>
                              ) : (
                                <span className="text-danger">✗ {test.message}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="p-1 px-2 me-1"
                            onClick={() => handleEdit(st)}
                            title="Düzenle"
                          >
                            <Edit2 size={15} />
                          </Button>

                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="p-1 px-2"
                            onClick={() => handleDelete(st)}
                            title="Sil"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <StationModal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        station={selectedStation}
        onSave={handleSave}
        loading={saveLoading}
      />
    </div>
  );
}
