import React, { useState } from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { Flame, Activity, Database, Users, History, LogOut, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AppNavbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setExpanded(false);
  };

  return (
    <Navbar 
      expanded={expanded} 
      onToggle={(val) => setExpanded(val)}
      expand="lg" 
      className="shadow-sm mb-3 mb-md-4 py-2.5 sticky-top"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}
      variant="dark"
    >
      <Container fluid className="px-3 px-md-4">
        <Navbar.Brand 
          href="#home" 
          onClick={(e) => { e.preventDefault(); handleSelectTab('daily'); }}
          className="d-flex align-items-center gap-2.5 fw-bold text-white me-lg-4"
        >
          <div 
            className="p-2 rounded-3 d-flex align-items-center justify-content-center shadow-sm" 
            style={{ 
              width: 38, 
              height: 38, 
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' 
            }}
          >
            <Flame size={20} className="text-white" />
          </div>
          <div className="d-flex flex-column">
            <span className="fs-6 fw-bolder tracking-tight" style={{ letterSpacing: '0.3px', lineHeight: 1.1 }}>
              GAZ ALIM TAKİP
            </span>
            <span className="text-warning" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px' }}>
              RMS-A OTOMASYON PANELİ
            </span>
          </div>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" className="border-0 shadow-none" />
        <Navbar.Collapse id="main-nav" className="mt-2 mt-lg-0">
          <Nav className="me-auto gap-1 my-2 my-lg-0">
            <Nav.Link 
              active={activeTab === 'daily'} 
              onClick={() => handleSelectTab('daily')}
              className={`d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-semibold transition-all ${
                activeTab === 'daily' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-light opacity-75'
              }`}
            >
              <Activity size={17} />
              <span>Günlük Okumalar</span>
            </Nav.Link>

            <Nav.Link 
              active={activeTab === 'archive'} 
              onClick={() => handleSelectTab('archive')}
              className={`d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-semibold transition-all ${
                activeTab === 'archive' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-light opacity-75'
              }`}
            >
              <History size={17} />
              <span>Geçmiş & Arşiv</span>
            </Nav.Link>

            {isAdmin && (
              <>
                <Nav.Link 
                  active={activeTab === 'stations'} 
                  onClick={() => handleSelectTab('stations')}
                  className={`d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-semibold transition-all ${
                    activeTab === 'stations' 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-light opacity-75'
                  }`}
                >
                  <Database size={17} />
                  <span>İstasyonlar</span>
                </Nav.Link>

                <Nav.Link 
                  active={activeTab === 'users'} 
                  onClick={() => handleSelectTab('users')}
                  className={`d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-semibold transition-all ${
                    activeTab === 'users' 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-light opacity-75'
                  }`}
                >
                  <Users size={17} />
                  <span>Kullanıcılar</span>
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="align-items-lg-center pt-2 pt-lg-0 border-top border-secondary border-opacity-25 border-lg-0">
            {user && (
              <div className="d-flex align-items-center justify-content-between gap-3 w-100">
                <div className="d-flex align-items-center gap-2.5">
                  <div className="bg-secondary bg-opacity-25 p-2 rounded-circle text-info d-flex align-items-center justify-content-center">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <div className="text-white fw-semibold small lh-tight">{user.fullName || user.username}</div>
                    <Badge 
                      bg={isAdmin ? 'warning' : 'info'} 
                      text={isAdmin ? 'dark' : 'white'} 
                      className="text-uppercase mt-0.5" 
                      style={{ fontSize: '9.5px' }}
                    >
                      {isAdmin 
                        ? 'Sistem Yöneticisi' 
                        : (user.assignedStation?.name || user.stationU ? `${user.assignedStation?.name || user.stationU.toUpperCase()} Operatörü` : 'Operatör')}
                    </Badge>
                  </div>
                </div>

                <button 
                  onClick={logout} 
                  className="btn btn-danger btn-sm d-flex align-items-center gap-1.5 px-3 py-2 shadow-sm"
                  title="Güvenli Çıkış"
                >
                  <LogOut size={15} />
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
