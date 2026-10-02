'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Inbox, ArrowUpRight } from 'lucide-react';
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="dialog-description">
            {description || 'Update the details below. All changes are saved to your workspace.'}
          </Dialog.Description>
          <Dialog.Close className="icon-btn dialog-close" aria-label="Close dialog">
            <X size={18} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Avatar({ name, size, square }: { name: string; size?: 'lg'; square?: boolean }) {
  return (
    <span className={`avatar ${size || ''} ${square ? 'square' : ''}`} aria-hidden="true">
      {name
        .split(' ')
        .slice(0, 2)
        .map((s) => s[0])
        .join('')
        .toUpperCase()}
    </span>
  );
}
export function Badge({ value }: { value: string }) {
  const cls = ['URGENT', 'HIGH', 'LOST', 'Inactive'].includes(value)
    ? 'red'
    : ['WAITING', 'MEDIUM', 'PROPOSAL', 'Onboarding'].includes(value)
      ? 'amber'
      : ['OPEN', 'ASSIGNED', 'NEW', 'CONTACTED'].includes(value)
        ? 'blue'
        : ['CLOSED', 'LOW'].includes(value)
          ? 'gray'
          : '';
  return <span className={`badge ${cls}`}>{label(value)}</span>;
}
export const label = (v: string) =>
  v
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const money = (v: number | string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(v));
export const date = (v: string | Date | undefined | null) =>
  v
    ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not set';
export function Empty({
  title = 'Nothing here yet',
  description = 'Create your first record to get started.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={28} strokeWidth={1.4} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="between page-heading">
      <div>
        {eyebrow && (
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            {eyebrow}
          </p>
        )}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="flex-row no-print">{children}</div>
    </div>
  );
}
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Skeleton() {
  return (
    <div className="page">
      <div className="skeleton" style={{ height: 32, width: 230, marginBottom: 30 }} />
      <div className="loading-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton loading-card" />
        ))}
      </div>
      <div className="skeleton" style={{ height: 300, marginTop: 25 }} />
    </div>
  );
}
export async function request<T = any>(
  url: string,
  body?: unknown,
  method = body ? 'POST' : 'GET',
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
export function ExportButton({
  data,
  filename = 'relay-export',
}: {
  data: Record<string, unknown>[];
  filename?: string;
}) {
  return (
    <button
      className="btn"
      onClick={() => {
        const columns = [...new Set(data.flatMap(Object.keys))];
        const escape = (v: unknown) =>
          '"' +
          String(typeof v === 'object' ? JSON.stringify(v) : (v ?? ''))
            .replace(/^[=+@-]/, "'$&")
            .replaceAll('"', '""') +
          '"';
        const csv = [
          columns.map(escape).join(','),
          ...data.map((row) => columns.map((k) => escape(row[k])).join(',')),
        ].join('\r\n');
        const url = URL.createObjectURL(
          new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = filename + '.csv';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      <ArrowUpRight size={14} />
      Export CSV
    </button>
  );
}
