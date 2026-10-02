'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Mail,
  ArrowUpRight,
  Bell,
  CheckCheck,
  Send,
  Users,
  ShieldCheck,
  Printer,
  TrendingUp,
  Clock,
  CheckCircle2,
  FolderKanban,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { can, roleLabels } from '@/lib/permissions';
import {
  PageHeading,
  Panel,
  Avatar,
  Badge,
  Empty,
  Modal,
  date,
  label,
  money,
  request,
  ExportButton,
  Skeleton,
} from './ui';
import { useWorkspace } from './shell';
import { useToast } from './providers';
export function Employees() {
  const { user, departments, refresh } = useWorkspace();
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [department, setDepartment] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const load = () =>
    request<any[]>('/api/collaboration?type=employees')
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request('/api/account', {
        action: 'invite',
        email,
        role,
        ...(department ? { departmentId: department } : {}),
      });
      toast('Invitation sent.');
      setInvite(false);
      setEmail('');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeEmployee(person: any, updates: any) {
    try {
      await request('/api/settings', {
        action: 'employee',
        id: person.id,
        active: person.active,
        role: person.role,
        departmentId: departments.find((d: any) => d.name === person.department?.name)?.id || null,
        ...updates,
      });
      toast('Employee updated.');
      load();
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  const admin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  const filtered = data.filter((p) =>
    (p.name + ' ' + p.email + ' ' + (p.department?.name || ''))
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHeading
        title="People make it happen."
        description="Meet the people behind your projects and keep your teams connected."
      >
        {admin && (
          <button className="btn primary" onClick={() => setInvite(true)}>
            <Plus size={15} />
            Invite team member
          </button>
        )}
      </PageHeading>
      <div className="toolbar panel" style={{ marginBottom: 23 }}>
        <div className="search-field">
          <Search />
          <input
            className="input"
            placeholder="Search team members…"
            aria-label="Search team members"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="small muted" style={{ marginLeft: 'auto' }}>
          {filtered.length} team members
        </span>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="directory-grid">
        {filtered.map((p) => (
          <article className="panel person-card" key={p.id}>
            <div className="between">
              <Avatar name={p.name} size="lg" />
              <Badge value={p.active ? 'Active' : 'Inactive'} />
            </div>
            <h3>{p.name}</h3>
            <div className="muted">{roleLabels[p.role as keyof typeof roleLabels]}</div>
            <div className="muted">{p.department?.name || 'No department'}</div>
            <a
              href={'mailto:' + p.email}
              className="text-link"
              style={{ display: 'block', fontSize: 11, marginTop: 15 }}
            >
              {p.email}
            </a>
            <footer>
              <span>
                <strong>{p._count.tasks}</strong> assigned tasks
              </span>
              <span>
                <strong>{p._count.tickets}</strong> tickets
              </span>
            </footer>
            {admin &&
              p.id !== user.id &&
              p.role !== 'SUPER_ADMIN' &&
              (user.role === 'SUPER_ADMIN' || p.role !== 'ADMIN') && (
                <div className="stack" style={{ gap: 8, marginTop: 16 }}>
                  <select
                    aria-label={`Role for ${p.name}`}
                    className="input"
                    value={p.role}
                    onChange={(e) => changeEmployee(p, { role: e.target.value })}
                  >
                    {Object.entries(roleLabels)
                      .filter(
                        ([k]) =>
                          k !== 'SUPER_ADMIN' && (user.role === 'SUPER_ADMIN' || k !== 'ADMIN'),
                      )
                      .map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                  </select>
                  <button className="btn" onClick={() => changeEmployee(p, { active: !p.active })}>
                    {p.active ? 'Deactivate account' : 'Activate account'}
                  </button>
                </div>
              )}
          </article>
        ))}
      </div>
      {!filtered.length && !error && (
        <Empty
          title="No team members found"
          description="Try a different search or invite your team."
        />
      )}
      <Modal
        open={invite}
        onOpenChange={setInvite}
        title="Great work starts with great people."
        description="Send a secure, single-use invitation to your workspace."
      >
        <form onSubmit={submit} className="stack">
          <div className="field">
            <label htmlFor="invite-email">Work email</label>
            <input
              id="invite-email"
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {Object.entries(roleLabels)
                .filter(
                  ([k]) => k !== 'SUPER_ADMIN' && (k !== 'ADMIN' || user.role === 'SUPER_ADMIN'),
                )
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="invite-dept">Department</label>
            <select
              id="invite-dept"
              className="input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">No department</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn primary" disabled={busy}>
            <Mail size={14} />
            {busy ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
export function Notifications() {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const toast = useToast();
  const load = () =>
    request<any[]>('/api/collaboration')
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    addEventListener('relay-update', load);
    return () => removeEventListener('relay-update', load);
  }, []);
  async function read(id?: string) {
    try {
      await request('/api/collaboration', { action: 'read', ...(id ? { id } : {}) });
      load();
      toast('Notifications marked as read.');
    } catch (e) {
      toast((e as Error).message);
    }
  }
  const items = data.filter((n) => filter === 'all' || !n.readAt);
  return (
    <div className="page">
      <PageHeading
        title="You’re in the loop."
        description="Assignments, updates, and the things that need your attention."
      >
        <Link href="/settings" className="btn">
          Preferences
        </Link>
        <button
          className="btn primary"
          onClick={() => read()}
          disabled={!data.some((n) => !n.readAt)}
        >
          <CheckCheck size={15} />
          Mark all as read
        </button>
      </PageHeading>
      <div className="panel">
        <div className="tabs">
          {['all', 'unread'].map((v) => (
            <button
              className={`tab ${filter === v ? 'active' : ''}`}
              key={v}
              onClick={() => setFilter(v)}
            >
              {label(v)}
            </button>
          ))}
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="panel-body">
          {items.length ? (
            items.map((n) => (
              <div
                key={n.id}
                className="activity-item"
                style={{ padding: '20px 0', opacity: n.readAt ? 0.7 : 1 }}
              >
                <span className="avatar square">
                  <Bell size={15} />
                </span>
                <div style={{ flex: 1 }}>
                  <h3 className="small">{n.title}</h3>
                  <p className="muted" style={{ margin: '4px 0' }}>
                    {n.body}
                  </p>
                  <time>{new Date(n.createdAt).toLocaleString()}</time>
                </div>
                <div className="flex-row">
                  {n.href && (
                    <Link className="text-link" href={n.href}>
                      View
                    </Link>
                  )}
                  {!n.readAt && (
                    <button
                      className="icon-btn"
                      aria-label={`Mark ${n.title} as read`}
                      onClick={() => read(n.id)}
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <Empty title="All caught up" description="New notifications will appear here." />
          )}
        </div>
      </div>
    </div>
  );
}
export function Audit() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    request<any[]>('/api/collaboration?type=audit')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const items = data.filter(
    (a) =>
      (a.actor.name + ' ' + a.action + ' ' + a.target + ' ' + a.targetId)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!action || a.action === action) &&
      (!from || new Date(a.createdAt) >= new Date(from)),
  );
  return (
    <div className="page">
      <PageHeading
        title="A clear record of every change."
        description="Read-only history of important actions in your workspace. Latest 500 events."
      >
        <ExportButton
          data={items.map((a) => ({
            actor: a.actor.name,
            action: a.action,
            target: a.target,
            targetId: a.targetId,
            timestamp: a.createdAt,
            metadata: a.metadata,
          }))}
          filename="relay-audit"
        />
      </PageHeading>
      <div className="panel">
        <div className="toolbar">
          <div className="search-field">
            <Search />
            <input
              className="input"
              aria-label="Search audit logs"
              placeholder="Search by actor, action, or record…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input"
            aria-label="Audit action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {[...new Set(data.map((a) => a.action))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            aria-label="Events from date"
            style={{ width: 160 }}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Record ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {items.slice((page - 1) * 20, page * 20).map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="flex-row">
                      <Avatar name={a.actor.name} />
                      {a.actor.name}
                    </div>
                  </td>
                  <td>
                    <Badge value={a.action} />
                  </td>
                  <td>{a.target}</td>
                  <td>
                    <code className="tiny">{a.targetId}</code>
                  </td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <Empty title="No matching events" description="Try adjusting your filters." />
        )}
        <div className="table-footer">
          <span>{items.length} events · immutable from this application</span>
          <div className="flex-row">
            <button className="btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="btn"
              disabled={page * 20 >= items.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export function Messages() {
  const { user, users } = useWorkspace();
  const toast = useToast();
  const [data, setData] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [body, setBody] = useState('');
  const [newChat, setNewChat] = useState(false);
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      request<any[]>('/api/collaboration?type=messages')
        .then((items) => {
          setData(items);
          setSelected((s) => s || items[0]?.id || '');
        })
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
    addEventListener('relay-message', load);
    return () => removeEventListener('relay-message', load);
  }, [load]);
  useEffect(() => {
    if (selected)
      request('/api/collaboration', { action: 'readConversation', conversationId: selected }).catch(
        () => {},
      );
  }, [selected]);
  const chat = data.find((c) => c.id === selected);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request('/api/collaboration', { action: 'message', conversationId: selected, body });
      setBody('');
      load();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const c = await request('/api/collaboration', { action: 'conversation', name, members });
      setSelected(c.id);
      setNewChat(false);
      setName('');
      setMembers([]);
      load();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <PageHeading
        title="Stay connected."
        description="Quick questions, shared context, and conversations that move work forward."
      >
        <button className="btn primary" onClick={() => setNewChat(true)}>
          <Plus size={15} />
          New conversation
        </button>
      </PageHeading>
      {error && <div className="alert">{error}</div>}
      <div className="panel messages-layout">
        <aside className="conversation-list">
          <div className="eyebrow" style={{ padding: 12 }}>
            Conversations
          </div>
          {data.map((c) => {
            const membership = c.members.find((m: any) => m.userId === user.id);
            const unread = c.messages.some(
              (m: any) =>
                m.authorId !== user.id &&
                (!membership?.lastReadAt ||
                  new Date(m.createdAt) > new Date(membership.lastReadAt)),
            );
            return (
              <button
                key={c.id}
                className={`conversation-button ${selected === c.id ? 'active' : ''}`}
                onClick={() => setSelected(c.id)}
              >
                <div className="between">
                  <strong className="small">{c.name}</strong>
                  {unread && <span className="badge">New</span>}
                </div>
                <p
                  className="tiny muted"
                  style={{
                    marginTop: 5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.messages[0]?.body || 'Start the conversation'}
                </p>
              </button>
            );
          })}
          {!data.length && (
            <Empty title="Say hello" description="Start a conversation with your team." />
          )}
        </aside>
        <section className="message-pane">
          {chat ? (
            <>
              <div className="panel-header" style={{ borderBottom: '1px solid var(--line)' }}>
                <div>
                  <h2>{chat.name}</h2>
                  <p className="tiny muted">
                    {chat.members.map((m: any) => m.user.name).join(', ')}
                  </p>
                </div>
                <span className="badge">Internal</span>
              </div>
              <div className="message-stream">
                {[...chat.messages].reverse().map((m: any) => (
                  <div
                    key={m.id}
                    className={`message-bubble ${m.authorId === user.id ? 'mine' : ''}`}
                  >
                    <div className="tiny muted" style={{ marginBottom: 5 }}>
                      {m.author.name} ·{' '}
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {m.body}
                  </div>
                ))}
              </div>
              <form className="message-compose" onSubmit={send}>
                <input
                  className="input"
                  aria-label="Message"
                  placeholder="Write a message…"
                  required
                  maxLength={5000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <button className="btn primary" disabled={busy}>
                  <Send size={15} />
                  <span className="sr-only">Send message</span>
                </button>
              </form>
            </>
          ) : (
            <Empty
              title="A space to connect"
              description="Choose a conversation or start a new one."
            />
          )}
        </section>
      </div>
      <Modal
        open={newChat}
        onOpenChange={setNewChat}
        title="Start a conversation"
        description="Only invited members can access this conversation."
      >
        <form className="stack" onSubmit={create}>
          <div className="field">
            <label htmlFor="conversation-name">Conversation name</label>
            <input
              id="conversation-name"
              required
              minLength={2}
              maxLength={80}
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <fieldset>
            <legend className="small" style={{ marginBottom: 10 }}>
              Team members
            </legend>
            {users
              .filter((u: any) => u.id !== user.id)
              .map((u: any) => (
                <label className="flex-row small" key={u.id} style={{ padding: '6px 0' }}>
                  <input
                    type="checkbox"
                    checked={members.includes(u.id)}
                    onChange={(e) =>
                      setMembers(
                        e.target.checked ? [...members, u.id] : members.filter((id) => id !== u.id),
                      )
                    }
                  />
                  {u.name}
                </label>
              ))}
          </fieldset>
          <button className="btn primary" disabled={busy || !members.length}>
            {busy ? 'Creating…' : 'Create conversation'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
export function Analytics() {
  const { user } = useWorkspace();
  const [data, setData] = useState<any>();
  const [days, setDays] = useState('30');
  const [error, setError] = useState('');
  useEffect(() => {
    request('/api/dashboard?days=' + days)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [days]);
  if (error)
    return (
      <div className="page">
        <div className="alert">{error}</div>
      </div>
    );
  if (!data) return <Skeleton />;
  return (
    <div className="page">
      <PageHeading
        title="See the bigger picture."
        description={`${user.company.isDemo ? 'Clearly labeled demo data. ' : ''}A measured view of your sales, service, and team performance.`}
      >
        <select
          className="btn"
          aria-label="Report period"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <ExportButton data={data.chart} filename="relay-performance" />
        <button className="btn" onClick={() => window.print()}>
          <Printer size={14} />
          Print report
        </button>
      </PageHeading>
      <div className="stats-grid">
        {[
          { name: 'Sales won', value: money(data.sales), icon: TrendingUp },
          { name: 'Tasks completed', value: data.productivity + '%', icon: CheckCircle2 },
          { name: 'Avg. resolution', value: data.averageResolution + 'h', icon: Clock },
          { name: 'Active projects', value: data.activeProjects, icon: FolderKanban },
        ].map((s) => (
          <div className="panel stat" key={s.name}>
            <div className="between">
              <span className="stat-label">{s.name}</span>
              <s.icon size={16} color="var(--green)" />
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel title="Pipeline distribution">
          <div className="panel-body">
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data.pipeline}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    tickFormatter={label}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
                  />
                  <Bar dataKey="count" fill="#789f87" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
        <Panel title="Service health">
          <div className="panel-body">
            {[
              { name: 'Open tickets', value: data.openTickets },
              { name: 'Overdue tickets', value: data.overdue },
              { name: 'Resolved in period', value: data.resolvedTickets },
              { name: 'Active clients', value: data.clients },
            ].map((s) => (
              <div
                className="between"
                key={s.name}
                style={{ padding: '21px 0', borderBottom: '1px solid var(--line)' }}
              >
                <span className="small muted">{s.name}</span>
                <strong style={{ fontSize: 22 }}>{s.value}</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div style={{ marginTop: 22 }}>
        <Panel title="Detailed performance">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period starting</th>
                  <th>Sales won</th>
                  <th>Tickets opened</th>
                  <th>Tickets resolved</th>
                </tr>
              </thead>
              <tbody>
                {data.chart.map((r: any) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{money(r.sales)}</td>
                    <td>{r.opened}</td>
                    <td>{r.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <p className="tiny muted" style={{ marginTop: 20 }}>
        Sales reflect opportunity values marked Won. Productivity is the share of accessible tasks
        currently resolved or closed. Resolution time is measured from creation to resolution.
      </p>
    </div>
  );
}
