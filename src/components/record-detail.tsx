'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Paperclip,
  Send,
  Plus,
  Clock,
  CheckSquare,
  Download,
} from 'lucide-react';
import { Entity } from '@/lib/validation';
import { can } from '@/lib/permissions';
import { RecordForm, statuses } from './record-form';
import { useWorkspace } from './shell';
import { useToast } from './providers';
import {
  PageHeading,
  Panel,
  Badge,
  Avatar,
  date,
  label,
  money,
  request,
  Empty,
  Skeleton,
} from './ui';
export function RecordDetail({ entity, id }: { entity: Entity; id: string }) {
  const { user, users, clients, projects, departments } = useWorkspace();
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(false);
  const [body, setBody] = useState('');
  const [subtask, setSubtask] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [note, setNote] = useState('');
  const [member, setMember] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const load = () =>
    request(`/api/records/${entity}/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [entity, id]);
  async function action(payload: any) {
    setBusy(true);
    try {
      await request(`/api/records/${entity}/${id}/actions`, payload);
      toast('Changes saved.');
      setBody('');
      setSubtask('');
      load();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/records/${entity}/${id}/actions`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Attachment uploaded.');
      load();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <div className="page">
        <div className="alert" role="alert">
          {error}
        </div>
        <Link href={'/' + entity} className="btn" style={{ marginTop: 20 }}>
          Back to {entity}
        </Link>
      </div>
    );
  if (!data) return <Skeleton />;
  const item = { projects: [], tickets: [], invoices: [], contacts: [], ...data.item };
  const editable = can(user.role, entity, 'update');
  const lookup = (items: any[], id: string) => items.find((i) => i.id === id)?.name || 'Unassigned';
  const fields: Record<string, string | number> = {
    Status: label(item.status || item.stage),
    ...(item.email ? { Email: item.email } : {}),
    ...(item.phone ? { Phone: item.phone } : {}),
    ...(item.industry ? { Industry: item.industry } : {}),
    ...(item.value != null ? { 'Expected value': money(item.value) } : {}),
    ...(item.assigneeId ? { Assignee: lookup(users, item.assigneeId) } : {}),
    ...(item.ownerId ? { Owner: lookup(users, item.ownerId) } : {}),
    ...(item.clientId ? { Client: lookup(clients, item.clientId) } : {}),
    ...(item.projectId ? { Project: lookup(projects, item.projectId) } : {}),
    ...(item.departmentId ? { Department: lookup(departments, item.departmentId) } : {}),
    ...(['projects', 'tasks', 'tickets'].includes(entity)
      ? { 'Due date': date(item.dueDate) }
      : {}),
    ...(item.followUpDate ? { 'Follow-up date': date(item.followUpDate) } : {}),
    Created: date(item.createdAt),
    Updated: date(item.updatedAt),
  };
  return (
    <div className="page">
      <Link className="text-link flex-row" style={{ marginBottom: 20, gap: 6 }} href={'/' + entity}>
        <ArrowLeft size={14} />
        Back to {entity}
      </Link>
      <PageHeading
        title={item.name}
        description={
          item.number
            ? `TKT-${String(item.number).padStart(4, '0')} · Ticket details`
            : `${label(entity.slice(0, -1))} details and activity`
        }
      >
        <Badge value={item.stage || item.status} />
        {editable && user.role !== 'EMPLOYEE' && (
          <button className="btn" onClick={() => setEdit(true)}>
            <Pencil size={14} />
            Edit details
          </button>
        )}
      </PageHeading>
      <div className="detail-grid">
        <div className="stack">
          <Panel title="Overview">
            <div className="panel-body">
              <p className="small muted" style={{ whiteSpace: 'pre-wrap', marginBottom: 25 }}>
                {item.description || item.notes || 'No notes have been added yet.'}
              </p>
              <dl className="detail-fields">
                {Object.entries(fields).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {editable && ['tasks', 'tickets'].includes(entity) && (
                <div className="field" style={{ marginTop: 25, maxWidth: 250 }}>
                  <label htmlFor="work-status">Update work status</label>
                  <select
                    id="work-status"
                    className="input"
                    value={item.status}
                    onChange={async (e) => {
                      try {
                        await request(
                          `/api/records/${entity}/${id}`,
                          { status: e.target.value },
                          'PATCH',
                        );
                        toast('Status updated.');
                        load();
                      } catch (e) {
                        toast((e as Error).message);
                      }
                    }}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {entity === 'projects' && (
                <div style={{ marginTop: 25 }}>
                  <div className="between small">
                    <span>Project progress</span>
                    <strong>{item.progress}%</strong>
                  </div>
                  <div className="progress-track" style={{ marginTop: 10 }}>
                    <div className="progress-bar" style={{ width: item.progress + '%' }} />
                  </div>
                </div>
              )}
            </div>
          </Panel>
          {entity === 'tickets' && (
            <Panel title="Conversation">
              <div className="panel-body">
                {item.comments.length ? (
                  item.comments.map((c: any) => (
                    <div className="activity-item" key={c.id}>
                      <Avatar name={c.author.name} />
                      <div>
                        <h3 className="small">
                          {c.author.name} <span className="tiny muted">{date(c.createdAt)}</span>
                        </h3>
                        <p style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{c.body}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty
                    title="Start the conversation"
                    description="Keep the context and decisions together."
                  />
                )}
                {editable && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      action({ action: 'comment', body });
                    }}
                    style={{ marginTop: 20 }}
                  >
                    <label className="sr-only" htmlFor="comment">
                      Your comment
                    </label>
                    <textarea
                      id="comment"
                      className="input"
                      required
                      maxLength={5000}
                      placeholder="Add an update or ask a question…"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                    <button className="btn primary" disabled={busy} style={{ marginTop: 12 }}>
                      <Send size={14} />
                      Post comment
                    </button>
                  </form>
                )}
              </div>
            </Panel>
          )}
          {entity === 'tasks' && (
            <>
              <Panel title="Checklist">
                <div className="panel-body">
                  {item.subtasks.map((s: any) => (
                    <label
                      key={s.id}
                      className="flex-row"
                      style={{ padding: '10px 0', fontSize: 12 }}
                    >
                      <input
                        type="checkbox"
                        checked={s.completed}
                        disabled={!editable || busy}
                        onChange={(e) =>
                          action({ action: 'check', id: s.id, completed: e.target.checked })
                        }
                      />
                      <span style={{ textDecoration: s.completed ? 'line-through' : undefined }}>
                        {s.name}
                      </span>
                    </label>
                  ))}
                  {!item.subtasks.length && (
                    <p className="small muted">Break this task into smaller steps.</p>
                  )}
                  {editable && (
                    <form
                      className="flex-row"
                      style={{ marginTop: 15 }}
                      onSubmit={(e) => {
                        e.preventDefault();
                        action({ action: 'subtask', name: subtask });
                      }}
                    >
                      <input
                        className="input"
                        aria-label="Checklist item"
                        required
                        minLength={2}
                        placeholder="Add a checklist item"
                        value={subtask}
                        onChange={(e) => setSubtask(e.target.value)}
                      />
                      <button className="btn" disabled={busy}>
                        <Plus size={14} />
                        Add
                      </button>
                    </form>
                  )}
                </div>
              </Panel>
              <Panel title="Time entries">
                <div className="panel-body">
                  {item.timeEntries.map((t: any) => (
                    <div key={t.id} className="between activity-item">
                      <div>
                        <strong className="small">{t.user.name}</strong>
                        <p className="muted">
                          {t.note || 'Work session'} · {date(t.createdAt)}
                        </p>
                      </div>
                      <span className="badge">{t.minutes} min</span>
                    </div>
                  ))}
                  <p className="small" style={{ margin: '12px 0' }}>
                    Total tracked:{' '}
                    <strong>
                      {item.timeEntries.reduce((sum: number, t: any) => sum + t.minutes, 0)} minutes
                    </strong>
                  </p>
                  {editable && (
                    <form
                      className="form-grid"
                      onSubmit={(e) => {
                        e.preventDefault();
                        action({ action: 'time', minutes: Number(minutes), note });
                      }}
                    >
                      <div className="field">
                        <label htmlFor="minutes">Minutes</label>
                        <input
                          id="minutes"
                          className="input"
                          type="number"
                          min={1}
                          max={1440}
                          required
                          value={minutes}
                          onChange={(e) => setMinutes(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="time-note">Work description</label>
                        <input
                          id="time-note"
                          className="input"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={500}
                        />
                      </div>
                      <button className="btn" disabled={busy}>
                        <Clock size={14} />
                        Log time
                      </button>
                    </form>
                  )}
                </div>
              </Panel>
            </>
          )}
          {entity === 'projects' && (
            <>
              <Panel title="Project team">
                <div className="panel-body">
                  {item.members.map((m: any) => (
                    <div className="flex-row" key={m.userId} style={{ marginBottom: 12 }}>
                      <Avatar name={m.user.name} />
                      <span className="small">{m.user.name}</span>
                    </div>
                  ))}
                  {editable && (
                    <form
                      className="flex-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        action({ action: 'member', userId: member });
                      }}
                    >
                      <select
                        className="input"
                        aria-label="Add project member"
                        required
                        value={member}
                        onChange={(e) => setMember(e.target.value)}
                      >
                        <option value="">Select a team member</option>
                        {users.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <button className="btn" disabled={busy}>
                        Add member
                      </button>
                    </form>
                  )}
                </div>
              </Panel>
              <Panel title="Project tasks">
                <div className="panel-body">
                  {item.tasks.length ? (
                    item.tasks.map((t: any) => (
                      <Link href={'/tasks/' + t.id} className="between activity-item" key={t.id}>
                        <span className="small">{t.name}</span>
                        <Badge value={t.status} />
                      </Link>
                    ))
                  ) : (
                    <Empty
                      title="No tasks yet"
                      description="Create tasks and associate them with this project."
                    />
                  )}
                </div>
              </Panel>
            </>
          )}
          {entity === 'clients' &&
            ['projects', 'tickets', 'invoices', 'contacts'].map((section) => (
              <Panel key={section} title={label(section)}>
                <div className="panel-body">
                  {item[section].length ? (
                    item[section].map((r: any) => (
                      <div key={r.id} className="between activity-item">
                        {['projects', 'tickets'].includes(section) ? (
                          <Link className="text-link" href={`/${section}/${r.id}`}>
                            {r.name}
                          </Link>
                        ) : (
                          <span className="small">
                            {r.name || r.number} {r.email || ''}
                          </span>
                        )}
                        {r.status && <Badge value={r.status} />} {r.amount && money(r.amount)}
                      </div>
                    ))
                  ) : (
                    <p className="small muted">No associated {section}.</p>
                  )}
                </div>
              </Panel>
            ))}
          {item.attachments && (
            <Panel title="Files & attachments">
              <div className="panel-body">
                {item.attachments.map((a: any) => (
                  <a key={a.id} className="between activity-item" href={'/api/attachments/' + a.id}>
                    <span className="small">
                      <Paperclip size={14} style={{ display: 'inline', marginRight: 7 }} />
                      {a.filename}
                    </span>
                    <span className="tiny muted">
                      {Math.ceil(a.size / 1024)} KB{' '}
                      <Download size={12} style={{ display: 'inline' }} />
                    </span>
                  </a>
                ))}
                {!item.attachments.length && <p className="small muted">No files attached.</p>}
                {editable && (
                  <div className="field" style={{ marginTop: 18 }}>
                    <label htmlFor="attachment">Upload PNG, JPEG or PDF · up to 5 MB</label>
                    <input
                      id="attachment"
                      className="input"
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) upload(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
        <Panel title="Activity timeline">
          <div className="panel-body">
            {data.activity.map((a: any) => (
              <div className="activity-item" key={a.id}>
                <Avatar name={a.actor.name} />
                <div>
                  <p>
                    <strong>{a.actor.name}</strong>
                  </p>
                  <p className="muted">{label(a.action)}</p>
                  <time>{new Date(a.createdAt).toLocaleString()}</time>
                </div>
              </div>
            ))}
            {!data.activity.length && (
              <Empty title="No activity yet" description="Changes will be recorded here." />
            )}
          </div>
        </Panel>
      </div>
      <RecordForm entity={entity} open={edit} onOpenChange={setEdit} onSaved={load} record={item} />
    </div>
  );
}
