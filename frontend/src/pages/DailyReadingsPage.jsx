import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, Alert, Spinner, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { 
  RefreshCw, CheckCircle2, XCircle, Upload, Eye, FileText, 
  Calendar, Check, AlertTriangle, DownloadCloud, FileSpreadsheet, ShieldAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api/axiosClient';
import ConfirmModal from '../components/ConfirmModal';
import DenyReasonModal from '../components/DenyReasonModal';
import FileUploadModal from '../components/FileUploadModal';
import ReadingDetailModal from '../components/ReadingDetailModal';

// Helper to get default gas date (yesterday's date in YYYY-MM-DD)
const getDefaultGasDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export default function DailyReadingsPage() {
  const [selectedDate, setSelectedDate] = useState(getDefaultGasDate);
  const [readings, setReadings] = useState([]);
  const [gasInfo, setGasInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchingSingleId, setFetchingSingleId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Modals state
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [denyModalData, setDenyModalData] = useState(null);
  const [uploadModalData, setUploadModalData] = useState(null);
  const [detailModalData, setDetailModalData] = useState(null);

  // Auto-fetch all stations live on load and date change
  const fetchAllForDate = async (targetDate) => {
    setFetchingAll(true);
    setMessage(null);
    try {
      const res = await api.post('/readings/fetch-all', { gasDate: targetDate });
      if (res.data.success) {
        setReadings(res.data.readings);
        setGasInfo(res.data.gasInfo);
      }
    } catch (err) {
      // If live fetch has an error, fallback to loading existing records
      try {
        const fallbackRes = await api.get(`/readings/by-date?gasDate=${targetDate}`);
        if (fallbackRes.data.success) {
          setReadings(fallbackRes.data.readings);
          setGasInfo(fallbackRes.data.gasInfo);
        }
      } catch (fallbackErr) {
        // ignore
      }
      setMessage({ type: 'danger', text: 'Canlı veri çekme hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setFetchingAll(false);
    }
  };

  useEffect(() => {
    fetchAllForDate(selectedDate);
  }, [selectedDate]);

  // Manual refresh button
  const handleFetchAll = () => {
    fetchAllForDate(selectedDate);
  };

  // Fetch single station
  const handleFetchSingle = async (reading) => {
    const stationId = reading.stationId?._id || reading.stationId;
    if (!stationId) return;

    setFetchingSingleId(stationId);
    try {
      const res = await api.post('/readings/fetch-single', {
        stationId,
        gasDate: selectedDate
      });

      if (res.data.success) {
        // Update reading in state
        setReadings(prev => prev.map(r => (r.u === reading.u ? res.data.reading : r)));
        setMessage({ type: 'success', text: `${reading.stationName} verisi güncellendi.` });
      } else {
        setMessage({ type: 'warning', text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'İstasyon verisi çekilemedi: ' + (err.response?.data?.message || err.message) });
    } finally {
      setFetchingSingleId(null);
    }
  };

  // Approve Reading
  const handleApprove = async (readingId, notes) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/readings/${readingId}/approve`, { notes });
      if (res.data.success) {
        setReadings(prev => prev.map(r => (r._id === readingId ? res.data.reading : r)));
        setMessage({ type: 'success', text: res.data.message });
        setConfirmModalData(null);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Onaylama hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  // Deny Reading
  const handleDeny = async (readingId, rejectionReason) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/readings/${readingId}/deny`, { rejectionReason });
      if (res.data.success) {
        setReadings(prev => prev.map(r => (r._id === readingId ? res.data.reading : r)));
        setMessage({ type: 'warning', text: res.data.message });
        setDenyModalData(null);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Reddetme hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  // Files or reading updated callback
  const handleFilesUpdated = (updatedReading) => {
    setReadings(prev => prev.map(r => (r.u === updatedReading.u ? updatedReading : r)));
    if (uploadModalData && uploadModalData.u === updatedReading.u) {
      setUploadModalData(updatedReading);
    }
    if (detailModalData && detailModalData.u === updatedReading.u) {
      setDetailModalData(updatedReading);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const exportData = readings.map((r, idx) => ({
      'No': idx + 1,
      'İstasyon Adı': r.stationName,
      'Kullanıcı Kodu': r.u,
      'Gaz Günü': r.gasDate,
      'dt1 (Başlangıç)': r.dt1,
      'dt3 (Bitiş)': r.dt3,
      'Tüketim (Sm³)': r.consumption || 0,
      'Enerji (kcal)': r.energy || 0,
      'Üst Isıl Değer (Ho)': r.superiorHeatingValue || 0,
      'Basınç (Bar)': r.pressure || 0,
      'Sıcaklık (°C)': r.temperature || 0,
      'Durum': r.status === 'APPROVED' ? 'ONAYLANDI' : r.status === 'DENIED' ? 'REDDEDİLDİ' : 'BEKLEMEDE',
      'İşlem Yapan': r.approvalInfo?.actionBy || '',
      'İşlem Tarihi ve Saati': r.approvalInfo?.actionAt ? new Date(r.approvalInfo.actionAt).toLocaleString('tr-TR') : '',
      'Yüklü Dosya Sayısı': r.files ? r.files.length : 0,
      'Açıklama / Not': r.operatorNote || r.approvalInfo?.notes || r.approvalInfo?.rejectionReason || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Gaz_Okumalari_${selectedDate}`);
    XLSX.writeFile(wb, `Gaz_Alim_Raporu_${selectedDate}.xlsx`);
  };

  // Calculate totals
  const totalConsumption = readings.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalEnergy = readings.reduce((sum, r) => sum + (Number(r.energy) || 0), 0);
  const approvedCount = readings.filter(r => r.status === 'APPROVED').length;
  const pendingCount = readings.filter(r => r.status === 'PENDING').length;
  const deniedCount = readings.filter(r => r.status === 'DENIED').length;

  return (
    <div>
      {/* Top Header & Filters */}
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-4">
          <Row className="align-items-center g-3">
            <Col lg={4} md={6}>
              <div className="d-flex align-items-center gap-2">
                <Calendar size={22} className="text-primary" />
                <div>
                  <Form.Label className="fw-bold mb-0 small text-muted">Gaz Günü Seçimi</Form.Label>
                  <Form.Control
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="fw-bold shadow-sm"
                  />
                </div>
              </div>
            </Col>

            <Col lg={5} md={6}>
              {gasInfo && (
                <div className="bg-light p-2.5 rounded border small">
                  <div className="text-muted" style={{ fontSize: '11px' }}>OYS ZAMAN ARALIĞI (24 Saatlik Gaz Günü)</div>
                  <div className="fw-semibold text-dark">
                    <span className="text-primary">{gasInfo.dt1}</span> &rarr; <span className="text-success">{gasInfo.dt3}</span>
                  </div>
                </div>
              )}
            </Col>

            <Col lg={3} className="text-lg-end d-flex flex-wrap gap-2 justify-content-lg-end">
              <Button
                variant="primary"
                onClick={handleFetchAll}
                disabled={fetchingAll || loading}
                className="d-flex align-items-center gap-2 shadow-sm fw-semibold"
              >
                <RefreshCw size={18} className={fetchingAll ? 'spin' : ''} />
                <span>{fetchingAll ? 'Veriler Çekiliyor...' : 'Tüm İstasyonları Çek'}</span>
              </Button>

              <Button
                variant="outline-success"
                onClick={handleExportExcel}
                disabled={readings.length === 0}
                className="d-flex align-items-center gap-1 shadow-sm"
                title="Excel Olarak İndir"
              >
                <FileSpreadsheet size={18} />
                <span>Excel</span>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Message Alert */}
      {message && (
        <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="shadow-sm">
          {message.text}
        </Alert>
      )}

      {/* Summary Stat Cards */}
      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <Card className="border-0 shadow-sm bg-white border-start border-4 border-primary">
            <Card.Body className="p-3">
              <div className="text-muted small fw-semibold">Toplam Tüketim (Sm³)</div>
              <h3 className="fw-bold text-primary mb-0 mt-1">
                {totalConsumption.toLocaleString('tr-TR')} <small className="fs-6 text-muted">Sm³</small>
              </h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6}>
          <Card className="border-0 shadow-sm bg-white border-start border-4 border-info">
            <Card.Body className="p-3">
              <div className="text-muted small fw-semibold">Toplam Enerji (kcal)</div>
              <h3 className="fw-bold text-info mb-0 mt-1">
                {totalEnergy.toLocaleString('tr-TR')} <small className="fs-6 text-muted">kcal</small>
              </h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={2} sm={4}>
          <Card className="border-0 shadow-sm bg-white border-start border-4 border-success">
            <Card.Body className="p-3">
              <div className="text-muted small fw-semibold">Onaylanan</div>
              <h3 className="fw-bold text-success mb-0 mt-1">{approvedCount} / {readings.length}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={2} sm={4}>
          <Card className="border-0 shadow-sm bg-white border-start border-4 border-warning">
            <Card.Body className="p-3">
              <div className="text-muted small fw-semibold">Bekleyen</div>
              <h3 className="fw-bold text-warning mb-0 mt-1">{pendingCount}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={2} sm={4}>
          <Card className="border-0 shadow-sm bg-white border-start border-4 border-danger">
            <Card.Body className="p-3">
              <div className="text-muted small fw-semibold">Reddedilen</div>
              <h3 className="fw-bold text-danger mb-0 mt-1">{deniedCount}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Readings Table */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark">İstasyon Sayaç & Alım Tablosu</h5>
          <span className="badge bg-secondary">{readings.length} İstasyon Listelendi</span>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="mt-2 text-muted">İstasyon verileri yükleniyor...</div>
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center py-5 text-muted">
              Kayıtlı istasyon bulunamadı. Lütfen İstasyon Yönetimi sayfasından istasyonları yükleyin.
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0 table-striped">
                <thead className="table-dark text-nowrap">
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>İstasyon Adı</th>
                    <th>Kullanıcı (u)</th>
                    <th className="text-end">Tüketim (Sm³)</th>
                    <th className="text-end">Enerji (kcal)</th>
                    <th className="text-center">Basınç (Bar)</th>
                    <th className="text-center">Sıcaklık (°C)</th>
                    <th className="text-center">Üst Isıl (Ho)</th>
                    <th className="text-center">Durum</th>
                    <th className="text-center">Belgeler</th>
                    <th className="text-center" style={{ minWidth: '220px' }}>Kontrol & Onay İşlemleri</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading, index) => {
                    const isApproved = reading.status === 'APPROVED';
                    const isDenied = reading.status === 'DENIED';
                    const isPending = reading.status === 'PENDING';
                    const hasFiles = reading.files && reading.files.length > 0;
                    const stationId = reading.stationId?._id || reading.stationId;

                    return (
                      <tr key={reading.u || index} className={isApproved ? 'table-success-subtle' : isDenied ? 'table-danger-subtle' : ''}>
                        <td className="text-muted small">{index + 1}</td>
                        <td>
                          <div className="fw-bold text-dark">{reading.stationName}</div>
                          {reading.operatorNote && (
                            <div className="text-primary small" style={{ fontSize: '11px' }} title={reading.operatorNote}>
                              📝 {reading.operatorNote.length > 40 ? reading.operatorNote.slice(0, 40) + '...' : reading.operatorNote}
                            </div>
                          )}
                          {reading.fetchStatus?.errorMessage && (
                            <div className="text-danger small" style={{ fontSize: '11px' }}>
                              ⚠️ {reading.fetchStatus.errorMessage}
                            </div>
                          )}
                        </td>
                        <td>
                          <code>{reading.u}</code>
                        </td>
                        <td className="text-end fw-bold text-primary">
                          {reading.consumption !== null && reading.consumption !== undefined
                            ? Number(reading.consumption).toLocaleString('tr-TR')
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-end fw-semibold">
                          {reading.energy !== null && reading.energy !== undefined
                            ? Number(reading.energy).toLocaleString('tr-TR')
                            : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-center">
                          {reading.pressure !== null && reading.pressure !== undefined ? `${reading.pressure}` : '—'}
                        </td>
                        <td className="text-center">
                          {reading.temperature !== null && reading.temperature !== undefined ? `${reading.temperature}` : '—'}
                        </td>
                        <td className="text-center">
                          {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined ? (
                            <div>
                              <span className="fw-bold">{Number(reading.superiorHeatingValue).toLocaleString('tr-TR')}</span>
                              {reading.isSubstitutedSHV && (
                                <div>
                                  <Badge bg="info" className="p-1" style={{ fontSize: '9px' }} title="7 nolu veri / Başka istasyon ısıl değeri kullanıldı">
                                    İkame Ho (7 Nolu)
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-center">
                          {isApproved && (
                            <div>
                              <Badge bg="success">ONAYLANDI</Badge>
                              {reading.approvalInfo?.actionAt && (
                                <div className="text-success fw-semibold mt-1" style={{ fontSize: '10px' }}>
                                  {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {reading.approvalInfo.actionBy && <div className="text-muted" style={{ fontSize: '9px' }}>({reading.approvalInfo.actionBy})</div>}
                                </div>
                              )}
                            </div>
                          )}
                          {isDenied && (
                            <div>
                              <Badge bg="danger">REDDEDİLDİ</Badge>
                              {reading.approvalInfo?.actionAt && (
                                <div className="text-danger fw-semibold mt-1" style={{ fontSize: '10px' }}>
                                  {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {reading.approvalInfo.actionBy && <div className="text-muted" style={{ fontSize: '9px' }}>({reading.approvalInfo.actionBy})</div>}
                                </div>
                              )}
                            </div>
                          )}
                          {isPending && (
                            reading.fetchStatus?.isFetched 
                              ? <Badge bg="warning" text="dark">KONTROL BEKLİYOR</Badge>
                              : <Badge bg="secondary">VERİ BEKLENİYOR</Badge>
                          )}
                        </td>

                        {/* File Upload / View Button */}
                        <td className="text-center">
                          <div className="d-inline-flex align-items-center gap-1">
                            {hasFiles ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="p-1 px-2 d-inline-flex align-items-center gap-1"
                                  onClick={() => setDetailModalData(reading)}
                                  title="PDF Raporu ve Verileri Yan Yana İncele"
                                >
                                  <FileText size={14} />
                                  <span className="small">{reading.files.length} Rapor</span>
                                </Button>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  className="p-1"
                                  onClick={() => setUploadModalData(reading)}
                                  title="Ek Dosya Yükle / Yönet"
                                >
                                  <Upload size={13} />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="p-1 px-2 d-inline-flex align-items-center gap-1"
                                onClick={() => setUploadModalData(reading)}
                                title="Rapor Dosyası Yükle"
                              >
                                <Upload size={14} />
                                <span className="small">Dosya Yükle</span>
                              </Button>
                            )}
                          </div>
                        </td>

                        {/* Actions (Approve, Deny, Details, Refresh) */}
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            {/* Detail inspection */}
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="p-1 px-2"
                              onClick={() => setDetailModalData(reading)}
                              title="Detay & Analiz İncele"
                            >
                              <Eye size={15} />
                            </Button>

                            {/* Single Re-fetch */}
                            <Button
                              variant="outline-dark"
                              size="sm"
                              className="p-1 px-2"
                              disabled={fetchingSingleId === stationId}
                              onClick={() => handleFetchSingle(reading)}
                              title="Bu İstasyonu Tekrar Çek"
                            >
                              <RefreshCw size={15} className={fetchingSingleId === stationId ? 'spin' : ''} />
                            </Button>

                            {/* Approve Button */}
                            <Button
                              variant="success"
                              size="sm"
                              disabled={isApproved || actionLoading}
                              className="d-inline-flex align-items-center gap-1 px-2"
                              onClick={() => setConfirmModalData(reading)}
                              title="Okumayı Onayla"
                            >
                              <CheckCircle2 size={15} />
                              <span>{isApproved ? 'Onaylı' : 'Onayla'}</span>
                            </Button>

                            {/* Deny Button */}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              disabled={isDenied || actionLoading}
                              className="d-inline-flex align-items-center gap-1 px-2"
                              onClick={() => setDenyModalData(reading)}
                              title="Okumayı Reddet"
                            >
                              <XCircle size={15} />
                              <span>Reddet</span>
                            </Button>
                          </div>
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

      {/* Modals */}
      <ConfirmModal
        show={!!confirmModalData}
        onHide={() => setConfirmModalData(null)}
        reading={confirmModalData}
        onConfirm={handleApprove}
        loading={actionLoading}
      />

      <DenyReasonModal
        show={!!denyModalData}
        onHide={() => setDenyModalData(null)}
        reading={denyModalData}
        onDeny={handleDeny}
        loading={actionLoading}
      />

      <FileUploadModal
        show={!!uploadModalData}
        onHide={() => setUploadModalData(null)}
        reading={uploadModalData}
        onFilesUpdated={handleFilesUpdated}
      />

      <ReadingDetailModal
        show={!!detailModalData}
        onHide={() => setDetailModalData(null)}
        reading={detailModalData}
        onReadingUpdated={handleFilesUpdated}
      />
    </div>
  );
}
