import { formatDue, todayString } from '../dates.js';

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };

export default function TaskCard({ task, dragging, onEdit, onToggleDone, onDragStart, onDragEnd }) {
  const done = task.status === 'done';
  const overdue = Boolean(task.due_date) && !done && task.due_date < todayString();

  return (
    <article
      className={`card${dragging ? ' is-dragging' : ''}${done ? ' is-done' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
    >
      <h3 className="card-title">
        <button type="button" className="card-open" onClick={() => onEdit(task)}>
          {task.title}
        </button>
      </h3>

      {task.description && <p className="card-desc">{task.description}</p>}

      <div className="card-meta">
        <span className={`priority priority-${task.priority}`}>{PRIORITY_LABEL[task.priority]} priority</span>
        {task.due_date && (
          <span className={`due${overdue ? ' is-overdue' : ''}`}>
            {overdue ? 'Overdue, ' : 'Due '}
            {formatDue(task.due_date)}
          </span>
        )}
      </div>

      <div className="card-actions">
        <button type="button" className="link-btn" onClick={() => onToggleDone(task)}>
          {done ? 'Reopen' : 'Mark done'}
        </button>
        <button type="button" className="link-btn" onClick={() => onEdit(task)}>
          Edit
        </button>
      </div>
    </article>
  );
}
