import { useState } from 'react';
import storage from '../services/storage';

export default function StudySessionPage({ studyData, onNavigate }) {
  const { data, rawText, sourceType, title, selectedOutputs, parseError } = studyData || {};

  const availableTabs = selectedOutputs?.filter(t => data?.[t]) || [];
  const [activeTab, setActiveTab] = useState(availableTabs[0] || 'notes');
  const [saved, setSaved] = useState(false);

  if (!studyData) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-text">No study session active</div>
        <div className="empty-state-sub">Generate materials from the home page to get started</div>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => onNavigate('')}>
          Go to Home
        </button>
      </div>
    );
  }

  if (parseError) {
    return (
      <div>
        <div className="page-header">
          <h1>⚠ Parse Error</h1>
          <p>Gemini returned malformed JSON. Here's the raw response:</p>
        </div>
        <div className="card" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', maxHeight: 500, overflow: 'auto' }}>
          {rawText}
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => onNavigate('')}>
          ← Try Again
        </button>
      </div>
    );
  }

  const handleSave = () => {
    storage.saveToLibrary({
      title,
      sourceType,
      selectedOutputs: availableTabs,
      data,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const TAB_LABELS = {
    notes: '📝 Notes',
    flashcards: '🃏 Flashcards',
    quiz: '❓ Quiz',
    summary: '📋 Summary',
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{title || 'Study Session'}</h1>
          <p>Your AI-generated study materials are ready</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('')}>
            ← New
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saved}>
            {saved ? '✓ Saved!' : '💾 Save to Library'}
          </button>
        </div>
      </div>

      {availableTabs.length > 1 && (
        <div className="tabs">
          {availableTabs.map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab] || tab}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        {activeTab === 'notes' && data.notes && <NotesView notes={data.notes} />}
        {activeTab === 'flashcards' && data.flashcards && <FlashcardsView flashcards={data.flashcards} />}
        {activeTab === 'quiz' && data.quiz && <QuizView quiz={data.quiz} />}
        {activeTab === 'summary' && data.summary && <SummaryView summary={data.summary} />}
      </div>
    </div>
  );
}

/* ---------- Notes ---------- */
function NotesView({ notes }) {
  return (
    <div>
      {notes.sections?.map((section, i) => (
        <div key={i} className="notes-section">
          <h3>{section.heading}</h3>
          {section.body && <p className="notes-body">{section.body}</p>}
          {section.bullets?.length > 0 && (
            <ul className="notes-bullets">
              {section.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Flashcards ---------- */
function FlashcardsView({ flashcards }) {
  const [flippedSet, setFlippedSet] = useState(new Set());

  const toggle = (i) => {
    setFlippedSet(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Click a card to reveal the answer · {flashcards.length} cards
      </p>
      <div className="flashcard-grid">
        {flashcards.map((card, i) => (
          <div key={i} className={`flashcard ${flippedSet.has(i) ? 'flipped' : ''}`} onClick={() => toggle(i)}>
            <div className="flashcard-inner">
              <div className="flashcard-face flashcard-front">
                <div className="flashcard-label">Question {i + 1}</div>
                <div className="flashcard-text">{card.question}</div>
              </div>
              <div className="flashcard-face flashcard-back">
                <div className="flashcard-label">Answer</div>
                <div className="flashcard-text">{card.answer}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Quiz ---------- */
function QuizView({ quiz }) {
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const handleSelect = (qIdx, optIdx) => {
    if (answers[qIdx] !== undefined) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const answeredAll = Object.keys(answers).length === quiz.length;
  const score = quiz.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);

  return (
    <div>
      {!showResults ? (
        <>
          {quiz.map((q, i) => (
            <div key={i} className="quiz-question">
              <div className="quiz-question-number">Question {i + 1} of {quiz.length}</div>
              <div className="quiz-question-text">{q.question}</div>
              <div className="quiz-options">
                {q.options.map((opt, j) => {
                  let cls = 'quiz-option';
                  if (answers[i] !== undefined) {
                    cls += ' disabled';
                    if (j === q.correct) cls += ' correct';
                    else if (j === answers[i] && j !== q.correct) cls += ' incorrect';
                  } else if (answers[i] === j) {
                    cls += ' selected';
                  }
                  return (
                    <div key={j} className={cls} onClick={() => handleSelect(i, j)}>
                      {opt}
                    </div>
                  );
                })}
              </div>
              {answers[i] !== undefined && q.explanation && (
                <div className="quiz-explanation">
                  💡 {q.explanation}
                </div>
              )}
            </div>
          ))}
          {answeredAll && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="btn btn-primary" onClick={() => setShowResults(true)}>
                View Final Score
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="quiz-score">
          <div className="quiz-score-value">{score}/{quiz.length}</div>
          <div className="quiz-score-label">
            {score === quiz.length ? '🎉 Perfect Score!' : score >= quiz.length * 0.7 ? '👏 Great Job!' : '📖 Keep Studying!'}
          </div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 24 }}
            onClick={() => { setAnswers({}); setShowResults(false); }}
          >
            Retry Quiz
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Summary ---------- */
function SummaryView({ summary }) {
  return (
    <div>
      {summary.tldr && (
        <div className="summary-tldr">{summary.tldr}</div>
      )}

      {summary.keyPoints?.length > 0 && (
        <div className="key-points">
          <h3 style={{ marginBottom: 16 }}>Key Points</h3>
          {summary.keyPoints.map((point, i) => (
            <div key={i} className="key-point">
              <span className="key-point-number">{i + 1}</span>
              <span className="key-point-text">{point}</span>
            </div>
          ))}
        </div>
      )}

      {summary.terms?.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 16 }}>Key Terms Glossary</h3>
          <div className="terms-grid">
            {summary.terms.map((term, i) => (
              <div key={i} className="term-card">
                <div className="term-name">{term.name}</div>
                <div className="term-def">{term.definition}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
