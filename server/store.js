import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function createStore(directory) {
  if (directory !== ':memory:') mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(directory === ':memory:' ? directory : join(directory, 'medicao.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, subject TEXT NOT NULL, email TEXT NOT NULL,
      name TEXT NOT NULL, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges (token TEXT PRIMARY KEY, nonce TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS responses (
      subject TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, email TEXT NOT NULL,
      name TEXT NOT NULL, company TEXT NOT NULL, version TEXT NOT NULL,
      answers TEXT NOT NULL, consent_at TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  return {
    db,
    prune() {
      db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
      db.prepare('DELETE FROM challenges WHERE expires < ?').run(Date.now());
    },
    session(token) { return db.prepare('SELECT * FROM sessions WHERE token = ? AND expires > ?').get(token, Date.now()); },
    response(subject) { return db.prepare('SELECT * FROM responses WHERE subject = ?').get(subject); },
    responses() { return db.prepare('SELECT * FROM responses ORDER BY created_at DESC').all(); },
    close() { db.close(); }
  };
}
