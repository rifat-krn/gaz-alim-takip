import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Users, Plus, Edit2, Trash2, Shield, User } from 'lucide-react';
import api from '../api/axiosClient';
import UserModal from '../components/UserModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Kullanıcılar yüklenemedi: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEdit = (u) => {
    setSelectedUser(u);
    setModalOpen(true);
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`'${u.fullName}' kullanıcısını silmek istediğinizden emin misiniz?`)) return;

    try {
      const res = await api.delete(`/users/${u._id}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Kullanıcı silindi' });
        loadUsers();
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Silme hatası: ' + (err.response?.data?.message || err.message) });
    }
  };

  const handleSave = async (formData) => {
    setSaveLoading(true);
    try {
      let res;
      if (selectedUser) {
        res = await api.put(`/users/${selectedUser._id}`, formData);
      } else {
        res = await api.post('/users', formData);
      }

      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        setModalOpen(false);
        loadUsers();
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Kaydetme hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div>
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-4">
          <Row className="align-items-center g-3">
            <Col md={6}>
              <div className="d-flex align-items-center gap-2">
                <Users size={24} className="text-primary" />
                <div>
                  <h4 className="fw-bold mb-0">Kullanıcı Yönetimi (Admin)</h4>
                  <small className="text-muted">Sistem Yöneticisi & Operatör Hesapları Yönetim Paneli</small>
                </div>
              </div>
            </Col>

            <Col md={6} className="text-md-end">
              <Button
                variant="primary"
                onClick={handleCreate}
                className="d-flex align-items-center gap-2 ms-auto"
              >
                <Plus size={18} />
                <span>Yeni Kullanıcı Ekle</span>
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
          <h5 className="fw-bold mb-0">Kayıtlı Kullanıcılar ({users.length})</h5>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Ad Soyad</th>
                    <th>Kullanıcı Adı</th>
                    <th>Rol / Yetki</th>
                    <th>Bağlı İstasyon</th>
                    <th className="text-center">Durum</th>
                    <th>Kayıt Tarihi</th>
                    <th className="text-end" style={{ width: '120px' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="fw-bold text-dark">{u.fullName}</td>
                      <td><code>{u.username}</code></td>
                      <td>
                        {u.role === 'admin' ? (
                          <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1">
                            <Shield size={12} />
                            <span>Yönetici (Admin)</span>
                          </Badge>
                        ) : (
                          <Badge bg="info" className="d-inline-flex align-items-center gap-1">
                            <User size={12} />
                            <span>İstasyon Yetkilisi</span>
                          </Badge>
                        )}
                      </td>
                      <td>
                        {u.assignedStation?.name ? (
                          <span className="fw-semibold text-primary">{u.assignedStation.name}</span>
                        ) : u.stationU ? (
                          <span className="fw-semibold text-primary">{u.stationU}</span>
                        ) : (
                          <span className="text-muted small">— (Tümü)</span>
                        )}
                      </td>
                      <td className="text-center">
                        {u.isActive ? (
                          <Badge bg="success">Aktif</Badge>
                        ) : (
                          <Badge bg="secondary">Pasif</Badge>
                        )}
                      </td>
                      <td className="text-muted small">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className="text-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="p-1 px-2 me-1"
                          onClick={() => handleEdit(u)}
                          title="Düzenle"
                        >
                          <Edit2 size={15} />
                        </Button>

                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="p-1 px-2"
                          onClick={() => handleDelete(u)}
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <UserModal
        show={modalOpen}
        onHide={() => setModalOpen(false)}
        user={selectedUser}
        onSave={handleSave}
        loading={saveLoading}
      />
    </div>
  );
}
