const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
require('./models/User');
require('./models/Library');

// Select one backend before accepting requests. Local storage supports one server process.
function createDatabase(file = path.join(__dirname, '..', 'local_db.json')) {
  let isMongoConnected = false;
  function read() {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ users: [], library: [] }), { flag: 'wx', mode: 0o600 });
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || !Array.isArray(data.users) || !Array.isArray(data.library)) throw new Error('Invalid local database format. Restore a valid backup.');
    return data;
  }
  function save(data) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      fs.copyFileSync(file, `${file}.bak`);
      const fd = fs.openSync(temporary, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify(data, null, 2));
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      fs.renameSync(temporary, file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  return {
    setMongoConnected(status) { isMongoConnected = status; },
    User: {
      async findOne(query) {
        if (isMongoConnected) return mongoose.model('User').findOne(query);
        return read().users.find(user => Object.entries(query).every(([key, value]) => user[key] === value)) || null;
      },
      async create(data) {
        if (isMongoConnected) return mongoose.model('User').create(data);
        const db = read();
        if (db.users.some(user => user.email === data.email)) {
          const error = new Error('User already exists');
          error.code = 11000;
          throw error;
        }
        const user = { ...data, _id: randomUUID(), createdAt: new Date().toISOString() };
        db.users.push(user);
        save(db);
        return user;
      }
    },
    Library: {
      find(query) {
        const chain = {
          sort: () => chain,
          async lean() {
            if (isMongoConnected) return mongoose.model('Library').find(query).sort({ createdAt: -1 }).lean();
            return read().library.filter(entry => entry.userId === query.userId)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
        };
        return chain;
      },
      async create(data) {
        if (isMongoConnected) return mongoose.model('Library').create(data);
        const db = read();
        const entry = { ...data, _id: randomUUID(), createdAt: new Date().toISOString() };
        db.library.push(entry);
        save(db);
        return { ...entry, toObject: () => entry };
      },
      async deleteOne(query) {
        if (isMongoConnected) {
          if (!mongoose.isValidObjectId(query._id)) return { deletedCount: 0 };
          return mongoose.model('Library').deleteOne(query);
        }
        const db = read();
        const index = db.library.findIndex(entry => entry._id === query._id && entry.userId === query.userId);
        if (index < 0) return { deletedCount: 0 };
        db.library.splice(index, 1);
        save(db);
        return { deletedCount: 1 };
      }
    }
  };
}
module.exports = { ...createDatabase(), createDatabase };
