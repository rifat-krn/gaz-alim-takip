import React from 'react';
import { Modal, Button, Table, Badge, Tabs, Tab } from 'react-bootstrap';
import { Info, BarChart3, Clock, CheckCircle2, XCircle, FileText } from 'lucide-react';

export default function ReadingDetailModal({ show, onHide, reading }) {
  if (!reading) return null;

  const comp = reading.composition || {};

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
          <Info size={22} className="text-warning" />
          <span>İstasyon Ölçüm & Gaz Analiz Detayı</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
          <div>
            <h4 className="fw-bold mb-1 text-dark">{reading.stationName}</h4>
            <div className="text-muted small">
              Kullanıcı: <code>{reading.u}</code> • Gaz Günü: <strong>{reading.gasDate}</strong>
            </div>
          </div>
          <div>
            {reading.status === 'APPROVED' && <Badge bg="success" className="p-2 fs-6">ONAYLANDI</Badge>}
            {reading.status === 'DENIED' && <Badge bg="danger" className="p-2 fs-6">REDDEDİLDİ</Badge>}
            {reading.status === 'PENDING' && <Badge bg="warning" text="dark" className="p-2 fs-6">BEKLEMEDE</Badge>}
          </div>
        </div>

        <Tabs defaultActiveKey="measurements" className="mb-3">
          <Tab eventKey="measurements" title="Sayaç & Gaz Değerleri">
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card bg-light border-0 p-3 text-center">
                  <div className="text-muted small">Düzeltilmiş Tüketim (Sm³)</div>
                  <div className="fs-4 fw-bold text-primary">
                    {reading.consumption !== null ? Number(reading.consumption).toLocaleString('tr-TR') : '—'}
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card bg-light border-0 p-3 text-center">
                  <div className="text-muted small">Toplam Enerji (kcal)</div>
                  <div className="fs-4 fw-bold text-success">
                    {reading.energy !== null ? Number(reading.energy).toLocaleString('tr-TR') : '—'}
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card bg-light border-0 p-3 text-center position-relative">
                  <div className="text-muted small">Aktif Üst Isıl Değer (Ho)</div>
                  <div className="fs-4 fw-bold text-dark">
                    {reading.superiorHeatingValue !== null ? Number(reading.superiorHeatingValue).toLocaleString('tr-TR') : '—'}
                  </div>
                  {reading.isSubstitutedSHV && (
                    <Badge bg="info" className="mt-1" style={{ fontSize: '10px' }}>
                      7 Nolu İkame Ho Aktif
                    </Badge>
                  )}
                </div>
              </div>

              <div className="col-md-4">
                <div className="card bg-light border-0 p-3 text-center">
                  <div className="text-muted small">Basınç (Bar)</div>
                  <div className="fs-5 fw-bold">{reading.pressure !== null ? `${reading.pressure} Bar` : '—'}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card bg-light border-0 p-3 text-center">
                  <div className="text-muted small">Sıcaklık (°C)</div>
                  <div className="fs-5 fw-bold">{reading.temperature !== null ? `${reading.temperature} °C` : '—'}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card bg-light border-0 p-3 text-center">
                  <div className="text-muted small">Özgül Ağırlık (SG)</div>
                  <div className="fs-5 fw-bold">{reading.specificGravity !== null ? reading.specificGravity : '—'}</div>
                </div>
              </div>
            </div>

            {reading.operatorNote && (
              <div className="alert alert-info py-2 px-3 mb-3 small d-flex align-items-center gap-2">
                <FileText size={18} className="flex-shrink-0" />
                <div>
                  <strong>İstasyon / Operatör Notu:</strong> {reading.operatorNote}
                </div>
              </div>
            )}

            <div className="p-3 bg-light rounded border mb-3">
              <h6 className="fw-bold mb-2 small text-muted">Isıl Değer (Ho) Kaynak Karşılaştırması</h6>
              <div className="row g-2 small">
                <div className="col-md-6">
                  <span className="text-muted">7 Nolu Veri (Operatör / İkame Ho):</span>
                  <div className="fw-bold text-primary">
                    {reading.operatorSuperiorHeatingValue ? `${reading.operatorSuperiorHeatingValue} kcal/Sm³` : '—'}
                  </div>
                </div>
                <div className="col-md-6">
                  <span className="text-muted">30 Nolu Veri (İstasyon Toplam Ho):</span>
                  <div className="fw-bold text-dark">
                    {reading.stationTotalSuperiorHeatingValue ? `${reading.stationTotalSuperiorHeatingValue} kcal/Sm³` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-light rounded border">
              <h6 className="fw-bold mb-2 d-flex align-items-center gap-1">
                <Clock size={16} />
                <span>OYS Sorgu Zaman Aralıkları</span>
              </h6>
              <div className="row small text-muted">
                <div className="col-md-4"><strong>dt1 (Başlangıç):</strong> {reading.dt1 || '—'}</div>
                <div className="col-md-4"><strong>dt2 (Başlangıç):</strong> {reading.dt2 || '—'}</div>
                <div className="col-md-4"><strong>dt3 (Bitiş):</strong> {reading.dt3 || '—'}</div>
              </div>
            </div>
          </Tab>

          <Tab eventKey="composition" title="Kromatografi (Gaz Bileşimi %)">
            <Table bordered hover responsive size="sm" className="mb-0">
              <thead className="table-secondary">
                <tr>
                  <th>Bileşen</th>
                  <th>Kimyasal Formül</th>
                  <th>Mol % Oranı</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Metan</td><td>CH4</td><td>{comp.methane !== null ? `%${comp.methane}` : '—'}</td></tr>
                <tr><td>Etan</td><td>C2H6</td><td>{comp.ethane !== null ? `%${comp.ethane}` : '—'}</td></tr>
                <tr><td>Propan</td><td>C3H8</td><td>{comp.propane !== null ? `%${comp.propane}` : '—'}</td></tr>
                <tr><td>İzo-Bütan</td><td>i-C4H10</td><td>{comp.iButane !== null ? `%${comp.iButane}` : '—'}</td></tr>
                <tr><td>Normal-Bütan</td><td>n-C4H10</td><td>{comp.nButane !== null ? `%${comp.nButane}` : '—'}</td></tr>
                <tr><td>İzo-Pentan</td><td>i-C5H12</td><td>{comp.iPentane !== null ? `%${comp.iPentane}` : '—'}</td></tr>
                <tr><td>Normal-Pentan</td><td>n-C5H12</td><td>{comp.nPentane !== null ? `%${comp.nPentane}` : '—'}</td></tr>
                <tr><td>Hekzan+</td><td>C6+</td><td>{comp.hexane !== null ? `%${comp.hexane}` : '—'}</td></tr>
                <tr><td>Azot</td><td>N2</td><td>{comp.nitrogen !== null ? `%${comp.nitrogen}` : '—'}</td></tr>
                <tr><td>Karbondioksit</td><td>CO2</td><td>{comp.co2 !== null ? `%${comp.co2}` : '—'}</td></tr>
              </tbody>
            </Table>
          </Tab>

          {reading.approvalInfo && (reading.approvalInfo.actionBy || reading.approvalInfo.notes || reading.approvalInfo.rejectionReason) && (
            <Tab eventKey="approval" title="Onay / Red Geçmişi">
              <div className="p-3 bg-light rounded border">
                <p className="mb-1"><strong>İşlem Yapan:</strong> {reading.approvalInfo.actionBy || '—'}</p>
                <p className="mb-1"><strong>İşlem Tarihi:</strong> {reading.approvalInfo.actionAt ? new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR') : '—'}</p>
                {reading.approvalInfo.notes && (
                  <p className="mb-1 text-success"><strong>Onay Notu:</strong> {reading.approvalInfo.notes}</p>
                )}
                {reading.approvalInfo.rejectionReason && (
                  <p className="mb-0 text-danger"><strong>Ret Sebebi:</strong> {reading.approvalInfo.rejectionReason}</p>
                )}
              </div>
            </Tab>
          )}

          <Tab eventKey="raw" title="Ham OYS Yanıtı">
            <pre className="bg-dark text-light p-3 rounded small" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {JSON.stringify(reading.rawData || reading, null, 2)}
            </pre>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <Button variant="secondary" onClick={onHide}>
          Kapat
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
