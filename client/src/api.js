const TOKEN_KEY = 'taskboard.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || null;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // An expired or revoked token while signed in: drop the session.
    if (res.status === 401 && token) {
      tokenStore.clear();
      onUnauthorized();
    }
    throw new ApiError(data?.error || 'Something went wrong. Try again.', res.status, data?.fields);
  }
  return data;
}

export const api = {
  signup: (email, password) => request('/auth/signup', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),

  listTasks: ({ status, priority, q } = {}) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (priority && priority !== 'all') params.set('priority', priority);
    if (q) params.set('q', q);
    const qs = params.toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`).then((d) => d.tasks);
  },
  createTask: (payload) => request('/tasks', { method: 'POST', body: payload }).then((d) => d.task),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PUT', body: payload }).then((d) => d.task),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};
