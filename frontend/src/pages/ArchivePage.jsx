import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { History, Search, FileSpreadsheet, Eye, Download, FileText, RefreshCw, CalendarRange } from 'lucide-react';
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
    // Load station list for filter dropdown
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
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <History size={24} className="text-primary" />
            <div>
              <h4 className="fw-bold mb-0">Geçmiş Okuma Arşivi & Raporlar</h4>
              <small className="text-muted">
                {isAdmin ? 'Tüm istasyonlar için tarih aralıklı geçmiş sorgulama ve Aksa canlı çekme' : `${user?.assignedStation?.name || user?.stationU?.toUpperCase() || ''} İstasyonu Geçmiş Kayıtları`}
              </small>
            </div>
          </div>

          {/* Filter Form */}
          <Row className="g-3 align-items-end">
            <Col lg={2} md={3} sm={6}>
              <Form.Label className="small fw-semibold">Başlangıç Tarihi</Form.Label>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Col>

            <Col lg={2} md={3} sm={6}>
              <Form.Label className="small fw-semibold">Bitiş Tarihi</Form.Label>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Col>

            <Col lg={2} md={3} sm={6}>
              <Form.Label className="small fw-semibold">İstasyon</Form.Label>
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

            <Col lg={2} md={3} sm={6}>
              <Form.Label className="small fw-semibold">Onay Durumu</Form.Label>
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
                className="d-flex align-items-center gap-1"
                title="Veritabanında Ara"
              >
                <Search size={16} />
                <span>Ara</span>
              </Button>

              <Button
                variant="primary"
                onClick={handleFetchLiveRange}
                disabled={loading || fetchingLive}
                className="d-flex align-items-center gap-2 fw-semibold"
                title="Seçili aralıktaki tüm günleri Aksa RMSA'dan canlı olarak çek ve kaydet"
              >
                <RefreshCw size={16} className={fetchingLive ? 'spin' : ''} />
                <span>{fetchingLive ? 'Aksa’dan Çekiliyor...' : 'Aksa’dan Canlı Geçmiş Getir'}</span>
              </Button>

              <Button
                variant="outline-success"
                onClick={handleExportExcel}
                disabled={history.length === 0}
                title="Excel İndir"
              >
                <FileSpreadsheet size={18} />
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

      {/* Summary Cards for Selected Period */}
      {history.length > 0 && (
        <Row className="g-3 mb-4">
          <Col md={4} sm={6}>
            <Card className="border-0 shadow-sm bg-white border-start border-4 border-primary">
              <Card.Body className="p-3">
                <div className="text-muted small fw-semibold">Dönem Toplam Tüketim (Sm³)</div>
                <h3 className="fw-bold text-primary mb-0 mt-1">
                  {totalPeriodSm3.toLocaleString('tr-TR')} <small className="fs-6 text-muted">Sm³</small>
                </h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} sm={6}>
            <Card className="border-0 shadow-sm bg-white border-start border-4 border-info">
              <Card.Body className="p-3">
                <div className="text-muted small fw-semibold">Dönem Toplam Enerji (kcal)</div>
                <h3 className="fw-bold text-info mb-0 mt-1">
                  {totalPeriodEnergyKcal.toLocaleString('tr-TR')} <small className="fs-6 text-muted">kcal</small>
                </h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} sm={12}>
            <Card className="border-0 shadow-sm bg-white border-start border-4 border-success">
              <Card.Body className="p-3">
                <div className="text-muted small fw-semibold">Toplam Günlük Kayıt Sayısı</div>
                <h3 className="fw-bold text-success mb-0 mt-1">{history.length} Gün</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0">Geçmiş Kayıtlar ({history.length})</h5>
          <span className="text-muted small">{startDate} &rarr; {endDate}</span>
        </Card.Header>

        <Card.Body className="p-0">
          {loading || fetchingLive ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="mt-2 text-muted">
                {fetchingLive ? 'Seçili tarih aralığındaki günler Aksa RMSA üzerinden sorgulanıyor...' : 'Kayıtlar yükleniyor...'}
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div>Seçilen tarih aralığı için kayıt bulunamadı.</div>
              <Button
                variant="primary"
                size="sm"
                className="mt-3 d-inline-flex align-items-center gap-2"
                onClick={handleFetchLiveRange}
              >
                <RefreshCw size={15} />
                <span>Bu Tarih Aralığını Aksa'dan Canlı Çek</span>
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover align="middle" className="mb-0 table-striped">
                <thead className="table-dark">
                  <tr>
                    <th>Gaz Günü</th>
                    <th>İstasyon Adı</th>
                    <th className="text-end">5-Tüketim (Sm³)</th>
                    <th className="text-end">6-Enerji (kcal)</th>
                    <th className="text-center">7-Isıl Değer (Ho)</th>
                    <th className="text-center">Basınç</th>
                    <th className="text-center">Sıcaklık</th>
                    <th className="text-center">Durum</th>
                    <th className="text-center">Belgeler</th>
                    <th>Not / Açıklama</th>
                    <th className="text-end" style={{ width: '80px' }}>Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((reading) => (
                    <tr key={reading._id}>
                      <td className="fw-bold">{reading.gasDate}</td>
                      <td>
                        <div className="fw-semibold text-dark">{reading.stationName}</div>
                        <small className="text-muted"><code>{reading.u}</code></small>
                      </td>
                      <td className="text-end fw-bold text-primary">
                        {reading.consumption !== null && reading.consumption !== undefined
                          ? Number(reading.consumption).toLocaleString('tr-TR')
                          : '—'}
                      </td>
                      <td className="text-end fw-semibold">
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
                                <Badge bg="info" className="p-1" style={{ fontSize: '9px' }}>
                                  7 Nolu İkame
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="text-center">{reading.pressure ? `${reading.pressure} Bar` : '—'}</td>
                      <td className="text-center">{reading.temperature ? `${reading.temperature} °C` : '—'}</td>
                      <td className="text-center">
                        {reading.status === 'APPROVED' && (
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
                        {reading.status === 'DENIED' && (
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
                        {reading.status === 'PENDING' && <Badge bg="warning" text="dark">BEKLEMEDE</Badge>}
                      </td>
                      <td className="text-center">
                        <div className="d-inline-flex align-items-center gap-1">
                          {reading.files && reading.files.length > 0 ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="p-1 px-2 small d-inline-flex align-items-center gap-1"
                              onClick={() => setDetailModalData(reading)}
                              title="PDF Raporu ve Verileri Yan Yana İncele"
                            >
                              <FileText size={14} />
                              <span>{reading.files.length} Rapor</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="p-1 px-2 small"
                              onClick={() => setUploadModalData(reading)}
                              title="Dosya Yükle"
                            >
                              <FileText size={14} className="me-1" />
                              <span>Yükle</span>
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="small">
                        {reading.operatorNote && (
                          <div className="text-primary small" title={reading.operatorNote}>
                            📝 {reading.operatorNote.length > 35 ? reading.operatorNote.slice(0, 35) + '...' : reading.operatorNote}
                          </div>
                        )}
                        {reading.approvalInfo?.actionBy && (
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {reading.approvalInfo.actionBy} ({new Date(reading.approvalInfo.actionAt).toLocaleDateString('tr-TR')})
                          </div>
                        )}
                      </td>
                      <td className="text-end">
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="p-1 px-2"
                          onClick={() => setDetailModalData(reading)}
                          title="Detay İncele"
                        >
                          <Eye size={15} />
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
