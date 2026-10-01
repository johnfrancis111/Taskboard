import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { compareTasks } from '../dates.js';
import TaskCard from '../components/TaskCard.jsx';
import TaskModal from '../components/TaskModal.jsx';

const COLUMNS = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];
const STATUS_FILTERS = [{ id: 'all', label: 'All' }, ...COLUMNS];

export default function Board() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', q: '' });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [modal, setModal] = useState(null); // { task?, defaultStatus? }
  const [draggingId, setDraggingId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce the search box so we don't call the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q.trim()), 250);
    return () => clearTimeout(t);
  }, [filters.q]);

  // Load tasks from the API whenever a filter changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    api
      .listTasks({ status: filters.status, priority: filters.priority, q: debouncedQ })
      .then((list) => !cancelled && setTasks(list))
      .catch((err) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters.status, filters.priority, debouncedQ, reloadKey]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const filtersActive = filters.status !== 'all' || filters.priority !== 'all' || debouncedQ !== '';
  const visibleColumns = filters.status === 'all' ? COLUMNS : COLUMNS.filter((c) => c.id === filters.status);

  const byColumn = useMemo(() => {
    const groups = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) groups[t.status]?.push(t);
    for (const key of Object.keys(groups)) groups[key].sort(compareTasks);
    return groups;
  }, [tasks]);

  // Optimistic status change: update the UI now, roll back this one task if the server says no.
  async function moveTask(task, status) {
    if (task.status === status) return;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      const saved = await api.updateTask(task.id, { status });
      setTasks((ts) => ts.map((t) => (t.id === saved.id ? saved : t)));
    } catch (err) {
      setTasks((ts) => ts.map((t) => (t.id === task.id ? task : t)));
      setNotice(`Couldn’t move “${task.title}”. ${err.message}`);
    }
  }

  async function saveTask(payload) {
    if (modal.task) {
      const saved = await api.updateTask(modal.task.id, payload);
      setTasks((ts) => ts.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      const saved = await api.createTask(payload);
      setTasks((ts) => [saved, ...ts]);
    }
    setModal(null);
  }

  async function deleteTask() {
    await api.deleteTask(modal.task.id);
    setTasks((ts) => ts.filter((t) => t.id !== modal.task.id));
    setModal(null);
  }

  function onDrop(e, columnId) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    const task = tasks.find((t) => t.id === id);
    setOverColumn(null);
    setDraggingId(null);
    if (task) moveTask(task, columnId);
  }

  return (
    <div className="app">
      <header className="topbar">
        <p className="wordmark">Taskboard</p>
        <div className="topbar-user">
          <span className="user-email">{user.email}</span>
          <button className="btn" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="page">
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Show tasks by status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={filters.status === f.id ? 'is-active' : ''}
                aria-pressed={filters.status === f.id}
                onClick={() => setFilters((p) => ({ ...p, status: f.id }))}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            className="search"
            type="search"
            placeholder="Search tasks"
            aria-label="Search tasks"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
          />

          <select
            aria-label="Filter by priority"
            value={filters.priority}
            onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}
          >
            <option value="all">Any priority</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>

          <button className="btn btn-primary" onClick={() => setModal({ defaultStatus: 'todo' })}>
            New task
          </button>
        </div>

        <p className="notice" role="status" aria-live="polite">{notice}</p>

        {loadError ? (
          <div className="state">
            <p>{loadError}</p>
            <button className="btn" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
          </div>
        ) : (
          <div className={`columns cols-${visibleColumns.length}${loading ? ' is-loading' : ''}`}>
            {visibleColumns.map((col) => {
              const items = byColumn[col.id];
              return (
                <section
                  key={col.id}
                  className={`column column-${col.id}${overColumn === col.id ? ' is-over' : ''}`}
                  aria-label={col.label}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (overColumn !== col.id) setOverColumn(col.id);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setOverColumn(null);
                  }}
                  onDrop={(e) => onDrop(e, col.id)}
                >
                  <header className="column-head">
                    <h2>{col.label}</h2>
                    <span className="count" aria-label={`${items.length} tasks`}>{items.length}</span>
                    <button
                      className="add-btn"
                      aria-label={`Add task to ${col.label}`}
                      onClick={() => setModal({ defaultStatus: col.id })}
                    >
                      +
                    </button>
                  </header>

                  <div className="column-body">
                    {items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        dragging={draggingId === task.id}
                        onEdit={(t) => setModal({ task: t })}
                        onToggleDone={(t) => moveTask(t, t.status === 'done' ? 'todo' : 'done')}
                        onDragStart={setDraggingId}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverColumn(null);
                        }}
                      />
                    ))}

                    {!loading && items.length === 0 && (
                      <p className="empty">
                        {filtersActive
                          ? 'No tasks match these filters.'
                          : col.id === 'todo'
                          ? 'Nothing planned. Add a task to get started.'
                          : col.id === 'in_progress'
                          ? 'Drag a task here when you start it.'
                          : 'Finished tasks land here.'}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {modal && (
        <TaskModal
          task={modal.task}
          defaultStatus={modal.defaultStatus}
          onSave={saveTask}
          onDelete={deleteTask}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
