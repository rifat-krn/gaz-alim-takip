import React, { useState } from 'react';
import { Modal, Button, Form, Alert, ListGroup, Badge, Spinner } from 'react-bootstrap';
import { UploadCloud, File, Trash2, Download, Paperclip, CheckCircle } from 'lucide-react';
import api from '../api/axiosClient';

export default function FileUploadModal({ show, onHide, reading, onFilesUpdated }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!reading) return null;

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
        setSuccessMsg('Dosyalar başarıyla yüklendi!');
        setSelectedFiles([]);
        if (onFilesUpdated) {
          onFilesUpdated(res.data.reading);
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
        if (onFilesUpdated) {
          onFilesUpdated({ ...reading, files: res.data.files });
        }
      }
    } catch (err) {
      setError('Dosya silinirken hata oluştu');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const files = reading.files || [];

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
          <UploadCloud size={22} />
          <span>Belge / Dosya Yönetimi</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {(() => {
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
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h5 className="fw-bold mb-0 text-dark">{reading.stationName}</h5>
                <small className="text-muted">Gaz Günü: <strong>{reading.gasDate}</strong></small>
              </div>
              <Badge bg="info" className="p-2">
                📁 Klasör: {safeStation}-{yearMonth}
              </Badge>
            </div>
          );
        })()}

        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
        {successMsg && <Alert variant="success" className="py-2 small">{successMsg}</Alert>}

        {/* Upload Form */}
        <Form onSubmit={handleUpload} className="p-3 bg-light rounded border mb-4">
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold small d-flex align-items-center gap-1">
              <Paperclip size={16} />
              <span>Yeni Belge / Saha Fişi / Sayaç Fotoğrafı Yükle:</span>
            </Form.Label>
            <Form.Control
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Form.Text className="text-muted small">
              PDF, Excel, Word veya Resim formatları (Maks 100MB)
            </Form.Text>
          </Form.Group>

          <div className="d-flex justify-content-end">
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || selectedFiles.length === 0}
              className="d-flex align-items-center gap-2 btn-sm"
            >
              {uploading ? (
                <>
                  <Spinner size="sm" animation="border" />
                  <span>Yükleniyor...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Seçili Dosyaları Yükle ({selectedFiles.length})</span>
                </>
              )}
            </Button>
          </div>
        </Form>

        {/* Existing Files List */}
        <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
          <File size={18} className="text-secondary" />
          <span>Yüklü Dosyalar ({files.length})</span>
        </h6>

        {files.length === 0 ? (
          <div className="text-center py-4 bg-light rounded text-muted small">
            Henüz bu okumaya ait yüklenmiş bir dosya bulunmuyor.
          </div>
        ) : (
          <ListGroup variant="flush" className="border rounded">
            {files.map((file) => (
              <ListGroup.Item
                key={file._id}
                className="d-flex justify-content-between align-items-center py-2 px-3"
              >
                <div className="d-flex align-items-center gap-2 overflow-hidden">
                  <File size={18} className="text-primary flex-shrink-0" />
                  <div className="text-truncate">
                    <div className="fw-semibold text-truncate small">{file.filename || file.originalName}</div>
                    {file.filename && file.originalName && file.filename !== file.originalName && (
                      <div className="text-muted" style={{ fontSize: '10px' }}>
                        Orijinal: {file.originalName}
                      </div>
                    )}
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {formatBytes(file.size)} • {file.uploadedBy || 'Kullanıcı'} • {new Date(file.uploadedAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
                  <a
                    href={file.relativeUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn btn-outline-secondary btn-sm p-1"
                    title="İndir / Görüntüle"
                  >
                    <Download size={15} />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeleteFile(file._id)}
                    className="btn btn-outline-danger btn-sm p-1"
                    title="Sil"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={onHide}>
          Kapat
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
