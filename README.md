# Taskboard

A full-stack personal task manager. Each user has a private board; nobody can read or change anyone else's tasks.

**Stack:** React 18 + Vite, Node.js + Express, SQLite (better-sqlite3), JWT auth, bcrypt password hashing. All JavaScript.

## Run it

Requires Node 18+ (20 or 22 recommended).

```bash
npm run install:all          # installs root, server and client dependencies
cp server/.env.example server/.env
# edit server/.env and set JWT_SECRET to a long random string
npm run dev                  # API on :4000, web app on :5173
```

Open http://localhost:5173, create an account, and add tasks.

### Production-style run

```bash
npm run build                # builds client/dist
NODE_ENV=production JWT_SECRET=... npm start
```

Express serves the built app and the API from one origin on port 4000.

## How it works

```
click "Mark done" -> React (optimistic UI) -> PUT /api/tasks/:id + Bearer token
  -> requireAuth verifies the JWT, sets req.userId
  -> validate() checks the payload
  -> UPDATE ... WHERE id = ? AND user_id = ?
  -> JSON response -> UI reconciles (or rolls back on error)
```

### Data model

| users          | tasks                                              |
| -------------- | -------------------------------------------------- |
| id (PK)        | id (PK)                                            |
| email (unique) | user_id (FK -> users.id, ON DELETE CASCADE)        |
| password_hash  | title, description                                 |
| created_at     | status: todo / in_progress / done                  |
|                | priority: low / medium / high                      |
|                | due_date (YYYY-MM-DD, nullable)                    |
|                | created_at, updated_at                             |

### API

| Method | Route                | Notes                                            |
| ------ | -------------------- | ------------------------------------------------ |
| POST   | /api/auth/signup     | `{ email, password }` -> `{ token, user }`       |
| POST   | /api/auth/login      | `{ email, password }` -> `{ token, user }`       |
| GET    | /api/auth/me         | current user                                     |
| GET    | /api/tasks           | optional `?status=&priority=&q=`                 |
| POST   | /api/tasks           | create                                           |
| GET    | /api/tasks/:id       | one task                                         |
| PUT    | /api/tasks/:id       | partial update: send only the fields that change |
| DELETE | /api/tasks/:id       | 204 on success                                   |

Errors are `{ "error": "message", "fields": { "title": "message" } }`.

### Ownership

The user ID comes only from the verified token. Every task query includes `AND user_id = ?`, so another user's task returns **404**, exactly like a task that doesn't exist. The client never sends a user ID.

Quick check once running: create two accounts, note a task id from account A, then `GET /api/tasks/<id>` with account B's token. You'll get 404.

## Security notes

- Passwords hashed with bcrypt (cost 12); login timing is equalised for unknown emails.
- Helmet headers, CORS limited to `CLIENT_ORIGIN`, 10 KB body limit, rate limiting on `/api/auth`.
- All SQL uses bound parameters.
- The JWT is kept in `localStorage` for simplicity. For a hardened deployment, move it to an httpOnly, SameSite cookie and add CSRF protection.

## Project layout

```
server/src  index.js, db.js, middleware/auth.js, routes/auth.js, routes/tasks.js
client/src  App.jsx, AuthContext.jsx, api.js, pages/{AuthPage,Board}.jsx,
            components/{TaskCard,TaskModal}.jsx, styles.css
```

## Ideas for next steps

Manual ordering inside columns, touch-friendly drag (e.g. dnd-kit), refresh tokens, email verification, automated API tests (supertest), Docker setup.
