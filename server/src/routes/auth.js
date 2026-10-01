import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown so timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const publicUser = (u) => ({ id: u.id, email: u.email });

function readCredentials(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  return { email, password };
}

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = readCredentials(req.body);
    const fields = {};
    if (!EMAIL_RE.test(email) || email.length > 254) fields.email = 'Enter a valid email address.';
    if (password.length < 8) fields.password = 'Use at least 8 characters.';
    else if (Buffer.byteLength(password) > 72) fields.password = 'Use 72 bytes or fewer.';
    if (Object.keys(fields).length) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields });
    }

    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      return res.status(409).json({ error: 'An account with this email already exists.', fields: { email: 'Already in use.' } });
    }

    const hash = await bcrypt.hash(password, 12);
    let info;
    try {
      info = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
    } catch (err) {
      if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      throw err;
    }
    const user = { id: Number(info.lastInsertRowid), email };
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = readCredentials(req.body);
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
    if (!row || !ok) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    res.json({ token: signToken(row), user: publicUser(row) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.userId);
  res.json({ user });
});

export default router;
