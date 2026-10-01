import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

const router = Router();
router.use(requireAuth); // every route below is protected

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function isRealDate(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Validates a task payload. partial=true is used for updates. */
function validate(body, { partial }) {
  const fields = {};
  const data = {};

  if (!partial || 'title' in body) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) fields.title = 'Add a title.';
    else if (title.length > 120) fields.title = 'Keep the title to 120 characters or fewer.';
    else data.title = title;
  }
  if ('description' in body) {
    const d = body.description ?? '';
    if (typeof d !== 'string' || d.length > 2000) {
      fields.description = 'Keep the description to 2000 characters or fewer.';
    } else data.description = d.trim();
  }
  if ('status' in body) {
    if (!STATUSES.includes(body.status)) fields.status = 'Choose to do, in progress or done.';
    else data.status = body.status;
  }
  if ('priority' in body) {
    if (!PRIORITIES.includes(body.priority)) fields.priority = 'Choose low, medium or high.';
    else data.priority = body.priority;
  }
  if ('due_date' in body) {
    const v = body.due_date;
    if (v === null || v === '') data.due_date = null;
    else if (typeof v === 'string' && isRealDate(v)) data.due_date = v;
    else fields.due_date = 'Enter a real date.';
  }
  return { fields, data };
}

const badRequest = (res, fields) =>
  res.status(400).json({ error: 'Please fix the highlighted fields.', fields });

// Ownership lives in the WHERE clause: a task that belongs to someone else is simply "not found".
const getOwned = (id, userId) =>
  db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);

const parseId = (raw) => (/^\d+$/.test(raw) ? Number(raw) : null);
const notFound = (res) => res.status(404).json({ error: 'Task not found.' });

// GET /api/tasks?status=&priority=&q=
router.get('/', (req, res) => {
  const { status, priority, q } = req.query;
  const where = ['user_id = ?'];
  const params = [req.userId];

  if (status !== undefined) {
    if (!STATUSES.includes(status)) return badRequest(res, { status: 'Unknown status.' });
    where.push('status = ?');
    params.push(status);
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) return badRequest(res, { priority: 'Unknown priority.' });
    where.push('priority = ?');
    params.push(priority);
  }
  if (typeof q === 'string' && q.trim()) {
    const like = `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`;
    where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }

  const rows = db
    .prepare(
      `SELECT * FROM tasks WHERE ${where.join(' AND ')}
       ORDER BY due_date IS NULL, due_date ASC, created_at DESC, id DESC`
    )
    .all(...params);
  res.json({ tasks: rows });
});

router.post('/', (req, res) => {
  if (!isObject(req.body)) return badRequest(res, { title: 'Add a title.' });
  const { fields, data } = validate(req.body, { partial: false });
  if (Object.keys(fields).length) return badRequest(res, fields);

  const info = db
    .prepare(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.userId,
      data.title,
      data.description ?? '',
      data.status ?? 'todo',
      data.priority ?? 'medium',
      data.due_date ?? null
    );
  res.status(201).json({ task: getOwned(info.lastInsertRowid, req.userId) });
});

router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const task = id && getOwned(id, req.userId);
  if (!task) return notFound(res);
  res.json({ task });
});

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const existing = id && getOwned(id, req.userId);
  if (!existing) return notFound(res);
  if (!isObject(req.body)) return badRequest(res, {});

  const { fields, data } = validate(req.body, { partial: true });
  if (Object.keys(fields).length) return badRequest(res, fields);

  const next = { ...existing, ...data };
  db.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, priority = ?, due_date = ?,
         updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(next.title, next.description, next.status, next.priority, next.due_date, id, req.userId);

  res.json({ task: getOwned(id, req.userId) });
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const result = id
    ? db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, req.userId)
    : { changes: 0 };
  if (!result.changes) return notFound(res);
  res.status(204).end();
});

export default router;
