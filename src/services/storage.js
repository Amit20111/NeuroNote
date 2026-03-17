// localStorage service — all keys prefixed with ff_

const PREFIX = 'ff_';

const storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },


  // Settings
  getSettings() {
    return this.get('settings') || {
      defaultOutputs: ['notes', 'flashcards', 'quiz', 'summary'],
      flashcardCount: 10,
      quizCount: 7,
    };
  },

  setSettings(settings) {
    this.set('settings', settings);
  },

  // Library
  getLibrary() {
    return this.get('library') || [];
  },

  saveToLibrary(entry) {
    const library = this.getLibrary();
    entry.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    entry.date = new Date().toISOString();
    library.unshift(entry);
    this.set('library', library);
    return entry;
  },

  deleteFromLibrary(id) {
    const library = this.getLibrary().filter(e => e.id !== id);
    this.set('library', library);
  },

  getLibraryEntry(id) {
    return this.getLibrary().find(e => e.id === id) || null;
  },
};

export default storage;
