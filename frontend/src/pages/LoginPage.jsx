import React, { useState } from 'react';
import { Card, Form, Button, Alert, Container, Row, Col, Spinner } from 'react-bootstrap';
import { Flame, Lock, User, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Kullanıcı adı veya şifre hatalı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <div className="text-center mb-4">
              <div className="bg-warning text-dark p-3 rounded-circle d-inline-flex mb-3 shadow">
                <Flame size={48} />
              </div>
              <h2 className="text-white fw-bold mb-1">Gaz Alım Takip</h2>
              <p className="text-secondary small">İstasyon Sayaç & Gaz Tüketim Yönetim Sistemi</p>
            </div>

            <Card className="shadow-lg border-0 rounded-4">
              <Card.Body className="p-4 p-md-5">
                <h4 className="fw-bold text-dark mb-4 text-center">Sisteme Giriş</h4>

                {error && <Alert variant="danger" className="py-2 small mb-3">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold text-muted">Kullanıcı Adı</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <User size={18} className="text-muted" />
                      </span>
                      <Form.Control
                        type="text"
                        required
                        className="border-start-0 ps-0"
                        placeholder="Kullanıcı adınızı girin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-semibold text-muted">Şifre</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <Lock size={18} className="text-muted" />
                      </span>
                      <Form.Control
                        type="password"
                        required
                        className="border-start-0 ps-0"
                        placeholder="Şifrenizi girin"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="warning"
                    size="lg"
                    disabled={loading}
                    className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2.5 shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" animation="border" />
                        <span>Giriş Yapılıyor...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={20} />
                        <span>Giriş Yap</span>
                      </>
                    )}
                  </Button>
                </Form>

                <div className="mt-4 pt-3 border-top text-center text-muted" style={{ fontSize: '11px' }}>
                  <div><strong>Yönetici (Tüm İstasyonlar):</strong> <code>admin</code> / <code>admin123</code></div>
                  <div className="mt-1"><strong>İstasyon Girişleri (Tek İstasyon):</strong> <code>kepez</code> / <code>kepez123</code>, <code>ezine2</code> / <code>ezine2123</code>, <code>can</code> / <code>can123</code> vb.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
