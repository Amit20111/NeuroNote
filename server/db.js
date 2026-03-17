// Fallback in-memory database if MongoDB is not available
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DB_FILE = path.join(__dirname, '..', 'local_db.json');

// Initialize local DB if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], library: [] }));
}

let isMongoConnected = false;

// We export a wrapper that mimics Mongoose model APIs but falls back to JSON
function getLocalDb() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { users: [], library: [] };
  }
}

function saveLocalDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

const UserProxy = {
  findOne: async (query) => {
    if (isMongoConnected) return mongoose.model('User').findOne(query);
    const db = getLocalDb();
    if (query.email) {
      return db.users.find(u => u.email === query.email) || null;
    }
    if (query._id) {
      return db.users.find(u => u._id === query._id) || null;
    }
    return null;
  },
  create: async (data) => {
    if (isMongoConnected) return mongoose.model('User').create(data);
    const db = getLocalDb();
    const newUser = { ...data, _id: generateId(), createdAt: new Date() };
    db.users.push(newUser);
    saveLocalDb(db);
    return newUser;
  }
};

const LibraryProxy = {
  find: (query) => {
    const chain = {
      sort: () => chain,
      lean: async () => {
        if (isMongoConnected) return mongoose.model('Library').find(query).sort({createdAt: -1}).lean();
        const db = getLocalDb();
        return db.library
          .filter(l => l.userId === query.userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    };
    return chain;
  },
  create: async (data) => {
    if (isMongoConnected) return mongoose.model('Library').create(data);
    const db = getLocalDb();
    const newEntry = { ...data, _id: generateId(), createdAt: new Date() };
    db.library.push(newEntry);
    saveLocalDb(db);
    return { ...newEntry, toObject: () => newEntry };
  }
};

module.exports = {
  setMongoConnected: (status) => { isMongoConnected = status; },
  User: UserProxy,
  Library: LibraryProxy
};
