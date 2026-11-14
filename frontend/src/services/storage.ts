// localStorage service — all keys prefixed with ff_

const PREFIX = 'ff_';

export interface AppSettings {
  defaultOutputs: string[];
  flashcardCount: number;
  quizCount: number;
}

export interface LibraryEntry {
  id?: string;
  sourceType: string;
  sourceRef: string;
  title: string;
  date?: string;
  results: any; // Using any for brevity since results structure varies
}

const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },

  // Settings
  getSettings(): AppSettings {
    return this.get<AppSettings>('settings') || {
      defaultOutputs: ['notes', 'flashcards', 'quiz', 'summary'],
      flashcardCount: 10,
      quizCount: 7,
    };
  },

  setSettings(settings: AppSettings): void {
    this.set('settings', settings);
  },

  // Library
  getLibrary(): LibraryEntry[] {
    return this.get<LibraryEntry[]>('library') || [];
  },

  saveToLibrary(entry: LibraryEntry): LibraryEntry {
    const library = this.getLibrary();
    entry.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    entry.date = new Date().toISOString();
    library.unshift(entry);
    this.set('library', library);
    return entry;
  },

  deleteFromLibrary(id: string): void {
    const library = this.getLibrary().filter(e => e.id !== id);
    this.set('library', library);
  },

  getLibraryEntry(id: string): LibraryEntry | null {
    return this.getLibrary().find(e => e.id === id) || null;
  },
};

export default storage;
