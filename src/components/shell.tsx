'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, createContext, useContext } from 'react';
import { signOut } from 'next-auth/react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  Users,
  Target,
  FolderKanban,
  Ticket,
  CheckSquare,
  UserRound,
  ChartNoAxesCombined,
  MessagesSquare,
  Bell,
  ShieldCheck,
  Settings,
  CreditCard,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  Command,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  ArrowUpRight,
  Layers,
  Plus,
} from 'lucide-react';
import { can, roleLabels } from '@/lib/permissions';
import { Avatar, Modal, request, Empty } from './ui';
import { useToast } from './providers';
export const WorkspaceContext = createContext<any>(null);
export const useWorkspace = () => useContext(WorkspaceContext);
export const navigation = [
  { path: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: 'clients', label: 'Clients', icon: Users },
  { path: 'leads', label: 'Sales pipeline', icon: Target },
  { path: 'projects', label: 'Projects', icon: FolderKanban },
  { path: 'tickets', label: 'Tickets', icon: Ticket },
  { path: 'tasks', label: 'Tasks', icon: CheckSquare },
  { path: 'employees', label: 'Team members', icon: UserRound },
  { path: 'analytics', label: 'Reports & analytics', icon: ChartNoAxesCombined },
  { path: 'messages', label: 'Messages', icon: MessagesSquare },
  { path: 'notifications', label: 'Notifications', icon: Bell },
  { path: 'audit', label: 'Audit logs', icon: ShieldCheck },
  { path: 'settings', label: 'Settings', icon: Settings },
  { path: 'billing', label: 'Billing', icon: CreditCard },
];
export function Shell({ user, children }: { user: any; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [workspace, setWorkspace] = useState<any>({
    user,
    users: [],
    clients: [],
    projects: [],
    departments: [],
  });
  const [unread, setUnread] = useState(0);
  const [dark, setDark] = useState(false);
  const toast = useToast();
  const page = navigation.find((n) => pathname.startsWith('/' + n.path));
  const refresh = () =>
    request('/api/workspace')
      .then(setWorkspace)
      .catch((e) => toast(e.message));
  useEffect(() => {
    refresh();
    request<any[]>('/api/collaboration')
      .then((n) => setUnread(n.filter((x) => !x.readAt).length))
      .catch(() => {});
    setDark(document.documentElement.classList.contains('dark'));
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('notification', () => {
      request<any[]>('/api/collaboration').then((n) =>
        setUnread(n.filter((x) => !x.readAt).length),
      );
      window.dispatchEvent(new Event('relay-update'));
      toast('You have a new workspace notification.');
    });
    socket.on('message', () => window.dispatchEvent(new Event('relay-message')));
    return () => {
      socket.disconnect();
    };
  }, []);
  useEffect(() => setMobile(false), [pathname]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (e.key === 'Escape') setMobile(false);
    };
    addEventListener('keydown', handler);
    return () => removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const entities = ['clients', 'leads', 'projects', 'tasks', 'tickets'].filter((e) =>
          can(user.role, e),
        );
        const responses = await Promise.all(
          entities.map(async (entity) => ({
            entity,
            ...(await request(`/api/records/${entity}?q=${encodeURIComponent(term)}&limit=5`)),
          })),
        );
        if (!cancelled)
          setResults(
            responses.flatMap((r) => r.items.map((item: any) => ({ ...item, entity: r.entity }))),
          );
      } catch (e) {
        toast((e as Error).message);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);
  function toggleTheme() {
    const value = !dark;
    setDark(value);
    document.documentElement.classList.toggle('dark', value);
    localStorage.setItem('relay-theme', value ? 'dark' : 'light');
  }
  return (
    <WorkspaceContext.Provider value={{ ...workspace, refresh }}>
      <div
        className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${mobile ? 'mobile-open' : ''}`}
      >
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
        <aside className="sidebar" aria-label="Main navigation">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">
              <Layers size={22} />
            </span>
            <span className="hide-collapsed">
              relay<sup>®</sup>
            </span>
          </Link>
          <div className="workspace-switch">
            <span className="avatar">{user.company.name.slice(0, 1)}</span>
            <div className="hide-collapsed" style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.company.name}
              </div>
              <div className="tiny muted">Operations workspace</div>
            </div>
            <ChevronDown size={12} />
          </div>
          <div className="nav-label">Workspace</div>
          <nav>
            {navigation
              .filter((n) => can(user.role, n.path))
              .map((n, i) => (
                <div key={n.path}>
                  {n.path === 'settings' && (
                    <div className="nav-label secondary">Administration</div>
                  )}
                  <Link
                    href={'/' + n.path}
                    title={collapsed ? n.label : undefined}
                    className={`nav-item ${pathname.startsWith('/' + n.path) ? 'active' : ''}`}
                    aria-current={pathname.startsWith('/' + n.path) ? 'page' : undefined}
                  >
                    <n.icon />
                    <span className="hide-collapsed">{n.label}</span>
                    {n.path === 'notifications' && unread > 0 && (
                      <span className="nav-count hide-collapsed">{unread}</span>
                    )}
                  </Link>
                </div>
              ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="help-card">
              <HelpCircle size={17} color="var(--green)" />
              <h3 style={{ fontSize: 11, marginTop: 8 }}>A little help goes a long way.</h3>
              <p>Find answers and get your team moving.</p>
              <Link href="/help" className="text-link" style={{ fontSize: 10 }}>
                Visit help center <ArrowUpRight size={11} style={{ display: 'inline' }} />
              </Link>
            </div>
            <div className="sidebar-profile">
              <Avatar name={user.name} />
              <div className="hide-collapsed" style={{ flex: 1 }}>
                <div className="small" style={{ fontWeight: 600 }}>
                  {user.name}
                </div>
                <div className="tiny muted">{roleLabels[user.role as keyof typeof roleLabels]}</div>
              </div>
              <button
                className="icon-btn hide-collapsed"
                title="Sign out"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
          <button
            className="collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </aside>
        <div className="app-main">
          <header className="topbar">
            <div className="flex-row">
              <button
                className="icon-btn mobile-menu"
                aria-label="Open navigation"
                aria-expanded={mobile}
                onClick={() => setMobile(!mobile)}
              >
                <Menu size={21} />
              </button>
              <div className="breadcrumb">
                <span>Workspace</span>
                <ChevronRight size={12} />
                <strong>{page?.label || 'Help center'}</strong>
              </div>
            </div>
            <div className="top-actions">
              <button className="top-search" onClick={() => setSearch(true)}>
                <Search size={16} />
                <span>Search anything...</span>
                <span className="key">Ctrl K</span>
              </button>
              {user.company.isDemo && <span className="demo-label">DEMO WORKSPACE</span>}
              <button
                className="icon-btn"
                onClick={toggleTheme}
                aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <Link
                href="/notifications"
                className="icon-btn"
                aria-label={`Notifications, ${unread} unread`}
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
                {unread > 0 && <span className="notice-dot" />}
              </Link>
              <span className="top-separator" />
              <Dropdown.Root>
                <Dropdown.Trigger className="flex-row" aria-label="User menu" style={{ gap: 8 }}>
                  <Avatar name={user.name} />
                  <span className="profile-name small">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={12} />
                </Dropdown.Trigger>
                <Dropdown.Portal>
                  <Dropdown.Content className="dropdown" align="end" sideOffset={12}>
                    <Dropdown.Item className="dropdown-item" asChild>
                      <Link href="/settings">
                        <Settings size={14} />
                        Account settings
                      </Link>
                    </Dropdown.Item>
                    <Dropdown.Item className="dropdown-item" asChild>
                      <Link href="/help">
                        <HelpCircle size={14} />
                        Help center
                      </Link>
                    </Dropdown.Item>
                    <Dropdown.Item
                      className="dropdown-item"
                      onSelect={() => signOut({ callbackUrl: '/login' })}
                    >
                      <LogOut size={14} />
                      Sign out
                    </Dropdown.Item>
                  </Dropdown.Content>
                </Dropdown.Portal>
              </Dropdown.Root>
            </div>
          </header>
          <main id="main-content">{children}</main>
        </div>
      </div>
      <Modal
        open={search}
        onOpenChange={setSearch}
        title="Search your workspace"
        description="Find clients, opportunities and assigned work."
      >
        <div className="search-field" style={{ maxWidth: 'none' }}>
          <Search />
          <input
            autoFocus
            className="input"
            placeholder="Search by name…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 15 }}>
          {searching ? (
            <p className="muted small">Searching…</p>
          ) : results.length ? (
            results.map((r) => (
              <Link
                key={r.id}
                href={`/${r.entity}/${r.id}`}
                onClick={() => setSearch(false)}
                className="between"
                style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}
              >
                <span>{r.name}</span>
                <span className="badge">{r.entity}</span>
              </Link>
            ))
          ) : (
            <Empty
              title={term ? 'No results found' : 'Your workspace, a search away'}
              description={
                term
                  ? 'Try a different name or keyword.'
                  : 'Type a name to search records you can access.'
              }
            />
          )}
        </div>
      </Modal>
    </WorkspaceContext.Provider>
  );
}
