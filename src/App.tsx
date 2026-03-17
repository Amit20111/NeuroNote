import { useState, useEffect } from 'react';
import './index.css';
import HomePage from './pages/HomePage';
import StudySessionPage from './pages/StudySessionPage';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';

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

export default function App() {
  const [route, setRoute] = useState<string>(getRoute());
  const [studyData, setStudyData] = useState<any>(null); // Replace any broadly with proper StudyData
  const [settingsWarning, setSettingsWarning] = useState<string>('');

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
        <div style={{
          padding: '0 var(--space-lg)',
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
        {renderPage()}
      </main>
    </div>
  );
}
