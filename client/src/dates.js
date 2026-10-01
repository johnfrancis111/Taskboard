const pad = (n) => String(n).padStart(2, '0');

/** Today as YYYY-MM-DD in the user's local time zone. */
export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDue(due) {
  const d = new Date(`${due}T00:00:00`);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Same ordering the API uses: due date first (none last), then newest. */
export function compareTasks(a, b) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  return b.id - a.id;
}
