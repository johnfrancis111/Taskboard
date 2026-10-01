import jwt from 'jsonwebtoken';
import db from '../db.js';

const isProd = process.env.NODE_ENV === 'production';
const secret = process.env.JWT_SECRET || (isProd ? null : 'dev-only-secret-change-me');

if (!secret) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}
if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET not set - using an insecure development secret.');
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, secret, { expiresIn: '7d' });
}

const findUser = db.prepare('SELECT id FROM users WHERE id = ?');

/**
 * Reads the Bearer token and sets req.userId.
 * Every task query downstream filters by this value - never by an id the client sends.
 */
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }
  try {
    const payload = jwt.verify(token, secret);
    const user = findUser.get(Number(payload.sub));
    if (!user) throw new Error('unknown user');
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  }
}
