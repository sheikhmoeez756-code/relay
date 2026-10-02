'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Users,
  FolderKanban,
  Ticket,
  TrendingUp,
  ArrowUpRight,
  Plus,
  CalendarDays,
  ChevronDown,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  PageHeading,
  Panel,
  Avatar,
  Badge,
  Empty,
  money,
  date,
  request,
  ExportButton,
  label,
} from './ui';
import { useToast } from './providers';
import { useWorkspace } from './shell';
import { can } from '@/lib/permissions';
import { RecordForm } from './record-form';
const chartStyle = { fontSize: 9, fill: '#94a09b' };
export function Dashboard({
  initialData,
  name,
  isDemo,
}: {
  initialData: any;
  name: string;
  isDemo: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [days, setDays] = useState('30');
  const [creating, setCreating] = useState(false);
  const [ticketTab, setTicketTab] = useState('All tickets');
  const toast = useToast();
  const { user } = useWorkspace();
  async function changeDays(value: string) {
    setDays(value);
    try {
      setData(await request('/api/dashboard?days=' + value));
    } catch (e) {
      toast((e as Error).message);
    }
  }
  const stats = [
    {
      title: 'Total clients',
      value: data.clients,
      icon: Users,
      caption: 'Clients in your workspace',
      href: '/clients',
    },
    {
      title: 'Active projects',
      value: data.activeProjects,
      icon: FolderKanban,
      caption: 'Projects currently in motion',
      href: '/projects',
    },
    {
      title: 'Open tickets',
      value: data.openTickets,
      icon: Ticket,
      caption: `${data.overdue} need your attention`,
      href: '/tickets',
    },
    {
      title: 'Sales won',
      value: money(data.sales),
      icon: TrendingUp,
      caption: `Over the last ${days} days`,
      href: '/leads',
    },
  ];
  const visibleTickets = data.tickets.filter(
    (t: any) =>
      ticketTab === 'All tickets' ||
      (ticketTab === 'In progress'
        ? t.status === 'IN_PROGRESS'
        : t.priority === 'URGENT' || t.priority === 'HIGH'),
  );
  return (
    <div className="page">
      <PageHeading
        title={`Welcome back, ${name.split(' ')[0]}`}
        description="Here’s what’s happening across your business today."
      >
        <ExportButton data={data.chart} filename="relay-overview" />
        <select
          className="btn"
          aria-label="Dashboard date range"
          value={days}
          onChange={(e) => changeDays(e.target.value)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        {can(user.role, 'tickets', 'create') && (
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={15} />
            Create ticket
          </button>
        )}
      </PageHeading>
      <div className="stats-grid">
        {stats
          .filter((s) => can(user.role, s.href.slice(1)))
          .map((s) => (
            <Link href={s.href} key={s.title} className="panel stat">
              <div className="between">
                <span className="stat-label">{s.title}</span>
                <span className="stat-icon">
                  <s.icon size={16} />
                </span>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-footer">
                <ArrowUpRight size={12} />
                <span>{s.caption}</span>
              </div>
            </Link>
          ))}
      </div>
      <div className="dashboard-grid">
        {can(user.role, 'leads') && (
          <Panel
            title="Business performance"
            action={<span className="badge">{isDemo ? 'Demo data' : 'Workspace data'}</span>}
          >
            <div className="panel-body">
              <div className="between">
                <div>
                  <div className="chart-summary">
                    <strong>{money(data.sales)}</strong>
                    <span className="small muted">won revenue</span>
                  </div>
                  <span className="tiny muted">Opportunity values over the selected period</span>
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-dot" style={{ background: '#5b8d76' }} />
                    Sales won
                  </span>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chart} margin={{ left: -23, right: 8, top: 15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#84ad96" stopOpacity={0.23} />
                        <stop offset="100%" stopColor="#84ad96" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={chartStyle}
                      dy={9}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={chartStyle}
                      tickFormatter={(v) => '$' + (v >= 1000 ? v / 1000 + 'k' : v)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--panel)',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(value: any) => money(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Sales won"
                      stroke="#5c8e77"
                      strokeWidth={2.5}
                      fill="url(#salesFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        )}
        {can(user.role, 'tickets') && (
          <Panel
            title="Ticket overview"
            action={
              <Link href="/tickets" className="text-link">
                View all <ArrowUpRight size={11} style={{ display: 'inline' }} />
              </Link>
            }
          >
            <div className="panel-body">
              <div className="between">
                <div className="chart-summary">
                  <strong>{data.openTickets + data.resolvedTickets}</strong>
                  <span className="small muted">tickets</span>
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-dot" style={{ background: '#56816b' }} />
                    Opened
                  </span>
                  <span>
                    <i className="legend-dot" style={{ background: '#d9e6db' }} />
                    Resolved
                  </span>
                </div>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.chart}
                    barGap={4}
                    margin={{ left: -30, right: 0, top: 15, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
                    <XAxis
                      dataKey="name"
                      tick={chartStyle}
                      axisLine={false}
                      tickLine={false}
                      dy={9}
                    />
                    <YAxis
                      tick={chartStyle}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--panel)',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                    />
                    <Bar
                      dataKey="opened"
                      name="Opened"
                      fill="#5d856f"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={15}
                    />
                    <Bar
                      dataKey="resolved"
                      name="Resolved"
                      fill="#d9e6db"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={15}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        )}
      </div>
      <div className="dashboard-grid">
        {can(user.role, 'tickets') && (
          <Panel
            title="Recent tickets"
            action={
              <Link href="/tickets" className="text-link">
                View all tickets{' '}
                <ArrowRight size={12} style={{ display: 'inline', marginLeft: 4 }} />
              </Link>
            }
          >
            <div className="tabs">
              {['All tickets', 'In progress', 'High priority'].map((t) => (
                <button
                  key={t}
                  className={`tab ${ticketTab === t ? 'active' : ''}`}
                  onClick={() => setTicketTab(t)}
                >
                  {t}
                  {t === 'All tickets' && (
                    <span className="nav-count" style={{ marginLeft: 7 }}>
                      {data.tickets.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTickets.map((t: any) => (
                    <tr key={t.id}>
                      <td>
                        <Link href={'/tickets/' + t.id}>
                          <span className="tiny muted">
                            TKT-{String(t.number).padStart(4, '0')}
                          </span>
                          <div style={{ fontWeight: 550, marginTop: 3 }}>{t.name}</div>
                        </Link>
                      </td>
                      <td>
                        <Badge value={t.priority} />
                      </td>
                      <td>
                        <Badge value={t.status} />
                      </td>
                      <td>
                        {t.assignee ? (
                          <div className="flex-row" style={{ gap: 6 }}>
                            <Avatar name={t.assignee.name} />
                            <span className="tiny">{t.assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleTickets.length && (
                <Empty title="All clear here" description="No tickets match this view." />
              )}
            </div>
            <div className="table-footer">
              <span>Showing {visibleTickets.length} recent tickets</span>
              <span>Updated from your workspace</span>
            </div>
          </Panel>
        )}
        {can(user.role, 'projects') && (
          <Panel
            title="Active projects"
            action={
              <Link href="/projects" className="text-link">
                View all <ArrowUpRight size={11} style={{ display: 'inline' }} />
              </Link>
            }
          >
            {data.projects.length ? (
              data.projects.map((p: any, i: number) => (
                <Link
                  className="project-row"
                  style={{ display: 'block' }}
                  key={p.id}
                  href={'/projects/' + p.id}
                >
                  <div className="flex-row">
                    <span
                      className="avatar square"
                      style={{ background: ['#edf0fa', '#fcf0e8', '#eaf2ef', '#f2eef8'][i % 4] }}
                    >
                      <FolderKanban size={15} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 11 }}>{p.name}</h3>
                      <div className="tiny muted" style={{ marginTop: 3 }}>
                        Due {date(p.dueDate)}
                      </div>
                    </div>
                    <ChevronDown
                      size={12}
                      style={{ transform: 'rotate(-90deg)', color: 'var(--muted)' }}
                    />
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-bar"
                      style={{
                        width: p.progress + '%',
                        background: ['#7ca58b', '#c6a678', '#8da4b5', '#a796b6'][i % 4],
                      }}
                    />
                  </div>
                  <div className="between" style={{ marginTop: 7 }}>
                    <span className="tiny muted">{label(p.status)}</span>
                    <span className="tiny muted">{p.progress}%</span>
                  </div>
                </Link>
              ))
            ) : (
              <Empty
                title="Room for your next project"
                description="Projects will appear here once created."
              />
            )}
          </Panel>
        )}
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Recent activity"
          action={<span className="tiny muted">Latest workspace updates</span>}
        >
          <div className="panel-body">
            {data.activity.length ? (
              data.activity.map((a: any) => (
                <div className="activity-item" key={a.id}>
                  <Avatar name={a.actor.name} />
                  <div style={{ flex: 1 }}>
                    <p>
                      <strong>{a.actor.name}</strong>{' '}
                      <span className="muted">
                        {a.action.toLowerCase().replaceAll('_', ' ')} ·{' '}
                        {a.metadata?.name || a.target}
                      </span>
                    </p>
                    <time>
                      {new Date(a.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <CheckCircle2 size={14} color="#84a48d" />
                </div>
              ))
            ) : (
              <Empty title="A fresh start" description="Workspace activity will appear here." />
            )}
          </div>
        </Panel>
        <Panel title="Upcoming deadlines" action={<CalendarDays size={16} color="var(--muted)" />}>
          <div className="panel-body">
            {data.deadlines.length ? (
              data.deadlines.map((d: any) => (
                <Link className="deadline-row" href={`/${d.entity}/${d.id}`} key={d.id}>
                  <span className="date-tile">
                    <span>
                      {new Date(d.dueDate).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    {new Date(d.dueDate).getDate()}
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 11 }}>{d.name}</h3>
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      {label(d.entity)} · {label(d.status)}
                    </div>
                  </div>
                  <Badge value={d.priority} />
                </Link>
              ))
            ) : (
              <Empty
                title="No upcoming deadlines"
                description="Add a due date to keep work on track."
              />
            )}
            <div
              className="between"
              style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 10 }}
            >
              <span className="tiny muted">
                <Clock size={12} style={{ display: 'inline', marginRight: 5 }} />
                Avg. ticket resolution
              </span>
              <strong className="small">{data.averageResolution}h</strong>
            </div>
          </div>
        </Panel>
      </div>
      <footer className="footer">
        <span>© {new Date().getFullYear()} Relay. A little more connected.</span>
        <span>
          {isDemo
            ? 'All figures are seeded demonstration data.'
            : 'Figures reflect records in your workspace.'}{' '}
          <Link href="/policies/privacy">Privacy</Link> · <Link href="/policies/terms">Terms</Link>
        </span>
      </footer>
      <RecordForm
        entity="tickets"
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => changeDays(days)}
      />
    </div>
  );
}
