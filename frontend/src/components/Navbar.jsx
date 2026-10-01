import React from 'react';
import { Navbar, Nav, Container, NavDropdown, Badge } from 'react-bootstrap';
import { Flame, Activity, Database, Users, History, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AppNavbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm border-bottom border-secondary mb-4 py-2">
      <Container fluid className="px-4">
        <Navbar.Brand 
          href="#home" 
          onClick={(e) => { e.preventDefault(); setActiveTab('daily'); }}
          className="d-flex align-items-center gap-2 fw-bold text-warning"
          style={{ letterSpacing: '0.5px' }}
        >
          <div className="bg-warning text-dark p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
            <Flame size={20} className="text-dark" />
          </div>
          <span>GAZ ALIM TAKİP SİSTEMİ</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto ms-lg-4 gap-1">
            <Nav.Link 
              active={activeTab === 'daily'} 
              onClick={() => setActiveTab('daily')}
              className={`d-flex align-items-center gap-2 px-3 py-2 rounded ${activeTab === 'daily' ? 'bg-primary text-white' : 'text-light'}`}
            >
              <Activity size={18} />
              <span>Günlük Gaz Okumaları</span>
            </Nav.Link>

            <Nav.Link 
              active={activeTab === 'archive'} 
              onClick={() => setActiveTab('archive')}
              className={`d-flex align-items-center gap-2 px-3 py-2 rounded ${activeTab === 'archive' ? 'bg-primary text-white' : 'text-light'}`}
            >
              <History size={18} />
              <span>Geçmiş & Arşiv</span>
            </Nav.Link>

            {isAdmin && (
              <>
                <Nav.Link 
                  active={activeTab === 'stations'} 
                  onClick={() => setActiveTab('stations')}
                  className={`d-flex align-items-center gap-2 px-3 py-2 rounded ${activeTab === 'stations' ? 'bg-primary text-white' : 'text-light'}`}
                >
                  <Database size={18} />
                  <span>İstasyon Yönetimi</span>
                </Nav.Link>

                <Nav.Link 
                  active={activeTab === 'users'} 
                  onClick={() => setActiveTab('users')}
                  className={`d-flex align-items-center gap-2 px-3 py-2 rounded ${activeTab === 'users' ? 'bg-primary text-white' : 'text-light'}`}
                >
                  <Users size={18} />
                  <span>Kullanıcı Yönetimi</span>
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="align-items-center gap-3">
            {user && (
              <div className="d-flex align-items-center gap-3">
                <div className="text-end d-none d-sm-block">
                  <div className="text-light fw-semibold small">{user.fullName || user.username}</div>
                  <Badge bg={isAdmin ? 'warning' : 'info'} text={isAdmin ? 'dark' : 'white'} className="text-uppercase" style={{ fontSize: '10px' }}>
                    {isAdmin ? 'Yönetici (Admin)' : (user.assignedStation?.name || user.stationU ? `${user.assignedStation?.name || user.stationU.toUpperCase()} YETKİLİSİ` : 'Operatör')}
                  </Badge>
                </div>

                <button 
                  onClick={logout} 
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 px-3 py-1.5"
                  title="Çıkış Yap"
                >
                  <LogOut size={16} />
                  <span>Çıkış</span>
                </button>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
