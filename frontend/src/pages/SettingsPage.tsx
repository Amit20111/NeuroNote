import { useState, useEffect } from 'react';
import storage, { AppSettings } from '../services/storage';

const OUTPUT_OPTIONS = [
  { id: 'notes', label: 'Notes' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'summary', label: 'Summary' },
];

interface SettingsPageProps {
  warning?: string;
}

export default function SettingsPage({ warning }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>({
    defaultOutputs: ['notes', 'flashcards', 'quiz', 'summary'],
    flashcardCount: 10,
    quizCount: 7,
  });
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setSettings(storage.getSettings());
  }, []);

  const toggleOutput = (id: string) => {
    setSettings(prev => ({
      ...prev,
      defaultOutputs: prev.defaultOutputs.includes(id)
        ? prev.defaultOutputs.filter(o => o !== id)
        : [...prev.defaultOutputs, id],
    }));
  };

  const handleSave = () => {
    storage.setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your NeuroNote preferences</p>
      </div>

      {warning && (
        <div className="banner banner-warning">
          <span>⚠</span> {warning}
        </div>
      )}


      {/* Default Outputs */}
      <div className="settings-section">
        <h2>Default Output Types</h2>
        <div className="checkbox-group">
          {OUTPUT_OPTIONS.map(opt => (
            <label
              key={opt.id}
              className={`checkbox-label ${settings.defaultOutputs.includes(opt.id) ? 'checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={settings.defaultOutputs.includes(opt.id)}
                onChange={() => toggleOutput(opt.id)}
              />
              <span className="checkbox-indicator">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 6l3 3 5-5" stroke={settings.defaultOutputs.includes(opt.id) ? '#0e0e10' : 'transparent'} />
                </svg>
              </span>
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Counts */}
      <div className="settings-section">
        <h2>Generation Defaults</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', maxWidth: 400 }}>
          <div className="input-group">
            <label className="input-label">Flashcard Count</label>
            <input
              className="input"
              type="number"
              min={4}
              max={20}
              value={settings.flashcardCount}
              onChange={e => setSettings(prev => ({ ...prev, flashcardCount: parseInt(e.target.value) || 10 }))}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Quiz Questions</label>
            <input
              className="input"
              type="number"
              min={3}
              max={15}
              value={settings.quizCount}
              onChange={e => setSettings(prev => ({ ...prev, quizCount: parseInt(e.target.value) || 7 }))}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button className="btn btn-primary" onClick={handleSave}>
        {saved ? '✓ Settings Saved!' : '💾 Save Settings'}
      </button>
    </div>
  );
}
