'use client';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  Save,
  ShieldCheck,
  Palette,
  Building2,
  Users,
  UserRound,
  Bell,
  Lock,
  ArrowUpRight,
  Check,
  ExternalLink,
  LifeBuoy,
  BookOpen,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { PageHeading, Panel, request, Modal, ExportButton, label, Empty } from './ui';
import { useWorkspace } from './shell';
import { useToast } from './providers';
import { can, roleLabels } from '@/lib/permissions';
export function Settings() {
  const { user, departments, users, refresh } = useWorkspace();
  const toast = useToast();
  const [tab, setTab] = useState('Profile');
  const [name, setName] = useState(user.name);
  const [theme, setTheme] = useState(user.preferences?.theme || 'system');
  const [emailNotifications, setEmailNotifications] = useState(
    user.preferences?.emailNotifications ?? true,
  );
  const [deadlineNotifications, setDeadlineNotifications] = useState(
    user.preferences?.deadlineNotifications ?? true,
  );
  const [company, setCompany] = useState(user.company.name);
  const [timezone, setTimezone] = useState(user.company.timezone || 'UTC');
  const [department, setDepartment] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDepartment, setTeamDepartment] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const admin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  const tabs = [
    'Profile',
    'Security',
    'Notifications',
    'Appearance',
    ...(admin ? ['Company', 'Departments', 'Teams', 'Permissions', 'Data export'] : []),
  ];
  const loadTeams = () =>
    request('/api/settings')
      .then((d) => setTeams(d.teams))
      .catch((e) => toast(e.message));
  useEffect(() => {
    loadTeams();
  }, []);
  async function save(data: any) {
    setBusy(true);
    try {
      await request('/api/settings', data);
      if (data.action === 'profile') {
        localStorage.setItem('relay-theme', theme);
        document.documentElement.classList.toggle(
          'dark',
          theme === 'dark' ||
            (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches),
        );
      }
      toast('Settings saved.');
      refresh();
      setDepartment('');
      if (data.action === 'team') {
        loadTeams();
        setTeamName('');
        setTeamMembers([]);
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request('/api/account', { action: 'password', currentPassword, password });
      await signOut({ callbackUrl: '/login' });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    setBusy(true);
    try {
      const entities = ['clients', 'leads', 'projects', 'tasks', 'tickets'].filter((e) =>
        can(user.role, e),
      );
      const output: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        company: user.company.name,
      };
      for (const entity of entities) {
        let page = 1;
        const items = [];
        let result;
        do {
          result = await request(`/api/records/${entity}?limit=100&page=${page++}`);
          items.push(...result.items);
        } while (page <= result.pages);
        output[entity] = items;
      }
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relay-workspace-export.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Operational data exported.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const profileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save({ action: 'profile', name, theme, emailNotifications, deadlineNotifications });
  };
  return (
    <div className="page">
      <PageHeading
        title="Make this space yours."
        description="Manage your account, workspace, and the way your team works."
      />
      {user.mustChangePassword && (
        <div className="alert" style={{ marginBottom: 20 }}>
          This account uses a development password. Change it before using real company data.
        </div>
      )}
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings categories">
          {tabs.map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
        <Panel title={tab}>
          <div className="panel-body">
            {['Profile', 'Notifications', 'Appearance'].includes(tab) && (
              <form className="stack" onSubmit={profileSubmit}>
                {tab === 'Profile' && (
                  <>
                    <div className="field">
                      <label htmlFor="profile-name">Full name</label>
                      <input
                        id="profile-name"
                        className="input"
                        minLength={2}
                        maxLength={120}
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="profile-email">Email address</label>
                      <input id="profile-email" className="input" value={user.email} readOnly />
                    </div>
                    <p className="tiny muted">
                      Your administrator manages your role and department. Email changes require
                      administrator assistance.
                    </p>
                  </>
                )}
                {tab === 'Notifications' && (
                  <>
                    <label className="between small">
                      <span>
                        <strong>Email notifications</strong>
                        <p className="muted">
                          Preference saved for configured email delivery workflows.
                        </p>
                      </span>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                      />
                    </label>
                    <label className="between small">
                      <span>
                        <strong>Deadline reminders</strong>
                        <p className="muted">Receive approaching and overdue work notifications.</p>
                      </span>
                      <input
                        type="checkbox"
                        checked={deadlineNotifications}
                        onChange={(e) => setDeadlineNotifications(e.target.checked)}
                      />
                    </label>
                  </>
                )}
                {tab === 'Appearance' && (
                  <div className="field">
                    <label htmlFor="theme">Color theme</label>
                    <select
                      id="theme"
                      className="input"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      <option value="system">Use system preference</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                )}
                <div>
                  <button className="btn primary" disabled={busy}>
                    <Save size={14} />
                    {busy ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
            {tab === 'Security' && (
              <form className="stack" onSubmit={changePassword}>
                <div className="field">
                  <label htmlFor="current-password">Current password</label>
                  <input
                    id="current-password"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={72}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span className="tiny muted">
                    At least 12 characters, including uppercase and lowercase letters and a number.
                    Updating your password signs out all sessions.
                  </span>
                </div>
                <div>
                  <button className="btn primary" disabled={busy}>
                    <Lock size={14} />
                    Update password
                  </button>
                </div>
                <div className="alert">
                  Two-factor authentication is not yet enabled. Provider integration is deferred; no
                  second-factor protection is currently applied.
                </div>
              </form>
            )}
            {tab === 'Company' && (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  save({ action: 'company', name: company, timezone });
                }}
              >
                <div className="field">
                  <label htmlFor="company-name">Company name</label>
                  <input
                    id="company-name"
                    required
                    minLength={2}
                    className="input"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    className="input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {[
                      'UTC',
                      'Asia/Karachi',
                      'Asia/Manila',
                      'Asia/Kolkata',
                      'America/New_York',
                      'America/Los_Angeles',
                      'Europe/London',
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <button className="btn primary" disabled={busy}>
                    Save company
                  </button>
                </div>
              </form>
            )}
            {tab === 'Departments' && (
              <div className="stack">
                {departments.map((d: any) => (
                  <div
                    key={d.id}
                    className="between"
                    style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}
                  >
                    <span className="small">{d.name}</span>
                    <span className="tiny muted">
                      {users.filter((u: any) => u.departmentId === d.id).length} members
                    </span>
                  </div>
                ))}
                <form
                  className="flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save({ action: 'department', name: department });
                  }}
                >
                  <input
                    aria-label="Department name"
                    className="input"
                    placeholder="New department name"
                    required
                    minLength={2}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                  <button className="btn primary" disabled={busy}>
                    <Plus size={14} />
                    Add department
                  </button>
                </form>
              </div>
            )}
            {tab === 'Teams' && (
              <div className="stack">
                {teams.map((t) => (
                  <div className="between" key={t.id}>
                    <span className="small">{t.name}</span>
                    <span className="tiny muted">{t.members.length} members</span>
                  </div>
                ))}
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save({
                      action: 'team',
                      name: teamName,
                      departmentId: teamDepartment,
                      members: teamMembers,
                    });
                  }}
                >
                  <div className="field">
                    <label htmlFor="team-name">Team name</label>
                    <input
                      id="team-name"
                      className="input"
                      minLength={2}
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                  </div>
                  <select
                    className="input"
                    aria-label="Team department"
                    required
                    value={teamDepartment}
                    onChange={(e) => {
                      setTeamDepartment(e.target.value);
                      setTeamMembers([]);
                    }}
                  >
                    <option value="">Select department</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {users
                    .filter((u: any) => u.departmentId === teamDepartment)
                    .map((u: any) => (
                      <label className="flex-row small" key={u.id}>
                        <input
                          type="checkbox"
                          checked={teamMembers.includes(u.id)}
                          onChange={(e) =>
                            setTeamMembers(
                              e.target.checked
                                ? [...teamMembers, u.id]
                                : teamMembers.filter((id) => id !== u.id),
                            )
                          }
                        />
                        {u.name}
                      </label>
                    ))}
                  <button className="btn primary" disabled={busy}>
                    Create team
                  </button>
                </form>
              </div>
            )}
            {tab === 'Permissions' && (
              <>
                <p className="small muted" style={{ marginBottom: 20 }}>
                  Server-enforced role permissions. Change employee roles in Team members. Custom
                  role editing is not available in this release.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Authorized areas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(roleLabels).map(([key, value]) => (
                        <tr key={key}>
                          <td>{value}</td>
                          <td style={{ whiteSpace: 'normal' }}>
                            {[
                              'clients',
                              'leads',
                              'projects',
                              'tasks',
                              'tickets',
                              'employees',
                              'analytics',
                              'audit',
                              'billing',
                            ]
                              .filter((r) => can(key as any, r))
                              .map(label)
                              .join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tab === 'Data export' && (
              <div className="stack">
                <p className="small muted">
                  Download your accessible active clients, leads, projects, tasks, and tickets as
                  JSON. Attachments, messages, credentials, and payment provider records are
                  excluded.
                </p>
                <div>
                  <button className="btn primary" onClick={exportData} disabled={busy}>
                    <ArrowUpRight size={14} />
                    {busy ? 'Preparing export…' : 'Export operational data'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
export function Billing() {
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  useEffect(() => {
    request('/api/settings')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="page">
      <PageHeading
        title="Room to grow."
        description="Your workspace subscription, plan options, and billing details."
      />
      {error && <div className="alert">{error}</div>}
      <div className="alert" style={{ marginBottom: 23 }}>
        Billing provider is not configured. Plans below are product concepts; checkout and
        subscription changes are unavailable. No payment is collected.
      </div>
      <Panel title="Your subscription">
        <div className="panel-body between">
          <div>
            <h3>{data?.subscription?.plan || 'No subscription'}</h3>
            <p className="small muted" style={{ marginTop: 5 }}>
              Status: {data?.subscription?.status || 'Not configured'} ·{' '}
              {data?.subscription?.providerId ? 'Connected provider' : 'Local subscription record'}
            </p>
          </div>
          <button className="btn" onClick={() => setSelected('Cancel subscription')}>
            Cancel subscription
          </button>
        </div>
      </Panel>
      <div className="directory-grid" style={{ marginTop: 23 }}>
        {[
          {
            name: 'Starter',
            description: 'A focused foundation for smaller teams.',
            features: ['Client and project management', 'Tickets and team tasks', 'Core reporting'],
          },
          {
            name: 'Growth',
            description: 'A connected workspace for growing operations.',
            features: [
              'Everything in Starter',
              'Sales pipeline',
              'Team conversations and audit history',
            ],
          },
          {
            name: 'Enterprise',
            description: 'Built around your organization’s needs.',
            features: [
              'Everything in Growth',
              'Deployment planning',
              'Security and procurement review',
            ],
          },
        ].map((p) => (
          <div className="panel person-card" key={p.name}>
            <span className="eyebrow">{p.name}</span>
            <h2 style={{ fontSize: 26, marginTop: 15 }}>Pricing pending</h2>
            <p className="small muted" style={{ margin: '10px 0 24px' }}>
              {p.description}
            </p>
            {p.features.map((f) => (
              <p className="flex-row small" key={f} style={{ marginBottom: 13 }}>
                <Check size={14} color="var(--green)" />
                {f}
              </p>
            ))}
            <button
              className="btn"
              style={{ width: '100%', marginTop: 18 }}
              onClick={() => setSelected(p.name)}
            >
              {p.name.toUpperCase() === data?.subscription?.plan
                ? 'Current plan details'
                : 'Review plan change'}
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 23 }}>
        <Panel title="Payment history">
          <Empty
            title="No provider payments"
            description="Payment history will become available when a billing provider is connected."
          />
        </Panel>
      </div>
      <Modal
        open={!!selected}
        onOpenChange={() => setSelected('')}
        title={selected === 'Cancel subscription' ? selected : `${selected} plan`}
        description="Provider configuration required"
      >
        <p className="small muted">
          This action cannot be completed because no payment provider is connected. Your
          subscription has not changed. Production pricing, terms, and test-mode Stripe credentials
          must be configured first.
        </p>
        <div className="dialog-footer">
          <button className="btn" onClick={() => setSelected('')}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
export function Onboarding() {
  const { user, refresh } = useWorkspace();
  const toast = useToast();
  const [name, setName] = useState(user.company.name);
  const [department, setDepartment] = useState('Operations');
  const [busy, setBusy] = useState(false);
  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <PageHeading
        title="Make room for great work."
        description="Set up your company, then invite your people and organize the work."
      />
      <Panel title="Your workspace foundation">
        <form
          className="panel-body stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await request('/api/settings', { action: 'onboarding', name, department });
              toast('Company setup saved. Invite your team from Team members.');
              refresh();
            } catch (e) {
              toast((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="onboard-company">Company name</label>
            <input
              id="onboard-company"
              className="input"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="onboard-department">Initial department</label>
            <input
              id="onboard-department"
              className="input"
              required
              minLength={2}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <button className="btn primary" disabled={busy}>
            Save workspace setup
          </button>
        </form>
      </Panel>
      <div className="stack" style={{ marginTop: 20 }}>
        {[
          {
            href: '/settings',
            title: 'Complete your profile',
            text: 'Your name, appearance, and notification preferences.',
          },
          {
            href: '/employees',
            title: 'Invite your team',
            text: 'Assign roles and departments with secure invitations.',
          },
          {
            href: '/tickets',
            title: 'Start your first workflow',
            text: 'Open → Assigned → In Progress → Waiting → Resolved → Closed.',
          },
        ].map((s) => (
          <Link href={s.href} className="panel between" style={{ padding: 20 }} key={s.href}>
            <div>
              <h3>{s.title}</h3>
              <p className="small muted" style={{ marginTop: 5 }}>
                {s.text}
              </p>
            </div>
            <ChevronRight size={18} />
          </Link>
        ))}
      </div>
    </div>
  );
}
export function Help() {
  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <PageHeading
        title="A little guidance, a lot of progress."
        description="Answers to help your team make the most of Relay."
      />
      <div className="stack">
        {[
          {
            title: 'How do I invite a teammate?',
            body: 'Administrators can open Team members → Invite team member. Choose a role and department. Invitations expire after one hour. Local development emails appear in Mailpit at localhost:8025 when the email container is running.',
          },
          {
            title: 'Who can see my work?',
            body: 'Every request is scoped to your company. Employees see their assigned tasks and tickets and projects they belong to. Managers and team leads are restricted to their department for operational work. Sales representatives can manage client relationships and leads.',
          },
          {
            title: 'How do I move a ticket or opportunity?',
            body: 'Use the board view and drag a card to a new column, or use the keyboard-accessible stage selector on each card. You can also change status on a record’s detail page.',
          },
          {
            title: 'What happens when I archive a record?',
            body: 'Archived records leave active lists and retain their history. Restoration is an administrator database operation in this release; there is no restore control in the interface.',
          },
          {
            title: 'Where can I get help?',
            body: 'Contact your company’s workspace administrator for account, access, and workflow support. Share the page URL and the visible error message. Do not send passwords or confidential attachments.',
          },
        ].map((item) => (
          <details className="panel" style={{ padding: 23 }} key={item.title}>
            <summary style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              {item.title}
            </summary>
            <p className="small muted" style={{ marginTop: 15, lineHeight: 1.9 }}>
              {item.body}
            </p>
          </details>
        ))}
        <Panel title="Privacy, security & policies">
          <div className="panel-body flex-row" style={{ flexWrap: 'wrap' }}>
            {[
              'privacy',
              'terms',
              'cookies',
              'cookie-preferences',
              'security',
              'disclosure',
              'accessibility',
              'dpa',
              'acceptable-use',
              'disclaimer',
            ].map((p) => (
              <Link key={p} className="btn" href={'/policies/' + p}>
                {label(p.replaceAll('-', ' '))}
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
