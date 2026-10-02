'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  List,
  Columns3,
  LayoutGrid,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Pencil,
  Archive,
  MoreHorizontal,
  FolderKanban,
  CheckSquare,
} from 'lucide-react';
import { Entity } from '@/lib/validation';
import { can } from '@/lib/permissions';
import { useWorkspace } from './shell';
import { useToast } from './providers';
import { RecordForm, statuses, stages } from './record-form';
import {
  PageHeading,
  Empty,
  Badge,
  Avatar,
  label,
  money,
  date,
  Modal,
  request,
  ExportButton,
} from './ui';
const descriptions = {
  clients: 'Strong relationships start with a connected view of every client.',
  leads: 'Move opportunities forward, from the first hello to a new partnership.',
  projects: 'A shared view of your projects, progress, and what comes next.',
  tasks: 'Bring focus to your day. Keep every commitment moving.',
  tickets: 'Every request in one place. Great service starts here.',
};
export function Records({ entity }: { entity: Entity }) {
  const { user, users } = useWorkspace();
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [view, setView] = useState(entity === 'leads' ? 'board' : 'list');
  const [form, setForm] = useState(false);
  const [edit, setEdit] = useState<any>();
  const [archive, setArchive] = useState<any>();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(new Date());
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await request(
          `/api/records/${entity}?q=${encodeURIComponent(query)}&page=${page}&limit=${view === 'list' ? 10 : 100}&sort=${sort}&order=${order}${filter ? '&status=' + filter : ''}`,
        ),
      );
      setSelected([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [entity, query, page, sort, order, filter, view]);
  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    setPage(1);
    setFilter('');
    setQuery('');
    setView(entity === 'leads' ? 'board' : 'list');
  }, [entity]);
  async function updateStage(id: string, value: string) {
    try {
      await request(
        `/api/records/${entity}/${id}`,
        { [entity === 'leads' ? 'stage' : 'status']: value },
        'PATCH',
      );
      toast('Status updated.');
      load();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  async function archiveRecord() {
    setBusy(true);
    try {
      await request(`/api/records/${entity}/${archive.id}`, undefined, 'DELETE');
      toast('Record archived.');
      setArchive(undefined);
      load();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function bulk() {
    if (!bulkStatus) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled(
        selected.map((id) =>
          request(`/api/records/${entity}/${id}`, { status: bulkStatus }, 'PATCH'),
        ),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      toast(`${results.length - failed} updated${failed ? `, ${failed} failed` : ''}.`);
      load();
    } finally {
      setBusy(false);
    }
  }
  const options =
    entity === 'clients'
      ? ['Active', 'Onboarding', 'Inactive']
      : entity === 'leads'
        ? stages
        : statuses;
  const countLabel = entity === 'leads' ? 'opportunities' : entity;
  const userName = (id: string) => users.find((u: any) => u.id === id)?.name || 'Unassigned';
  const title = entity === 'leads' ? 'Sales pipeline' : label(entity);
  const card = (item: any) => (
    <div
      key={item.id}
      className="panel kanban-card"
      draggable={can(user.role, entity, 'update')}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
    >
      <Link href={`/${entity}/${item.id}`}>
        <div className="between">
          <Avatar name={item.organization || item.name} square />
          <Badge value={item.priority || item.stage || item.status} />
        </div>
        <h3 style={{ marginTop: 12 }}>{item.name}</h3>
        <p>
          {item.organization ||
            item.description?.slice(0, 70) ||
            'Workspace ' + entity.slice(0, -1)}
        </p>
        {entity === 'leads' ? (
          <div className="value">{money(item.value)}</div>
        ) : (
          <div style={{ margin: '15px 0' }}>
            {entity === 'projects' && (
              <>
                <div className="between tiny muted" style={{ marginBottom: 7 }}>
                  <span>Progress</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: item.progress + '%' }} />
                </div>
              </>
            )}
            <p>Due {date(item.dueDate)}</p>
          </div>
        )}
      </Link>
      <div className="between" style={{ borderTop: '1px solid var(--line)', paddingTop: 11 }}>
        <span className="tiny muted">{userName(item.ownerId || item.assigneeId)}</span>
        {can(user.role, entity, 'update') && (
          <select
            className="input"
            aria-label={`Stage for ${item.name}`}
            style={{ width: 108, minHeight: 28, padding: '3px', fontSize: 9 }}
            value={item.stage || item.status}
            onChange={(e) => updateStage(item.id, e.target.value)}
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {label(o)}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
  return (
    <div className="page">
      <PageHeading title={title} description={descriptions[entity]}>
        <ExportButton data={data.items} filename={`relay-${entity}-page-${page}`} />
        {can(user.role, entity, 'create') && (
          <button
            className="btn primary"
            onClick={() => {
              setEdit(undefined);
              setForm(true);
            }}
          >
            <Plus size={15} />
            New {entity.slice(0, -1)}
          </button>
        )}
      </PageHeading>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="toolbar">
          <div className="search-field">
            <Search />
            <input
              className="input"
              placeholder={`Search ${countLabel}…`}
              aria-label={`Search ${entity}`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input"
            aria-label="Filter by status"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All {entity === 'leads' ? 'stages' : 'statuses'}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {label(o)}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Sort records"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="createdAt">Date created</option>
            <option value="updatedAt">Last updated</option>
            <option value="name">Name</option>
            {!['clients', 'leads'].includes(entity) && <option value="dueDate">Due date</option>}
          </select>
          <button
            className="icon-btn"
            aria-label={`Sort ${order === 'asc' ? 'descending' : 'ascending'}`}
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          >
            <ArrowUpDown size={16} />
          </button>
          <span className="tiny muted" style={{ marginLeft: 'auto' }}>
            {data.total} {countLabel}
          </span>
          <div className="flex-row" style={{ gap: 3 }}>
            <button
              className={`icon-btn ${view === 'list' ? 'badge' : ''}`}
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => {
                setView('list');
                setPage(1);
              }}
            >
              <List size={17} />
            </button>
            {entity !== 'clients' && (
              <button
                className={`icon-btn ${view === 'board' ? 'badge' : ''}`}
                aria-label="Board view"
                aria-pressed={view === 'board'}
                onClick={() => {
                  setView('board');
                  setPage(1);
                }}
              >
                <Columns3 size={17} />
              </button>
            )}
            {entity === 'projects' && (
              <button className="icon-btn" aria-label="Grid view" onClick={() => setView('grid')}>
                <LayoutGrid size={16} />
              </button>
            )}
            {entity === 'tasks' && (
              <button
                className="icon-btn"
                aria-label="Calendar view"
                onClick={() => setView('calendar')}
              >
                <CalendarDays size={16} />
              </button>
            )}
          </div>
        </div>
        {selected.length > 0 && (
          <div className="toolbar" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="small">{selected.length} selected</span>
            <select
              className="input"
              aria-label="Bulk status"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">Choose status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <button className="btn" onClick={bulk} disabled={busy || !bulkStatus}>
              {busy ? 'Updating…' : 'Apply to selected'}
            </button>
          </div>
        )}
        {error && (
          <div className="alert" role="alert" style={{ margin: 20 }}>
            {error}{' '}
            <button onClick={load} className="text-link">
              Try again
            </button>
          </div>
        )}
        {loading ? (
          <div style={{ padding: 22 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 43, marginBottom: 15 }} />
            ))}
          </div>
        ) : !data.items.length ? (
          <Empty
            title={query || filter ? 'No matching records' : 'Your next chapter starts here'}
            description={
              query || filter
                ? 'Try adjusting your search or filters.'
                : `Create your first ${entity.slice(0, -1)} to bring your workspace to life.`
            }
          />
        ) : view === 'list' ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {entity === 'tickets' && can(user.role, entity, 'update') && (
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Select all tickets on this page"
                          checked={selected.length === data.items.length}
                          onChange={(e) =>
                            setSelected(e.target.checked ? data.items.map((r: any) => r.id) : [])
                          }
                        />
                      </th>
                    )}
                    <th>
                      {entity === 'clients'
                        ? 'Client'
                        : entity === 'leads'
                          ? 'Opportunity'
                          : 'Name'}
                    </th>
                    <th>
                      {entity === 'clients'
                        ? 'Industry'
                        : entity === 'leads'
                          ? 'Expected value'
                          : 'Priority'}
                    </th>
                    <th>{entity === 'leads' ? 'Stage' : 'Status'}</th>
                    <th>
                      {entity === 'clients' ? 'Contact' : entity === 'leads' ? 'Owner' : 'Due date'}
                    </th>
                    <th>{entity === 'projects' ? 'Progress' : 'Updated'}</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r: any) => (
                    <tr key={r.id}>
                      {entity === 'tickets' && can(user.role, entity, 'update') && (
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.name}`}
                            checked={selected.includes(r.id)}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, r.id]
                                  : selected.filter((id) => id !== r.id),
                              )
                            }
                          />
                        </td>
                      )}
                      <td>
                        <Link className="flex-row" href={`/${entity}/${r.id}`}>
                          {entity === 'clients' && <Avatar name={r.name} square />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.name}</div>
                            <div className="sub">
                              {r.number
                                ? 'TKT-' + String(r.number).padStart(4, '0')
                                : r.organization || r.website || date(r.createdAt)}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {entity === 'clients' ? (
                          r.industry || '—'
                        ) : entity === 'leads' ? (
                          money(r.value)
                        ) : (
                          <Badge value={r.priority} />
                        )}
                      </td>
                      <td>
                        <Badge value={r.stage || r.status} />
                      </td>
                      <td>
                        {entity === 'clients'
                          ? r.email
                          : entity === 'leads'
                            ? userName(r.ownerId)
                            : date(r.dueDate)}
                      </td>
                      <td>
                        {entity === 'projects' ? (
                          <div style={{ width: 100 }}>
                            <span className="tiny muted">{r.progress}%</span>
                            <div className="progress-track" style={{ marginTop: 5 }}>
                              <div className="progress-bar" style={{ width: r.progress + '%' }} />
                            </div>
                          </div>
                        ) : (
                          date(r.updatedAt)
                        )}
                      </td>
                      <td>
                        <div className="flex-row" style={{ gap: 2 }}>
                          {can(user.role, entity, 'update') && user.role !== 'EMPLOYEE' && (
                            <button
                              className="icon-btn"
                              aria-label={`Edit ${r.name}`}
                              onClick={() => {
                                setEdit(r);
                                setForm(true);
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {can(user.role, entity, 'archive') && (
                            <button
                              className="icon-btn"
                              aria-label={`Archive ${r.name}`}
                              onClick={() => setArchive(r)}
                            >
                              <Archive size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        <div className="table-footer">
          <span>
            Showing {data.items.length} of {data.total} {countLabel}
            {view !== 'list' ? ' · up to 100 per page' : ''}
          </span>
          <div className="flex-row">
            <button
              className="icon-btn"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Page {page} of {data.pages}
            </span>
            <button
              className="icon-btn"
              aria-label="Next page"
              disabled={page >= data.pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
      {!loading && view === 'board' && (
        <div className="kanban">
          {options.map((stage) => (
            <section
              key={stage}
              className="kanban-column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (data.items.some((r: any) => r.id === id)) updateStage(id, stage);
              }}
            >
              <div className="kanban-header">
                <span>
                  <Badge value={stage} />
                </span>
                <span className="muted">
                  {data.items.filter((r: any) => (r.stage || r.status) === stage).length}
                </span>
              </div>
              {data.items.filter((r: any) => (r.stage || r.status) === stage).map(card)}
            </section>
          ))}
        </div>
      )}
      {!loading && view === 'grid' && <div className="directory-grid">{data.items.map(card)}</div>}
      {!loading && view === 'calendar' && (
        <div className="panel">
          <div className="panel-header">
            <h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div>
              <button
                className="icon-btn"
                aria-label="Previous month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="icon-btn"
                aria-label="Next month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="small muted" style={{ padding: 10 }}>
                {d}
              </div>
            ))}
            {Array.from(
              { length: new Date(month.getFullYear(), month.getMonth(), 1).getDay() },
              (_, i) => (
                <div key={'blank' + i} />
              ),
            )}
            {Array.from(
              { length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() },
              (_, i) => (
                <div key={i} className="calendar-day">
                  {i + 1}
                  {data.items
                    .filter(
                      (r: any) =>
                        r.dueDate &&
                        new Date(r.dueDate).toDateString() ===
                          new Date(month.getFullYear(), month.getMonth(), i + 1).toDateString(),
                    )
                    .map((r: any) => (
                      <Link className="calendar-event" key={r.id} href={'/tasks/' + r.id}>
                        {r.name}
                      </Link>
                    ))}
                </div>
              ),
            )}
          </div>
        </div>
      )}
      <RecordForm entity={entity} open={form} onOpenChange={setForm} record={edit} onSaved={load} />
      <Modal
        open={!!archive}
        onOpenChange={() => setArchive(undefined)}
        title="Archive this record?"
        description={`“${archive?.name}” will be removed from active views. Its history stays in your audit trail.`}
      >
        <div className="dialog-footer">
          <button className="btn" onClick={() => setArchive(undefined)}>
            Keep record
          </button>
          <button className="btn danger" onClick={archiveRecord} disabled={busy}>
            {busy ? 'Archiving…' : 'Archive record'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
