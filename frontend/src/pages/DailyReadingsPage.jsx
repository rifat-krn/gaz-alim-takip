import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, Alert, Spinner, ProgressBar, InputGroup } from 'react-bootstrap';
import { 
  RefreshCw, CheckCircle2, XCircle, Upload, Eye, FileText, 
  Calendar, FileSpreadsheet, ChevronLeft, ChevronRight, Search,
  Activity, Flame, Clock, AlertCircle, Filter
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

  // Dashboard Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, APPROVED, PENDING, DENIED, WITH_REPORT

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

  // Step date by +/- days
  const handleStepDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

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

  // Calculate totals & KPI metrics
  const totalConsumption = readings.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalEnergy = readings.reduce((sum, r) => sum + (Number(r.energy) || 0), 0);
  const approvedCount = readings.filter(r => r.status === 'APPROVED').length;
  const pendingCount = readings.filter(r => r.status === 'PENDING').length;
  const deniedCount = readings.filter(r => r.status === 'DENIED').length;
  const withReportCount = readings.filter(r => r.files && r.files.length > 0).length;
  const approvalProgress = readings.length > 0 ? Math.round((approvedCount / readings.length) * 100) : 0;

  // Filtered readings based on search and status pill
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const matchesSearch = !searchQuery.trim() || 
        (r.stationName && r.stationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.u && r.u.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'APPROVED') return r.status === 'APPROVED';
      if (statusFilter === 'PENDING') return r.status === 'PENDING';
      if (statusFilter === 'DENIED') return r.status === 'DENIED';
      if (statusFilter === 'WITH_REPORT') return r.files && r.files.length > 0;
      return true;
    });
  }, [readings, searchQuery, statusFilter]);

  return (
    <div>
      {/* Top Action & Date Control Bar */}
      <div className="dashboard-card p-3 p-md-4 mb-3 mb-md-4">
        <Row className="align-items-center g-3">
          {/* Date Selector with Quick Prev/Next */}
          <Col xl={4} lg={5} md={12}>
            <div className="d-flex flex-column">
              <span className="text-muted fw-bold text-uppercase mb-1.5" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                📅 Gaz Günü Seçimi & Navigasyon
              </span>
              <div className="d-flex align-items-center gap-1.5">
                <Button 
                  variant="outline-secondary" 
                  className="px-2.5 py-2 d-flex align-items-center justify-content-center"
                  onClick={() => handleStepDate(-1)}
                  disabled={fetchingAll}
                  title="Önceki Gün"
                >
                  <ChevronLeft size={18} />
                </Button>

                <Form.Control
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="fw-bold text-center py-2 shadow-none"
                  style={{ maxWidth: '175px' }}
                />

                <Button 
                  variant="outline-secondary" 
                  className="px-2.5 py-2 d-flex align-items-center justify-content-center"
                  onClick={() => handleStepDate(1)}
                  disabled={fetchingAll}
                  title="Sonraki Gün"
                >
                  <ChevronRight size={18} />
                </Button>

                <Button
                  variant="light"
                  size="sm"
                  className="border fw-semibold px-2.5 py-2 ms-1 text-nowrap"
                  onClick={() => setSelectedDate(getDefaultGasDate())}
                  disabled={fetchingAll}
                >
                  Dün
                </Button>
              </div>
            </div>
          </Col>

          {/* OYS Period Info */}
          <Col xl={4} lg={4} md={6}>
            {gasInfo && (
              <div className="bg-light p-2.5 px-3 rounded-3 border d-flex align-items-center gap-2.5">
                <Clock size={20} className="text-primary flex-shrink-0" />
                <div>
                  <div className="text-muted fw-semibold" style={{ fontSize: '10.5px' }}>
                    OYS 24 SAATLİK GAZ GÜNÜ ARALIĞI
                  </div>
                  <div className="fw-bold text-dark small">
                    <span className="text-primary">{gasInfo.dt1}</span> &rarr; <span className="text-success">{gasInfo.dt3}</span>
                  </div>
                </div>
              </div>
            )}
          </Col>

          {/* Primary Actions */}
          <Col xl={4} lg={3} md={6} className="d-flex flex-wrap gap-2 justify-content-md-end">
            <Button
              variant="primary"
              onClick={handleFetchAll}
              disabled={fetchingAll || loading}
              className="d-flex align-items-center justify-content-center gap-2 fw-bold px-3.5 py-2 shadow-sm flex-grow-1 flex-md-grow-0"
            >
              <RefreshCw size={17} className={fetchingAll ? 'spin' : ''} />
              <span>{fetchingAll ? 'Sorgulanıyor...' : 'Canlı Veri Çek'}</span>
            </Button>

            <Button
              variant="outline-success"
              onClick={handleExportExcel}
              disabled={readings.length === 0}
              className="d-flex align-items-center justify-content-center gap-1.5 fw-semibold px-3 py-2"
              title="Excel Raporu İndir"
            >
              <FileSpreadsheet size={17} />
              <span>Excel</span>
            </Button>
          </Col>
        </Row>
      </div>

      {/* Alert Messages */}
      {message && (
        <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="shadow-sm rounded-3 mb-3">
          {message.text}
        </Alert>
      )}

      {/* Modern KPI Cards */}
      <Row className="g-3 mb-3 mb-md-4">
        <Col xl={3} md={6} sm={6} xs={12}>
          <div className="kpi-card">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                  TOPLAM TÜKETİM (5 NOLU)
                </div>
                <div className="fs-3 fw-bolder text-primary mt-1 lh-sm">
                  {totalConsumption.toLocaleString('tr-TR')}
                  <small className="fs-6 fw-normal text-muted ms-1">Sm³</small>
                </div>
              </div>
              <div className="kpi-icon-box bg-primary-subtle text-primary">
                <Activity size={24} />
              </div>
            </div>
          </div>
        </Col>

        <Col xl={3} md={6} sm={6} xs={12}>
          <div className="kpi-card">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                  TOPLAM ENERJİ (6 NOLU)
                </div>
                <div className="fs-3 fw-bolder text-info mt-1 lh-sm">
                  {totalEnergy.toLocaleString('tr-TR')}
                  <small className="fs-6 fw-normal text-muted ms-1">kcal</small>
                </div>
              </div>
              <div className="kpi-icon-box bg-info-subtle text-info">
                <Flame size={24} />
              </div>
            </div>
          </div>
        </Col>

        <Col xl={3} md={6} sm={6} xs={6}>
          <div className="kpi-card">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div>
                <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                  ONAY TAMAMLANMA
                </div>
                <div className="fs-4 fw-bolder text-success mt-1 lh-sm">
                  {approvedCount} / {readings.length}
                  <small className="fs-6 fw-semibold text-muted ms-1">(%{approvalProgress})</small>
                </div>
              </div>
              <div className="kpi-icon-box bg-success-subtle text-success d-none d-sm-flex">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <ProgressBar 
              now={approvalProgress} 
              variant="success" 
              style={{ height: '6px', borderRadius: '99px' }} 
            />
          </div>
        </Col>

        <Col xl={3} md={6} sm={6} xs={6}>
          <div className="kpi-card">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                  DURUM ÖZETİ
                </div>
                <div className="d-flex align-items-center gap-3 mt-2">
                  <div>
                    <span className="fs-5 fw-bolder text-warning">{pendingCount}</span>
                    <span className="text-muted small ms-1">Bekleyen</span>
                  </div>
                  <div className="vr" />
                  <div>
                    <span className="fs-5 fw-bolder text-danger">{deniedCount}</span>
                    <span className="text-muted small ms-1">Red</span>
                  </div>
                </div>
              </div>
              <div className="kpi-icon-box bg-warning-subtle text-warning d-none d-sm-flex">
                <AlertCircle size={24} />
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Main Dashboard Card: Quick Filters + Search + Responsive Table/Cards */}
      <div className="dashboard-card overflow-hidden">
        {/* Filter & Search Toolbar */}
        <div className="p-3 p-md-4 border-bottom bg-white">
          <Row className="align-items-center justify-content-between g-3">
            <Col lg={7} md={12}>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  <span>Tümü</span>
                  <Badge bg={statusFilter === 'ALL' ? 'light' : 'secondary'} text={statusFilter === 'ALL' ? 'dark' : 'white'} pill>
                    {readings.length}
                  </Badge>
                </button>

                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'PENDING' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('PENDING')}
                >
                  <span>Kontrol Bekleyen</span>
                  <Badge bg="warning" text="dark" pill>{pendingCount}</Badge>
                </button>

                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'APPROVED' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('APPROVED')}
                >
                  <span>Onaylanan</span>
                  <Badge bg="success" pill>{approvedCount}</Badge>
                </button>

                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'DENIED' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('DENIED')}
                >
                  <span>Reddedilen</span>
                  <Badge bg="danger" pill>{deniedCount}</Badge>
                </button>

                <button
                  type="button"
                  className={`filter-pill ${statusFilter === 'WITH_REPORT' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('WITH_REPORT')}
                >
                  <FileText size={14} />
                  <span>PDF Raporlu</span>
                  <Badge bg="info" pill>{withReportCount}</Badge>
                </button>
              </div>
            </Col>

            <Col lg={4} md={12}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-light border-end-0 text-muted">
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="İstasyon adı veya kullanıcı kodu ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-start-0 ps-0 py-2"
                />
              </InputGroup>
            </Col>
          </Row>
        </div>

        {/* Loading or Empty State */}
        {loading || (fetchingAll && readings.length === 0) ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-3 text-muted fw-semibold">İstasyon verileri ve PDF raporları Aksa RMSA'dan çekiliyor...</div>
          </div>
        ) : filteredReadings.length === 0 ? (
          <div className="text-center py-5 text-muted px-3">
            Arama veya filtre kriterlerine uygun istasyon kaydı bulunamadı.
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW: Modern Table (visible on md and up) */}
            <div className="table-responsive d-none d-md-block">
              <Table className="modern-table">
                <thead>
                  <tr>
                    <th style={{ width: '48px' }}>#</th>
                    <th>İstasyon Bilgisi</th>
                    <th className="text-end">5 - Tüketim (Sm³)</th>
                    <th className="text-end">6 - Enerji (kcal)</th>
                    <th className="text-center">7 - Üst Isıl (Ho)</th>
                    <th className="text-center">Basınç / Sıcaklık</th>
                    <th className="text-center">Durum & Zaman</th>
                    <th className="text-center">PDF Rapor / Belge</th>
                    <th className="text-end" style={{ minWidth: '230px' }}>Kontrol & İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.map((reading, index) => {
                    const isApproved = reading.status === 'APPROVED';
                    const isDenied = reading.status === 'DENIED';
                    const isPending = reading.status === 'PENDING';
                    const hasFiles = reading.files && reading.files.length > 0;
                    const stationId = reading.stationId?._id || reading.stationId;

                    return (
                      <tr key={reading.u || index}>
                        <td className="text-muted fw-semibold">{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div>
                              <div className="fw-bold text-dark">{reading.stationName}</div>
                              <div className="d-flex align-items-center gap-2 mt-0.5">
                                <code className="small text-secondary">{reading.u}</code>
                                {reading.operatorNote && (
                                  <span className="badge bg-info-subtle text-info-emphasis fw-normal" title={reading.operatorNote}>
                                    📝 {reading.operatorNote.length > 32 ? reading.operatorNote.slice(0, 32) + '...' : reading.operatorNote}
                                  </span>
                                )}
                              </div>
                              {reading.fetchStatus?.errorMessage && (
                                <div className="text-danger small mt-1" style={{ fontSize: '11px' }}>
                                  ⚠️ {reading.fetchStatus.errorMessage}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="text-end">
                          <span className="fw-bolder text-primary fs-6">
                            {reading.consumption !== null && reading.consumption !== undefined
                              ? Number(reading.consumption).toLocaleString('tr-TR')
                              : <span className="text-muted">—</span>}
                          </span>
                        </td>

                        <td className="text-end">
                          <span className="fw-bold text-dark">
                            {reading.energy !== null && reading.energy !== undefined
                              ? Number(reading.energy).toLocaleString('tr-TR')
                              : <span className="text-muted">—</span>}
                          </span>
                        </td>

                        <td className="text-center">
                          {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined ? (
                            <div>
                              <span className="fw-bold text-dark">{Number(reading.superiorHeatingValue).toLocaleString('tr-TR')}</span>
                              {reading.isSubstitutedSHV && (
                                <div>
                                  <Badge bg="info" className="px-1.5 py-0.5 mt-0.5" style={{ fontSize: '9px' }}>
                                    İkame Ho (7 Nolu)
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ) : '—'}
                        </td>

                        <td className="text-center">
                          <div className="small fw-semibold text-dark">
                            {reading.pressure !== null && reading.pressure !== undefined ? `${reading.pressure} Bar` : '—'}
                          </div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {reading.temperature !== null && reading.temperature !== undefined ? `${reading.temperature} °C` : '—'}
                          </div>
                        </td>

                        <td className="text-center">
                          {isApproved && (
                            <div>
                              <Badge bg="success" className="px-2.5 py-1 rounded-pill">ONAYLANDI</Badge>
                              {reading.approvalInfo?.actionAt && (
                                <div className="text-success fw-semibold mt-1" style={{ fontSize: '10px' }}>
                                  {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {reading.approvalInfo.actionBy && <div className="text-muted" style={{ fontSize: '9.5px' }}>({reading.approvalInfo.actionBy})</div>}
                                </div>
                              )}
                            </div>
                          )}
                          {isDenied && (
                            <div>
                              <Badge bg="danger" className="px-2.5 py-1 rounded-pill">REDDEDİLDİ</Badge>
                              {reading.approvalInfo?.actionAt && (
                                <div className="text-danger fw-semibold mt-1" style={{ fontSize: '10px' }}>
                                  {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {reading.approvalInfo.actionBy && <div className="text-muted" style={{ fontSize: '9.5px' }}>({reading.approvalInfo.actionBy})</div>}
                                </div>
                              )}
                            </div>
                          )}
                          {isPending && (
                            reading.fetchStatus?.isFetched 
                              ? <Badge bg="warning" text="dark" className="px-2.5 py-1 rounded-pill">KONTROL BEKLİYOR</Badge>
                              : <Badge bg="secondary" className="px-2.5 py-1 rounded-pill">VERİ BEKLENİYOR</Badge>
                          )}
                        </td>

                        <td className="text-center">
                          <div className="d-inline-flex align-items-center gap-1">
                            {hasFiles ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="px-2.5 py-1 d-inline-flex align-items-center gap-1 shadow-sm"
                                  onClick={() => setDetailModalData(reading)}
                                  title="PDF Raporu ve Verileri Yan Yana İncele"
                                >
                                  <FileText size={14} />
                                  <span className="small fw-semibold">{reading.files.length} Rapor</span>
                                </Button>
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="p-1 border"
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
                                className="px-2.5 py-1 d-inline-flex align-items-center gap-1"
                                onClick={() => setUploadModalData(reading)}
                                title="Rapor Dosyası Yükle"
                              >
                                <Upload size={14} />
                                <span className="small">Dosya Yükle</span>
                              </Button>
                            )}
                          </div>
                        </td>

                        <td className="text-end">
                          <div className="d-inline-flex align-items-center justify-content-end gap-1.5">
                            <Button
                              variant="light"
                              size="sm"
                              className="p-1.5 border text-info"
                              onClick={() => setDetailModalData(reading)}
                              title="Detay & Karşılaştırma Ekranı"
                            >
                              <Eye size={16} />
                            </Button>

                            <Button
                              variant="light"
                              size="sm"
                              className="p-1.5 border text-dark"
                              disabled={fetchingSingleId === stationId}
                              onClick={() => handleFetchSingle(reading)}
                              title="Bu İstasyonu Tekrar Çek"
                            >
                              <RefreshCw size={16} className={fetchingSingleId === stationId ? 'spin' : ''} />
                            </Button>

                            <Button
                              variant="success"
                              size="sm"
                              disabled={isApproved || actionLoading}
                              className="d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-semibold shadow-sm"
                              onClick={() => setConfirmModalData(reading)}
                            >
                              <CheckCircle2 size={15} />
                              <span>{isApproved ? 'Onaylı' : 'Onayla'}</span>
                            </Button>

                            <Button
                              variant="outline-danger"
                              size="sm"
                              disabled={isDenied || actionLoading}
                              className="d-inline-flex align-items-center gap-1 px-2 py-1.5"
                              onClick={() => setDenyModalData(reading)}
                              title="Reddet"
                            >
                              <XCircle size={15} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>

            {/* MOBILE & TABLET VIEW: Interactive Cards (visible below md) */}
            <div className="d-md-none p-3 bg-light">
              {filteredReadings.map((reading, index) => {
                const isApproved = reading.status === 'APPROVED';
                const isDenied = reading.status === 'DENIED';
                const hasFiles = reading.files && reading.files.length > 0;
                const stationId = reading.stationId?._id || reading.stationId;
                const statusClass = isApproved ? 'status-approved' : isDenied ? 'status-denied' : 'status-pending';

                return (
                  <div key={reading.u || index} className={`mobile-station-card ${statusClass}`}>
                    {/* Card Header */}
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bolder text-dark fs-6">{reading.stationName}</div>
                        <div className="text-muted small">
                          Kod: <code>{reading.u}</code> • {reading.gasDate}
                        </div>
                      </div>
                      <div className="text-end">
                        {isApproved && <Badge bg="success" pill>ONAYLANDI</Badge>}
                        {isDenied && <Badge bg="danger" pill>REDDEDİLDİ</Badge>}
                        {!isApproved && !isDenied && <Badge bg="warning" text="dark" pill>BEKLEMEDE</Badge>}
                      </div>
                    </div>

                    {/* 2x2 Metric Grid */}
                    <div className="mobile-metric-grid">
                      <div className="mobile-metric-item">
                        <div className="text-muted" style={{ fontSize: '10.5px', fontWeight: 600 }}>5-TÜKETİM (Sm³)</div>
                        <div className="fw-bolder text-primary fs-6 mt-0.5">
                          {reading.consumption !== null && reading.consumption !== undefined
                            ? Number(reading.consumption).toLocaleString('tr-TR')
                            : '—'}
                        </div>
                      </div>

                      <div className="mobile-metric-item">
                        <div className="text-muted" style={{ fontSize: '10.5px', fontWeight: 600 }}>6-ENERJİ (kcal)</div>
                        <div className="fw-bold text-success fs-6 mt-0.5">
                          {reading.energy !== null && reading.energy !== undefined
                            ? Number(reading.energy).toLocaleString('tr-TR')
                            : '—'}
                        </div>
                      </div>

                      <div className="mobile-metric-item">
                        <div className="text-muted" style={{ fontSize: '10.5px', fontWeight: 600 }}>7-ÜST ISIL (Ho)</div>
                        <div className="fw-bold text-dark mt-0.5">
                          {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined
                            ? Number(reading.superiorHeatingValue).toLocaleString('tr-TR')
                            : '—'}
                        </div>
                      </div>

                      <div className="mobile-metric-item">
                        <div className="text-muted" style={{ fontSize: '10.5px', fontWeight: 600 }}>BASINÇ / SICAKLIK</div>
                        <div className="fw-semibold text-dark small mt-1">
                          {reading.pressure ?? '—'} Bar / {reading.temperature ?? '—'} °C
                        </div>
                      </div>
                    </div>

                    {reading.operatorNote && (
                      <div className="bg-info-subtle text-info-emphasis p-2 rounded-2 small mb-2">
                        📝 {reading.operatorNote}
                      </div>
                    )}

                    {reading.approvalInfo?.actionAt && (
                      <div className="text-muted small mb-2" style={{ fontSize: '11px' }}>
                        ⏱️ İşlem: {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR')} ({reading.approvalInfo.actionBy})
                      </div>
                    )}

                    {/* Mobile Action Buttons */}
                    <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                      <Button
                        variant={hasFiles ? 'primary' : 'outline-info'}
                        size="sm"
                        className="flex-grow-1 d-flex align-items-center justify-content-center gap-1 py-2"
                        onClick={() => setDetailModalData(reading)}
                      >
                        <Eye size={15} />
                        <span>{hasFiles ? `Rapor & İncele (${reading.files.length})` : 'İncele'}</span>
                      </Button>

                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="d-flex align-items-center justify-content-center gap-1 px-2.5 py-2"
                        onClick={() => setUploadModalData(reading)}
                      >
                        <Upload size={15} />
                      </Button>

                      <Button
                        variant="outline-dark"
                        size="sm"
                        className="d-flex align-items-center justify-content-center px-2.5 py-2"
                        disabled={fetchingSingleId === stationId}
                        onClick={() => handleFetchSingle(reading)}
                      >
                        <RefreshCw size={15} className={fetchingSingleId === stationId ? 'spin' : ''} />
                      </Button>

                      <Button
                        variant="success"
                        size="sm"
                        disabled={isApproved || actionLoading}
                        className="flex-grow-1 d-flex align-items-center justify-content-center gap-1 py-2 fw-bold"
                        onClick={() => setConfirmModalData(reading)}
                      >
                        <CheckCircle2 size={15} />
                        <span>{isApproved ? 'Onaylı' : 'Onayla'}</span>
                      </Button>

                      <Button
                        variant="outline-danger"
                        size="sm"
                        disabled={isDenied || actionLoading}
                        className="d-flex align-items-center justify-content-center px-2.5 py-2"
                        onClick={() => setDenyModalData(reading)}
                      >
                        <XCircle size={15} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

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
