import { useState, useEffect } from 'react';
import storage from '../services/storage';

const SOURCE_ICONS = {
  youtube: '▶',
  web: '🌐',
  pdf: '📄',
  text: '✏️',
};

export default function LibraryPage({ onNavigate }) {
  const [library, setLibrary] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    setLibrary(storage.getLibrary());
  }, []);

  const handleDelete = (id) => {
    storage.deleteFromLibrary(id);
    setLibrary(storage.getLibrary());
    setDeleteConfirm(null);
  };

  const handleOpen = (entry) => {
    onNavigate('study', {
      data: entry.data,
      sourceType: entry.sourceType,
      title: entry.title,
      selectedOutputs: entry.selectedOutputs,
    });
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  if (library.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Library</h1>
          <p>Your saved study sets</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">No saved study sets yet</div>
          <div className="empty-state-sub">Generate materials and save them to build your library</div>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => onNavigate('')}>
            Create Your First Set
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Library</h1>
        <p>{library.length} saved study set{library.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="library-grid">
        {library.map(entry => (
          <div key={entry.id} className="library-card" onClick={() => handleOpen(entry)}>
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
              {entry.selectedOutputs?.map(t => (
                <span key={t} className="library-tag">{t}</span>
              ))}
            </div>

            <div className="library-card-actions" onClick={e => e.stopPropagation()}>
              {deleteConfirm === entry.id ? (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: 'auto' }}>
                    Delete?
                  </span>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(entry.id)}>
                    Yes
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>
                    No
                  </button>
                </>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(entry.id)}>
                  🗑 Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
