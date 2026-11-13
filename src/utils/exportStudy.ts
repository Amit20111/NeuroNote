function sanitizeFilename(name: string): string {
  return (name || 'neuronote-study-set')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'neuronote-study-set';
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string): string {
  const str = String(value ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

export function exportStudyMarkdown(title: string, data: Record<string, any>): void {
  const lines: string[] = [`# ${title || 'NeuroNote Study Set'}`, ''];

  if (data.summary) {
    lines.push('## Summary', '');
    if (data.summary.tldr) {
      lines.push(data.summary.tldr, '');
    }
    if (Array.isArray(data.summary.keyPoints) && data.summary.keyPoints.length > 0) {
      lines.push('### Key Points', '');
      for (const point of data.summary.keyPoints) {
        lines.push(`- ${point}`);
      }
      lines.push('');
    }
    if (Array.isArray(data.summary.terms) && data.summary.terms.length > 0) {
      lines.push('### Key Terms', '');
      for (const term of data.summary.terms) {
        lines.push(`- **${term.name}**: ${term.definition}`);
      }
      lines.push('');
    }
  }

  if (Array.isArray(data.notes?.sections) && data.notes.sections.length > 0) {
    lines.push('## Notes', '');
    for (const section of data.notes.sections) {
      lines.push(`### ${section.heading}`, '');
      if (section.body) {
        lines.push(section.body, '');
      }
      if (Array.isArray(section.bullets) && section.bullets.length > 0) {
        for (const bullet of section.bullets) {
          lines.push(`- ${bullet}`);
        }
        lines.push('');
      }
    }
  }

  if (Array.isArray(data.flashcards) && data.flashcards.length > 0) {
    lines.push('## Flashcards', '');
    data.flashcards.forEach((card: { question: string; answer: string }, idx: number) => {
      lines.push(`**Q${idx + 1}:** ${card.question}`);
      lines.push(`**A${idx + 1}:** ${card.answer}`, '');
    });
  }

  if (Array.isArray(data.quiz) && data.quiz.length > 0) {
    lines.push('## Quiz', '');
    data.quiz.forEach((q: { question: string; options: string[]; correct: number; explanation?: string }, idx: number) => {
      lines.push(`### ${idx + 1}. ${q.question}`, '');
      q.options?.forEach((opt, optIdx) => {
        const marker = optIdx === q.correct ? ' (Correct)' : '';
        lines.push(`- ${String.fromCharCode(65 + optIdx)}. ${opt}${marker}`);
      });
      if (q.explanation) {
        lines.push('', `> ${q.explanation}`);
      }
      lines.push('');
    });
  }

  triggerDownload(lines.join('\n'), `${sanitizeFilename(title)}.md`, 'text/markdown;charset=utf-8');
}

export function exportFlashcardsCsv(title: string, flashcards: Array<{ question: string; answer: string }>): void {
  const rows = flashcards.map(card => `${escapeCsvCell(card.question)},${escapeCsvCell(card.answer)}`);
  triggerDownload(rows.join('\n'), `${sanitizeFilename(title)}-flashcards.csv`, 'text/csv;charset=utf-8');
}
