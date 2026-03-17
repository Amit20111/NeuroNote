import { useState, useRef } from 'react';
import { fetchContent } from '../services/jina';
import { generateStudyMaterials } from '../services/llm';
import * as pdfjsLib from 'pdfjs-dist';
import storage from '../services/storage';

const INPUT_TABS = [
  { id: 'youtube', label: 'YouTube', icon: '▶' },
  { id: 'web', label: 'Web Article', icon: '🌐' },
  { id: 'pdf', label: 'PDF Upload', icon: '📄' },
  { id: 'text', label: 'Paste Text', icon: '✏️' },
];

const OUTPUT_TYPES = [
  { id: 'notes', label: 'Notes' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'summary', label: 'Summary' },
];

interface HomePageProps {
  onNavigate: (path: string, data?: any) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const settings = storage.getSettings();
  const [activeTab, setActiveTab] = useState<string>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [webUrl, setWebUrl] = useState<string>('');
  const [pasteText, setPasteText] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(settings.defaultOutputs || ['notes', 'flashcards', 'quiz', 'summary']);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [fetchingUrl, setFetchingUrl] = useState<boolean>(false);
  const [fetchingPdf, setFetchingPdf] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Configure pdfjs worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const toggleOutput = (id: string) => {
    setSelectedOutputs(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }
    await processPdf(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      await processPdf(file);
    }
  };

  const processPdf = async (file: File) => {
    setPdfFile(file);
    setFetchingPdf(true);
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(buffer).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((s: any) => s.str).join(' ') + '\\n';
      }
      setPdfText(fullText);
    } catch (err) {
      console.error('Error processing PDF', err);
      setError('Failed to extract text from PDF.');
      setPdfFile(null);
    } finally {
      setFetchingPdf(false);
    }
  };

  const handleGenerate = async () => {
    setError('');

    if (selectedOutputs.length === 0) {
      setError('Select at least one output type.');
      return;
    }

    let content = '';
    let sourceType = activeTab;

    try {
      setLoading(true);

      if (activeTab === 'youtube') {
        if (!youtubeUrl.trim()) { setError('Enter a YouTube URL'); setLoading(false); return; }
        setFetchingUrl(true);
        content = await fetchContent(youtubeUrl.trim());
        setFetchingUrl(false);
      } else if (activeTab === 'web') {
        if (!webUrl.trim()) { setError('Enter a web URL'); setLoading(false); return; }
        setFetchingUrl(true);
        content = await fetchContent(webUrl.trim());
        setFetchingUrl(false);
      } else if (activeTab === 'pdf') {
        if (!pdfText) { setError('Upload a valid PDF file and wait for text extraction'); setLoading(false); return; }
        // Ensure the content fits in the context window (most models support at least 8k-16k, we'll cap at a safe limit if needed but let the API reject it otherwise or summarize it later)
        content = pdfText;
      } else if (activeTab === 'text') {
        if (!pasteText.trim()) { setError('Paste some text content'); setLoading(false); return; }
        content = pasteText.trim();
      }

      const results = await generateStudyMaterials(content, selectedOutputs);

      onNavigate('study', {
        data: results,
        sourceType,
        title: deriveTitle(activeTab, youtubeUrl, webUrl, pdfFile, pasteText),
        selectedOutputs,
      });
    } catch (err: any) {
      setFetchingUrl(false);
      if (err.message.startsWith('MALFORMED_JSON:')) {
        const rawText = err.message.slice('MALFORMED_JSON:'.length);
        setError('LLM returned invalid JSON. Raw response shown below.');
        onNavigate('study', {
          data: null,
          rawText,
          sourceType,
          title: 'Study Materials',
          selectedOutputs,
          parseError: true,
        });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Generate Study Materials</h1>
        <p>Transform any content into structured notes, flashcards, quizzes, and summaries</p>
      </div>

      {error && (
        <div className="banner banner-error">
          <span>⚠</span> {error}
        </div>
      )}

      {/* Input Tabs */}
      <div className="tabs">
        {INPUT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={{ marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        {activeTab === 'youtube' && (
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">YouTube Video URL</label>
            <input
              className="input"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
            />
          </div>
        )}

        {activeTab === 'web' && (
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Web Article URL</label>
            <input
              className="input"
              type="url"
              placeholder="https://example.com/article..."
              value={webUrl}
              onChange={e => setWebUrl(e.target.value)}
            />
          </div>
        )}

        {activeTab === 'pdf' && (
          <div>
            <div
              className={`file-drop-zone`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="drop-icon">📄</div>
              <div className="drop-text">Drop a PDF here or click to browse</div>
              <div className="drop-subtext">Supports .pdf files</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={handlePdfChange}
            />
            {fetchingPdf && <div style={{marginTop: '0.5rem', color: 'var(--primary)'}}>Extracting text from PDF... ⏳</div>}
            {pdfFile && !fetchingPdf && (
              <div className="file-info">
                <span className="file-info-name">📄 {pdfFile.name}</span>
                <button className="btn btn-sm btn-danger" onClick={() => { setPdfFile(null); setPdfText(''); }}>
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Paste your study content</label>
            <textarea
              className="textarea"
              placeholder="Paste lecture notes, article text, or any content you want to study..."
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={8}
            />
          </div>
        )}
      </div>

      {/* Output selections */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <label className="input-label" style={{ marginBottom: 'var(--space-md)' }}>Generate outputs</label>
        <div className="checkbox-group">
          {OUTPUT_TYPES.map(opt => (
            <label
              key={opt.id}
              className={`checkbox-label ${selectedOutputs.includes(opt.id) ? 'checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedOutputs.includes(opt.id)}
                onChange={() => toggleOutput(opt.id)}
              />
              <span className="checkbox-indicator">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 6l3 3 5-5" stroke={selectedOutputs.includes(opt.id) ? '#0e0e10' : 'transparent'} />
                </svg>
              </span>
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="btn btn-primary"
        onClick={handleGenerate}
        disabled={loading || selectedOutputs.length === 0}
        style={{ width: '100%', padding: '18px', fontSize: '1rem' }}
      >
        {loading
          ? (fetchingUrl ? '⏳ Fetching content...' : '⏳ Generating with AI...')
          : '⚡ Generate Study Materials'
        }
      </button>

      {loading && (
        <div className="spinner-overlay">
          <div className="spinner"></div>
          <div className="spinner-text">
            {fetchingUrl ? 'Fetching content from URL...' : 'Generating study materials with AI...'}
          </div>
        </div>
      )}
    </div>
  );
}

function deriveTitle(tab: string, youtubeUrl: string, webUrl: string, pdfFile: File | null, text: string): string {
  if (tab === 'youtube' && youtubeUrl) {
    try {
      const url = new URL(youtubeUrl);
      return `YouTube: ${url.searchParams.get('v') || 'Video'}`;
    } catch {
      return 'YouTube Video';
    }
  }
  if (tab === 'web' && webUrl) {
    try {
      return `Web: ${new URL(webUrl).hostname}`;
    } catch {
      return 'Web Article';
    }
  }
  if (tab === 'pdf' && pdfFile) return `PDF: ${pdfFile.name}`;
  if (tab === 'text' && text) return `Notes: ${text.slice(0, 40)}...`;
  return 'Study Materials';
}
