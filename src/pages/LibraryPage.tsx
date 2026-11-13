import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import storage, { LibraryEntry } from '../services/storage';

const SOURCE_ICONS: Record<string, string> = {
  youtube: '▶',
  web: '🌐',
  pdf: '📄',
  text: '✏️',
};

interface LibraryPageProps {
  onNavigate: (path: string, data?: any) => void;
}

export default function LibraryPage({ onNavigate }: LibraryPageProps) {
  const { user, isGuest } = useAuth();
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLibrary();
  }, [user, isGuest]);

  const fetchLibrary = async () => {
    if (user) {
      setLoading(true);
      try {
        const data = await api.getLibrary();
        // The backend returns an array of entries with { _id, content: LibraryEntry }
        // We map them to match expected format
        const formatted = data.map((d: any) => ({
          ...d.content,
          id: d._id,
        }));
        setLibrary(formatted);
      } catch (err) {
        console.error('Failed to load library:', err);
        setError('Unable to load your library. Please try again.');
      } finally {
        setLoading(false);
      }
    } else if (isGuest) {
      setLibrary(storage.getLibrary());
    }
  };

  const handleDelete = async (id: string) => {
    if (deleting) return;
    setDeleting(id);
    setError('');
    try {
      if (isGuest) storage.deleteFromLibrary(id);
      else if (user) await api.deleteFromLibrary(id);
      else return;
      setLibrary(previous => previous.filter(entry => entry.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete study set. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleOpen = (entry: LibraryEntry) => {
    onNavigate('study', {
      data: entry.results,
      sourceType: entry.sourceType,
      sourceRef: entry.sourceRef,
      title: entry.title,
      selectedOutputs: entry.results ? Object.keys(entry.results) : [],
    });
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  if (loading) {
     return (
       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
         <div className="spinner"></div>
       </div>
     );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Library</h1>
          <p>{user ? `${library.length} saved study set${library.length !== 1 ? 's' : ''}` : "Guest Mode"}</p>
        </div>
        {isGuest && (
          <div className="banner banner-warning" style={{ margin: 0, padding: 'var(--space-sm) var(--space-md)' }}>
            ⚠️ Guest study sets are saved only in this browser
          </div>
        )}
      </div>

      {error && <div className="banner banner-error" role="alert">{error}</div>}
      {library.length > 0 && (
        <div className="input-group">
          <label className="input-label" htmlFor="library-search">Search study sets</label>
          <input id="library-search" className="input" type="search" placeholder="Search by title or source..." value={search} onChange={event => setSearch(event.target.value)} />
        </div>
      )}
      {library.length > 0 && !library.some(entry => `${entry.title} ${entry.sourceType}`.toLowerCase().includes(search.trim().toLowerCase())) && <p>No study sets match your search.</p>}
      {library.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">No saved study sets yet</div>
          <div className="empty-state-sub">
            {isGuest ? "Generate materials to use for this session." : "Generate materials and save them to build your library."}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => onNavigate('')}>
            Create Your First Set
          </button>
        </div>
      ) : (
        <div className="library-grid">
          {library.filter(entry => `${entry.title} ${entry.sourceType}`.toLowerCase().includes(search.trim().toLowerCase())).map((entry: any) => (
            <div key={entry.id || entry._mongoId} className="library-card" onClick={() => handleOpen(entry)}>
              <div className="library-card-header">
                <div className="library-card-title">{entry.title}</div>
                <div className="library-card-date">{formatDate(entry.date)}</div>
              </div>

              <div className="library-card-meta">
                <span className="library-card-source">
                  {SOURCE_ICONS[entry.sourceType] || '📝'} {entry.sourceType}
                </span>
              </div>

              <div className="library-card-tags">
                {entry.results && Object.keys(entry.results).map(t => (
                  <span key={t} className="library-tag">{t}</span>
                ))}
              </div>

              <div className="library-card-actions" onClick={e => e.stopPropagation()}>
                {deleteConfirm === entry.id ? (
                  <>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: 'auto' }}>
                      Delete?
                    </span>
                    <button className="btn btn-danger btn-sm" disabled={!!deleting} onClick={() => entry.id && handleDelete(entry.id)}>
                      {deleting === entry.id ? 'Deleting...' : 'Yes'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>
                      No
                    </button>
                  </>
                ) : (
                  <button className="btn btn-danger btn-sm" onClick={() => entry.id && setDeleteConfirm(entry.id)}>
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
