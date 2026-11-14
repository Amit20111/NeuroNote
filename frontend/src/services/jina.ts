const JINA_PREFIX = 'https://r.jina.ai/';

export async function fetchContent(url: string): Promise<string> {
  if (!url || !url.trim()) {
    throw new Error('URL is required');
  }

  const jinaUrl = JINA_PREFIX + encodeURIComponent(url.trim());

  const res = await fetch(jinaUrl, {
    headers: {
      'Accept': 'text/plain',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch content (${res.status}). Try pasting the content manually.`);
  }

  const text = await res.text();

  if (!text || text.trim().length < 20) {
    throw new Error('Could not extract meaningful content from this URL. Try pasting the content manually.');
  }

  return text;
}
