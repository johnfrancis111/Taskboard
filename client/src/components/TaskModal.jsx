import { useEffect, useRef, useState } from 'react';

export default function TaskModal({ task, defaultStatus = 'todo', onSave, onDelete, onClose }) {
  const editing = Boolean(task);
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? 'medium',
    due_date: task?.due_date ?? '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function run(action) {
    setErrors({});
    setFormError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.fields ? '' : err.message);
      setBusy(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrors({ title: 'Add a title.' });
      titleRef.current?.focus();
      return;
    }
    run(() => onSave({ ...form, due_date: form.due_date || null }));
  }

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">{editing ? 'Edit task' : 'New task'}</h2>

        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="t-title">Title</label>
            <input
              id="t-title"
              ref={titleRef}
              value={form.title}
              onChange={set('title')}
              maxLength={120}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>

          <div className="field">
            <label htmlFor="t-desc">Description</label>
            <textarea id="t-desc" rows={4} value={form.description} onChange={set('description')} maxLength={2000} />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="t-status">Status</label>
              <select id="t-status" value={form.status} onChange={set('status')}>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="t-priority">Priority</label>
              <select id="t-priority" value={form.priority} onChange={set('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="t-due">Due date</label>
              <input id="t-due" type="date" value={form.due_date} onChange={set('due_date')} />
              {errors.due_date && <p className="field-error">{errors.due_date}</p>}
            </div>
          </div>

          <p className="form-error" role="alert" aria-live="polite">{formError}</p>

          <div className="modal-actions">
            {editing &&
              (confirmDelete ? (
                <span className="confirm">
                  Delete this task?{' '}
                  <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(onDelete)}>
                    Yes, delete
                  </button>{' '}
                  <button type="button" className="btn" disabled={busy} onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className="btn btn-quiet-danger" onClick={() => setConfirmDelete(true)}>
                  Delete task
                </button>
              ))}
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
