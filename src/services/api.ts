export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Library endpoints
  getLibrary: () => fetchWithAuth('/library'),
  saveToLibrary: (content: any) => fetchWithAuth('/library', {
    method: 'POST',
    body: JSON.stringify({ content })
  }),
};
