import React, { useState, useEffect, Suspense } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

// Lazy load pages for performance
const HomePage = React.lazy(() => import('./pages/HomePage'));
const StudySessionPage = React.lazy(() => import('./pages/StudySessionPage'));
const LibraryPage = React.lazy(() => import('./pages/LibraryPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

function getRoute(): string {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  return hash || '';
}

interface NavItem {
  route: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { route: '', label: 'Home', icon: '⚡' },
  { route: 'study', label: 'Study', icon: '📖' },
  { route: 'library', label: 'Library', icon: '📚' },
  { route: 'settings', label: 'Settings', icon: '⚙️' },
];

function MainApp() {
  const [route, setRoute] = useState<string>(getRoute());
  const [studyData, setStudyData] = useState<any>(null); // Replace any broadly with proper StudyData
  const [settingsWarning, setSettingsWarning] = useState<string>('');

  const { logout, user } = useAuth();

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (path: string, data?: any) => {
    if (path === 'study' && data) {
      setStudyData(data);
    }
    if (path === 'settings' && data?.warning) {
      setSettingsWarning(data.warning);
    } else {
      setSettingsWarning('');
    }
    window.location.hash = '#/' + path;
  };

  const handleLogout = () => {
    logout();
    navigate('');
  };

  const renderPage = () => {
    switch (route) {
      case '':
        return <HomePage onNavigate={navigate} />;
      case 'study':
        return <StudySessionPage studyData={studyData} onNavigate={navigate} />;
      case 'library':
        return <LibraryPage onNavigate={navigate} />;
      case 'settings':
        return <SettingsPage warning={settingsWarning} />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => navigate('')}>
          Neuro<span className="logo-flow">Note</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <a
              key={item.route}
              className={`nav-item ${route === item.route ? 'active' : ''}`}
              href={`#/${item.route}`}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                navigate(item.route);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {user && (
            <div className="user-email" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          )}
          <button 
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              width: '100%',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-secondary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {user ? 'Log Out' : 'Exit Guest Mode'}
          </button>
        </div>
        <div style={{
          padding: '1rem var(--space-lg)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Powered by Gemini
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--primary)' }}></div>
          </div>
        }>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
}

function AppContent() {
  const { user, isGuest, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div className="spinner" style={{ width: '50px', height: '50px', borderTopColor: 'var(--primary)' }}></div>
      </div>
    );
  }
  
  if (!user && !isGuest) {
    return <AuthPage onNavigate={(route) => window.location.hash = '#/' + route} />;
  }
  
  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
