import type { AppSettings, LibraryEntry } from './storage';

export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export interface SignupPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
}

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('Cannot connect to NeuroNote. Make sure the app server is running, then try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || (response.status >= 500
      ? 'The NeuroNote server is unavailable. Please try again shortly.'
      : `Request failed (${response.status}). Please try again.`));
  }

  if (data === null) throw new Error('NeuroNote received an unexpected server response. Please restart the app and try again.');
  return data;
};

export const fetchWithAuth = (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return apiRequest(endpoint, { ...options, headers });
};

export const api = {
  // Health
  health: () => apiRequest('/health'),

  // Auth
  login: (email: string, password: string) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  signup: (payload: SignupPayload) => apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  googleLogin: (credential: string) => apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  }),

  // Generation
  generate: (content: string, selectedOutputs: string[], settings: AppSettings) => fetchWithAuth('/generate', {
    method: 'POST',
    body: JSON.stringify({ content, selectedOutputs, settings }),
  }),

  // Library
  getLibrary: () => fetchWithAuth('/library'),
  saveToLibrary: (content: LibraryEntry) => fetchWithAuth('/library', {
    method: 'POST',
    body: JSON.stringify({ content }),
  }),
  deleteFromLibrary: (id: string) => fetchWithAuth(`/library/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
};
