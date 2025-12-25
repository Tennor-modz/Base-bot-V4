const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

let db;

function initDatabase() {
  const dbFolder = path.join(__dirname, "database");
  if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder);

  const dbPath = path.join(dbFolder, "trashbot.db");
  db = new Database(dbPath);

  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT,
      senderId TEXT,
      body TEXT,
      timestamp INTEGER
    )
  `).run();

  return db;
}

function setSetting(key, value) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `);
  stmt.run(key, JSON.stringify(value));
}

function getSetting(key, defaultValue = null) {
  const row = db.prepare("SELECT value FROM settings WHERE key=?").get(key);
  return row ? JSON.parse(row.value) : defaultValue;
}

// ================== Cleanup old messages ==================
function cleanupOldMessages(hours = 24) {
  if (!db) return 0;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const stmt = db.prepare("DELETE FROM messages WHERE timestamp < ?");
  const info = stmt.run(cutoff);
  return info.changes || 0; 
}

module.exports = {
  initDatabase,
  setSetting,
  getSetting,
  cleanupOldMessages,
  db
};