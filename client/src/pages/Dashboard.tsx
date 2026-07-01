import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '../utils/api';

// Icons
import {
  LogOut,
  User,
  LayoutDashboard,
  FileText,
  Bell,
  Settings,
  Folder,
} from 'lucide-react';

// Pages
import Supervisor from './roles/Supervisor';
import Admin      from './roles/Admin';
import Profile    from './shared/Profile';
import Vault      from './shared/Vault';

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onProfileUpdate?: (user: any) => void;
}

type RoleType = 'supervisor' | 'admin';

export default function Dashboard({ user, onLogout, onProfileUpdate }: DashboardProps) {
  const { data: profileData } = useQuery<any>({
    queryKey: ['profile', user?.username],
    queryFn: () => fetchProfile(user.username),
    enabled: !!user?.username
  });

  const activeRole: RoleType = (user?.assignedRole === 'admin' || user?.assignedRole === 'sys_admin')
    ? 'admin'
    : 'supervisor';

  const [activeView, setActiveView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (profileData?.success && profileData.user && onProfileUpdate) {
      const u = profileData.user;
      if (u.firstName !== user.firstName || u.lastName !== user.lastName ||
          u.phoneNumber !== user.phoneNumber || u.officeLocation !== user.officeLocation) {
        onProfileUpdate(u);
      }
    }
  }, [profileData, user, onProfileUpdate]);

  // ── Sidebar links per role ──────────────────────────────────
  const getSidebarLinks = () => {
    const links = [
      { id: 'dashboard', label: 'Invoice Management', icon: <FileText size={18} /> },
      { id: 'vault',     label: 'Vault',              icon: <Folder size={18} /> },
      { id: 'profile',   label: 'My Profile',         icon: <User size={18} /> },
    ];
    return links;
  };

  const getRoleLabel = () =>
    activeRole === 'admin' ? 'Facilities Administrator' : 'Facilities Supervisor';

  // ── Content ─────────────────────────────────────────────────
  const renderContent = () => {
    if (activeView === 'profile') {
      return <Profile user={user} activeRole={activeRole} onProfileUpdate={onProfileUpdate} />;
    }
    if (activeView === 'vault') {
      return <Vault user={user} />;
    }
    if (activeRole === 'admin') {
      return <Admin user={user} />;
    }
    return <Supervisor user={user} />;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className={`sidebar-container ${sidebarOpen ? 'open' : ''}`} style={{
        width: '240px',
        backgroundColor: '#05463a',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        zIndex: 50,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0.625rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{
            backgroundColor: 'white', borderRadius: 'var(--radius-md)',
            padding: '0.25rem', boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src="/logo_with_name.png" alt="DLRRD Logo" style={{ width: '100%', height: 'auto', maxHeight: '72px', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '1.5rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {getSidebarLinks().map(link => {
            const isActive = activeView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => { setActiveView(link.id); setSidebarOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.7rem 1rem', fontSize: '0.875rem', fontWeight: 500,
                  color: isActive ? '#0e4d41' : '#b0c5c1',
                  backgroundColor: isActive ? '#d8c14c' : 'transparent',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s ease', width: '100%'
                }}
                className="sidebar-link-btn"
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '0.5rem 0.875rem 1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={onLogout} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
            padding: '0.7rem 1rem', fontSize: '0.875rem', fontWeight: 500,
            color: '#fca5a5', backgroundColor: 'transparent',
            border: 'none', borderRadius: '10px', cursor: 'pointer',
            textAlign: 'left', transition: 'all 0.2s ease'
          }} className="sidebar-link-btn logout-btn">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#f8fafc' }}>

        {/* Header Bar */}
        <header style={{
          height: '64px', backgroundColor: 'white',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 2rem', position: 'relative', zIndex: 10, flexShrink: 0,
        }}>
          <h2 className="header-title" style={{ fontSize: '1.1rem', color: '#0e4d41', fontWeight: 700, margin: 0 }}>
            Facility Management
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => alert('No new notifications')} style={{
              background: 'none', border: 'none', color: '#0e4d41', cursor: 'pointer',
              padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', backgroundColor: '#f1f5f9'
            }} title="Notifications"><Bell size={17} /></button>

            <button onClick={() => alert('Settings')} style={{
              background: 'none', border: 'none', color: '#0e4d41', cursor: 'pointer',
              padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', backgroundColor: '#f1f5f9'
            }} title="Settings"><Settings size={17} /></button>

            {/* Profile pill */}
            <button onClick={() => setActiveView('profile')} style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              background: 'none', border: '1px solid #e2e8f0', borderRadius: '10px',
              padding: '0.3rem 0.875rem 0.3rem 0.375rem', cursor: 'pointer', backgroundColor: '#f8fafc',
              transition: 'background-color 0.2s ease'
            }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                backgroundColor: '#0e4d41', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
              }}>
                {(user?.firstName ? (user.firstName[0] + (user.lastName?.[0] ?? '')) : 'TM').toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8rem', lineHeight: 1.2 }}>
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User'}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2 }}>{getRoleLabel()}</span>
              </div>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="dashboard-content-scroll" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {renderContent()}
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .sidebar-link-btn:hover {
          color: white !important;
          background-color: rgba(255,255,255,0.07) !important;
        }
        .logout-btn:hover {
          background-color: rgba(220,38,38,0.12) !important;
        }
        @media (max-width: 1024px) {
          .sidebar-container {
            position: fixed !important;
            top: 0; bottom: 0; left: -240px;
          }
          .sidebar-container.open {
            left: 0 !important;
          }
        }
        @media (max-width: 640px) {
          .header-title { font-size: 0.9rem !important; }
          .dashboard-content-scroll { padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
}
