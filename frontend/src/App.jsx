import React, { useState } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import { useAuth } from './context/AuthContext';
import AppNavbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DailyReadingsPage from './pages/DailyReadingsPage';
import StationsPage from './pages/StationsPage';
import UsersPage from './pages/UsersPage';
import ArchivePage from './pages/ArchivePage';

export default function App() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <Spinner animation="border" variant="warning" style={{ width: '3rem', height: '3rem' }} />
          <div className="mt-3 text-muted fw-semibold">Sistem Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <AppNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <Container fluid className="px-4 pb-5 flex-grow-1">
        {activeTab === 'daily' && <DailyReadingsPage />}
        {activeTab === 'archive' && <ArchivePage />}
        {activeTab === 'stations' && isAdmin && <StationsPage />}
        {activeTab === 'users' && isAdmin && <UsersPage />}
      </Container>

      <footer className="bg-white border-top py-3 text-center text-muted small mt-auto">
        <Container>
          <span>Gaz Alım Takip & Sayaç Veri Sistemi &copy; {new Date().getFullYear()}</span>
        </Container>
      </footer>
    </div>
  );
}
