import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { 
  History, Search, FileSpreadsheet, Eye, FileText, RefreshCw, 
  Activity, Flame, Calendar, Upload 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import ReadingDetailModal from '../components/ReadingDetailModal';
import FileUploadModal from '../components/FileUploadModal';

// Helper to get default start of month and yesterday
const getDefaultDates = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const endStr = d.toISOString().split('T')[0];
  
  const startD = new Date(d.getFullYear(), d.getMonth(), 1);
  const startStr = startD.toISOString().split('T')[0];
  return { startStr, endStr };
};

export default function ArchivePage() {
  const { user, isAdmin } = useAuth();
  const { startStr, endStr } = getDefaultDates();

  const [history, setHistory] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState(startStr);
  const [endDate, setEndDate] = useState(endStr);
  const [message, setMessage] = useState(null);

  const [detailModalData, setDetailModalData] = useState(null);
  const [uploadModalData, setUploadModalData] = useState(null);

  useEffect(() => {
    api.get('/stations').then((res) => {
      if (res.data.success) setStations(res.data.stations);
    });
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedStation) params.append('u', selectedStation);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/readings/history?${params.toString()}`);
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Geçmiş veriler alınamadı: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all days in the selected date range live from Aksa RMSA
  const handleFetchLiveRange = async () => {
    if (!startDate || !endDate) {
      setMessage({ type: 'warning', text: 'Lütfen başlangıç ve bitiş tarihlerini seçiniz.' });
      return;
    }

    setFetchingLive(true);
    setMessage(null);
    try {
      const payload = {
        startDate,
        endDate,
        u: !isAdmin && user?.stationU ? user.stationU : selectedStation
      };

      const res = await api.post('/readings/fetch-range', payload);
      if (res.data.success) {
        setHistory(res.data.history);
        setMessage({ type: 'success', text: res.data.message || 'Geçmiş veriler Aksa RMSA üzerinden başarıyla çekildi!' });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Aksa geçmiş veri çekme hatası: ' + (err.response?.data?.message || err.message) });
    } finally {
      setFetchingLive(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = history.map((r, idx) => ({
      'No': idx + 1,
      'İstasyon Adı': r.stationName,
      'Kullanıcı Kodu': r.u,
      'Gaz Günü': r.gasDate,
      '5 Nolu Tüketim (Sm³)': r.consumption || 0,
      '6 Nolu Enerji (kcal)': r.energy || 0,
      '7 Nolu Isıl Değer (Ho)': r.superiorHeatingValue || 0,
      'Basınç (Bar)': r.pressure || 0,
      'Sıcaklık (°C)': r.temperature || 0,
      'Durum': r.status === 'APPROVED' ? 'ONAYLANDI' : r.status === 'DENIED' ? 'REDDEDİLDİ' : 'BEKLEMEDE',
      'Yüklü Dosya Sayısı': r.files ? r.files.length : 0,
      'İşlem Yapan': r.approvalInfo?.actionBy || '',
      'İşlem Tarihi ve Saati': r.approvalInfo?.actionAt ? new Date(r.approvalInfo.actionAt).toLocaleString('tr-TR') : '',
      'Açıklama / Not': r.operatorNote || r.approvalInfo?.notes || r.approvalInfo?.rejectionReason || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gecmis_Gaz_Okumalari');
    XLSX.writeFile(wb, `Gecmis_Gaz_Okumalari_${startDate}_${endDate}.xlsx`);
  };

  const totalPeriodSm3 = history.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalPeriodEnergyKcal = history.reduce((sum, r) => sum + (Number(r.energy) || 0), 0);

  return (
    <div>
      {/* Filter Header Card */}
      <div className="dashboard-card p-3 p-md-4 mb-3 mb-md-4">
        <div className="d-flex align-items-center gap-2.5 mb-3">
          <div className="bg-primary-subtle text-primary p-2 rounded-3">
            <History size={22} />
          </div>
          <div>
            <h5 className="fw-bold mb-0 text-dark">Geçmiş Okuma Arşivi & Raporlar</h5>
            <small className="text-muted">
              {isAdmin 
                ? 'Tüm istasyonlar için tarih aralıklı geçmiş sorgulama ve Aksa canlı veri çekme' 
                : `${user?.assignedStation?.name || user?.stationU?.toUpperCase() || ''} İstasyonu Geçmiş Kayıtları`}
            </small>
          </div>
        </div>

        <Row className="g-3 align-items-end">
          <Col lg={2} md={3} sm={6} xs={6}>
            <Form.Label className="small fw-bold text-muted mb-1">Başlangıç Tarihi</Form.Label>
            <Form.Control
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Col>

          <Col lg={2} md={3} sm={6} xs={6}>
            <Form.Label className="small fw-bold text-muted mb-1">Bitiş Tarihi</Form.Label>
            <Form.Control
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Col>

          <Col lg={2} md={3} sm={6} xs={12}>
            <Form.Label className="small fw-bold text-muted mb-1">İstasyon</Form.Label>
            <Form.Select
              value={!isAdmin && user?.stationU ? user.stationU : selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              disabled={!isAdmin && !!user?.stationU}
            >
              {isAdmin && <option value="">Tüm İstasyonlar</option>}
              {stations
                .filter(st => isAdmin || !user?.stationU || st.u === user.stationU)
                .map((st) => (
                  <option key={st._id} value={st.u}>{st.name}</option>
                ))}
            </Form.Select>
          </Col>

          <Col lg={2} md={3} sm={6} xs={12}>
            <Form.Label className="small fw-bold text-muted mb-1">Onay Durumu</Form.Label>
            <Form.Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Tümü</option>
              <option value="APPROVED">Onaylanan</option>
              <option value="PENDING">Beklemede</option>
              <option value="DENIED">Reddedilen</option>
            </Form.Select>
          </Col>

          <Col lg={4} md={12} className="d-flex flex-wrap gap-2 justify-content-lg-end">
            <Button
              variant="outline-primary"
              onClick={fetchHistory}
              disabled={loading || fetchingLive}
              className="d-flex align-items-center justify-content-center gap-1.5 px-3 py-2 flex-grow-1 flex-sm-grow-0"
            >
              <Search size={16} />
              <span>Ara</span>
            </Button>

            <Button
              variant="primary"
              onClick={handleFetchLiveRange}
              disabled={loading || fetchingLive}
              className="d-flex align-items-center justify-content-center gap-2 fw-bold px-3 py-2 flex-grow-1 flex-sm-grow-0 shadow-sm"
            >
              <RefreshCw size={16} className={fetchingLive ? 'spin' : ''} />
              <span>{fetchingLive ? 'Aksa’dan Çekiliyor...' : 'Aksa’dan Canlı Getir'}</span>
            </Button>

            <Button
              variant="outline-success"
              onClick={handleExportExcel}
              disabled={history.length === 0}
              className="px-3 py-2 d-flex align-items-center justify-content-center gap-1"
              title="Excel İndir"
            >
              <FileSpreadsheet size={18} />
            </Button>
          </Col>
        </Row>
      </div>

      {message && (
        <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="shadow-sm rounded-3 mb-3">
          {message.text}
        </Alert>
      )}

      {/* Summary KPI Cards for Selected Period */}
      {history.length > 0 && (
        <Row className="g-3 mb-3 mb-md-4">
          <Col md={4} sm={6} xs={12}>
            <div className="kpi-card">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                    DÖNEM TOPLAM TÜKETİM
                  </div>
                  <div className="fs-3 fw-bolder text-primary mt-1">
                    {totalPeriodSm3.toLocaleString('tr-TR')} <small className="fs-6 fw-normal text-muted">Sm³</small>
                  </div>
                </div>
                <div className="kpi-icon-box bg-primary-subtle text-primary">
                  <Activity size={24} />
                </div>
              </div>
            </div>
          </Col>

          <Col md={4} sm={6} xs={12}>
            <div className="kpi-card">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                    DÖNEM TOPLAM ENERJİ
                  </div>
                  <div className="fs-3 fw-bolder text-info mt-1">
                    {totalPeriodEnergyKcal.toLocaleString('tr-TR')} <small className="fs-6 fw-normal text-muted">kcal</small>
                  </div>
                </div>
                <div className="kpi-icon-box bg-info-subtle text-info">
                  <Flame size={24} />
                </div>
              </div>
            </div>
          </Col>

          <Col md={4} sm={12} xs={12}>
            <div className="kpi-card">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '11px' }}>
                    TOPLAM LİSTELENEN KAYIT
                  </div>
                  <div className="fs-3 fw-bolder text-success mt-1">{history.length} Gün / Kayıt</div>
                </div>
                <div className="kpi-icon-box bg-success-subtle text-success">
                  <Calendar size={24} />
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Results Card */}
      <div className="dashboard-card overflow-hidden">
        <div className="p-3 p-md-4 border-bottom d-flex justify-content-between align-items-center bg-white">
          <h6 className="fw-bold mb-0 text-dark">Geçmiş Kayıt Listesi ({history.length})</h6>
          <span className="badge bg-light text-dark border">{startDate} &rarr; {endDate}</span>
        </div>

        {loading || fetchingLive ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-3 text-muted fw-semibold">
              {fetchingLive ? 'Seçili tarih aralığındaki günler Aksa RMSA üzerinden sorgulanıyor...' : 'Kayıtlar yükleniyor...'}
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-5 text-muted px-3">
            <div>Seçilen tarih aralığı için kayıt bulunamadı.</div>
            <Button
              variant="primary"
              size="sm"
              className="mt-3 d-inline-flex align-items-center gap-2 px-3 py-2"
              onClick={handleFetchLiveRange}
            >
              <RefreshCw size={15} />
              <span>Bu Tarih Aralığını Aksa'dan Canlı Çek</span>
            </Button>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="table-responsive d-none d-md-block">
              <Table className="modern-table">
                <thead>
                  <tr>
                    <th>Gaz Günü</th>
                    <th>İstasyon Adı</th>
                    <th className="text-end">5 - Tüketim (Sm³)</th>
                    <th className="text-end">6 - Enerji (kcal)</th>
                    <th className="text-center">7 - Isıl Değer (Ho)</th>
                    <th className="text-center">Basınç / Sıcaklık</th>
                    <th className="text-center">Durum</th>
                    <th className="text-center">PDF Rapor</th>
                    <th>Not / Açıklama</th>
                    <th className="text-end">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((reading) => (
                    <tr key={reading._id}>
                      <td className="fw-bold text-dark">{reading.gasDate}</td>
                      <td>
                        <div className="fw-bold text-dark">{reading.stationName}</div>
                        <small className="text-muted"><code>{reading.u}</code></small>
                      </td>
                      <td className="text-end fw-bolder text-primary">
                        {reading.consumption !== null && reading.consumption !== undefined
                          ? Number(reading.consumption).toLocaleString('tr-TR')
                          : '—'}
                      </td>
                      <td className="text-end fw-bold text-dark">
                        {reading.energy !== null && reading.energy !== undefined
                          ? Number(reading.energy).toLocaleString('tr-TR')
                          : '—'}
                      </td>
                      <td className="text-center">
                        {reading.superiorHeatingValue !== null && reading.superiorHeatingValue !== undefined ? (
                          <div>
                            <span className="fw-bold">{Number(reading.superiorHeatingValue).toLocaleString('tr-TR')}</span>
                            {reading.isSubstitutedSHV && (
                              <div>
                                <Badge bg="info" className="p-1 mt-0.5" style={{ fontSize: '9px' }}>
                                  7 Nolu İkame
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="text-center">
                        <div className="small fw-semibold">{reading.pressure ? `${reading.pressure} Bar` : '—'}</div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>{reading.temperature ? `${reading.temperature} °C` : '—'}</div>
                      </td>
                      <td className="text-center">
                        {reading.status === 'APPROVED' && (
                          <div>
                            <Badge bg="success" pill>ONAYLANDI</Badge>
                            {reading.approvalInfo?.actionAt && (
                              <div className="text-success fw-semibold mt-1" style={{ fontSize: '10px' }}>
                                {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {reading.approvalInfo.actionBy && <div className="text-muted" style={{ fontSize: '9px' }}>({reading.approvalInfo.actionBy})</div>}
                              </div>
                            )}
                          </div>
                        )}
                        {reading.status === 'DENIED' && (
                          <div>
                            <Badge bg="danger" pill>REDDEDİLDİ</Badge>
                            {reading.approvalInfo?.actionAt && (
                              <div className="text-danger fw-semibold mt-1" style={{ fontSize: '10px' }}>
                                {new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {reading.approvalInfo.actionBy && <div className="text-muted" style={{ fontSize: '9px' }}>({reading.approvalInfo.actionBy})</div>}
                              </div>
                            )}
                          </div>
                        )}
                        {reading.status === 'PENDING' && <Badge bg="warning" text="dark" pill>BEKLEMEDE</Badge>}
                      </td>
                      <td className="text-center">
                        {reading.files && reading.files.length > 0 ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="px-2.5 py-1 small d-inline-flex align-items-center gap-1"
                            onClick={() => setDetailModalData(reading)}
                          >
                            <FileText size={14} />
                            <span>{reading.files.length} Rapor</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="px-2.5 py-1 small"
                            onClick={() => setUploadModalData(reading)}
                          >
                            <Upload size={13} className="me-1" />
                            <span>Yükle</span>
                          </Button>
                        )}
                      </td>
                      <td className="small">
                        {reading.operatorNote && (
                          <div className="text-primary small" title={reading.operatorNote}>
                            📝 {reading.operatorNote.length > 35 ? reading.operatorNote.slice(0, 35) + '...' : reading.operatorNote}
                          </div>
                        )}
                      </td>
                      <td className="text-end">
                        <Button
                          variant="light"
                          size="sm"
                          className="p-1.5 border text-info"
                          onClick={() => setDetailModalData(reading)}
                          title="Detay İncele"
                        >
                          <Eye size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* MOBILE CARDS */}
            <div className="d-md-none p-3 bg-light">
              {history.map((reading) => {
                const isApproved = reading.status === 'APPROVED';
                const isDenied = reading.status === 'DENIED';
                const hasFiles = reading.files && reading.files.length > 0;
                const statusClass = isApproved ? 'status-approved' : isDenied ? 'status-denied' : 'status-pending';

                return (
                  <div key={reading._id} className={`mobile-station-card ${statusClass}`}>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div className="fw-bolder text-dark">{reading.stationName}</div>
                        <div className="text-muted small">
                          📅 <strong>{reading.gasDate}</strong> • <code>{reading.u}</code>
                        </div>
                      </div>
                      {isApproved && <Badge bg="success" pill>ONAYLANDI</Badge>}
                      {isDenied && <Badge bg="danger" pill>REDDEDİLDİ</Badge>}
                      {!isApproved && !isDenied && <Badge bg="warning" text="dark" pill>BEKLEMEDE</Badge>}
                    </div>

                    <div className="mobile-metric-grid">
                      <div className="mobile-metric-item">
                        <div className="text-muted" style={{ fontSize: '10.5px', fontWeight: 600 }}>5-TÜKETİM</div>
                        <div className="fw-bolder text-primary">
                          {reading.consumption !== null ? `${Number(reading.consumption).toLocaleString('tr-TR')} Sm³` : '—'}
                        </div>
                      </div>
                      <div className="mobile-metric-item">
                        <div className="text-muted" style={{ fontSize: '10.5px', fontWeight: 600 }}>6-ENERJİ</div>
                        <div className="fw-bold text-success">
                          {reading.energy !== null ? `${Number(reading.energy).toLocaleString('tr-TR')} kcal` : '—'}
                        </div>
                      </div>
                      <div className="mobile-metric-item">
                        <div className="text-muted" style={{ fontSize: '10.5px', fontWeight: 600 }}>7-ÜST ISIL (Ho)</div>
                        <div className="fw-bold text-dark">
                          {reading.superiorHeatingValue !== null ? Number(reading.superiorHeatingValue).toLocaleString('tr-TR') : '—'}
                        </div>
                      </div>
                      <div className="mobile-metric-item">
                        <div className="text-muted" style={{ fontSize: '10.5px', fontWeight: 600 }}>BASINÇ / SICAKLIK</div>
                        <div className="small fw-semibold text-dark">
                          {reading.pressure ?? '—'} Bar / {reading.temperature ?? '—'} °C
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2 pt-2 border-top">
                      <Button
                        variant={hasFiles ? 'primary' : 'outline-info'}
                        size="sm"
                        className="flex-grow-1 d-flex align-items-center justify-content-center gap-1 py-2"
                        onClick={() => setDetailModalData(reading)}
                      >
                        <Eye size={15} />
                        <span>{hasFiles ? `Rapor & Detay (${reading.files.length})` : 'Detay İncele'}</span>
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="px-3 py-2"
                        onClick={() => setUploadModalData(reading)}
                      >
                        <Upload size={15} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ReadingDetailModal
        show={!!detailModalData}
        onHide={() => setDetailModalData(null)}
        reading={detailModalData}
        onReadingUpdated={(updated) => {
          setHistory(prev => prev.map(h => (h._id === updated._id ? updated : h)));
          setDetailModalData(updated);
        }}
      />

      <FileUploadModal
        show={!!uploadModalData}
        onHide={() => setUploadModalData(null)}
        reading={uploadModalData}
        onFilesUpdated={(updated) => {
          setHistory(prev => prev.map(h => (h._id === updated._id ? updated : h)));
        }}
      />
    </div>
  );
}
