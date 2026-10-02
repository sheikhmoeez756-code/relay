'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Entity, schemas } from '@/lib/validation';
import { Modal, label, request } from './ui';
import { useWorkspace } from './shell';
import { useToast } from './providers';
export const statuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];
export const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const entityLabels = {
  clients: 'client',
  leads: 'lead',
  projects: 'project',
  tasks: 'task',
  tickets: 'ticket',
};
export function RecordForm({
  entity,
  open,
  onOpenChange,
  onSaved,
  record,
}: {
  entity: Entity;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  record?: any;
}) {
  const workspace = useWorkspace();
  const toast = useToast();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<any>({ resolver: zodResolver(schemas[entity] as any) });
  useEffect(() => {
    if (open) {
      const allowed = Object.keys(schemas[entity].shape);
      const initial: any = {
        name: '',
        ...(entity === 'clients'
          ? { email: '', status: 'Active' }
          : entity === 'leads'
            ? { stage: 'NEW', value: 0 }
            : {
                status: 'OPEN',
                priority: 'MEDIUM',
                ...(entity === 'projects' ? { progress: 0 } : {}),
              }),
      };
      if (record)
        for (const key of allowed)
          if (record[key] != null)
            initial[key] = key === 'value' ? Number(record[key]) : record[key];
      reset(initial);
      setError('');
    }
  }, [open, record, entity, reset]);
  async function save(values: any) {
    try {
      await request(
        `/api/records/${entity}${record ? '/' + record.id : ''}`,
        values,
        record ? 'PATCH' : 'POST',
      );
      toast(`${label(entityLabels[entity])} ${record ? 'updated' : 'created'}.`);
      onOpenChange(false);
      onSaved();
      workspace.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const field = (key: string, title: string, type = 'text', full = false) => (
    <div className={`field ${full ? 'full' : ''}`} key={key}>
      <label htmlFor={'field-' + key}>
        {title}
        {['name', 'email'].includes(key) && entity === 'clients'
          ? ' *'
          : key === 'name'
            ? ' *'
            : ''}
      </label>
      {type === 'textarea' ? (
        <textarea id={'field-' + key} className="input" {...register(key)} />
      ) : (
        <input
          id={'field-' + key}
          type={type}
          className="input"
          {...register(key, type === 'number' ? { valueAsNumber: true } : {})}
        />
      )}
      <span className="field-error">{errors[key]?.message as string}</span>
    </div>
  );
  const select = (
    key: string,
    title: string,
    options: { id: string; name: string }[],
    optional = false,
  ) => (
    <div className="field" key={key}>
      <label htmlFor={'field-' + key}>{title}</label>
      <select
        id={'field-' + key}
        className="input"
        {...register(key, { setValueAs: (v) => (v === '' ? null : v) })}
      >
        {optional && <option value="">Unassigned</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <span className="field-error">{errors[key]?.message as string}</span>
    </div>
  );
  const dates = (key: string, title: string) => (
    <div className="field">
      <label htmlFor={'field-' + key}>{title}</label>
      <input
        id={'field-' + key}
        type="date"
        className="input"
        defaultValue={record?.[key]?.slice(0, 10)}
        {...register(key, { setValueAs: (v) => (v ? new Date(v).toISOString() : null) })}
      />
      <span className="field-error">{errors[key]?.message as string}</span>
    </div>
  );
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${record ? 'Edit' : 'New'} ${entityLabels[entity]}`}
      description={`Keep your workspace connected with accurate ${entityLabels[entity]} information.`}
    >
      <form onSubmit={handleSubmit(save)}>
        {error && (
          <div className="alert" role="alert" style={{ marginBottom: 17 }}>
            {error}
          </div>
        )}
        <div className="form-grid">
          {field(
            'name',
            entity === 'clients' ? 'Company name' : entity === 'leads' ? 'Contact name' : 'Title',
            'text',
            true,
          )}
          {entity === 'clients' && (
            <>
              {field('email', 'Email', 'email')}
              {field('phone', 'Phone')}
              {field('industry', 'Industry')}
              {field('website', 'Website', 'url')}
              {select(
                'status',
                'Relationship status',
                ['Active', 'Onboarding', 'Inactive'].map((v) => ({ id: v, name: v })),
              )}
              {field('notes', 'Notes', 'textarea', true)}
            </>
          )}
          {entity === 'leads' && (
            <>
              {field('email', 'Email', 'email')}
              {field('organization', 'Organization')}
              {field('value', 'Expected value (USD)', 'number')}
              {select(
                'stage',
                'Pipeline stage',
                stages.map((v) => ({ id: v, name: label(v) })),
              )}
              {select('ownerId', 'Lead owner', workspace.users, true)}
              {dates('followUpDate', 'Follow-up date')}
              {field('notes', 'Notes', 'textarea', true)}
            </>
          )}
          {['projects', 'tasks', 'tickets'].includes(entity) && (
            <>
              {field('description', 'Description', 'textarea', true)}
              {select(
                'status',
                'Status',
                statuses.map((v) => ({ id: v, name: label(v) })),
              )}
              {select(
                'priority',
                'Priority',
                priorities.map((v) => ({ id: v, name: label(v) })),
              )}
              {['projects', 'tickets'].includes(entity) &&
                select('clientId', 'Client', workspace.clients, true)}
              {['tasks', 'tickets'].includes(entity) && (
                <>
                  {select('projectId', 'Project', workspace.projects, true)}
                  {select('assigneeId', 'Assignee', workspace.users, true)}
                </>
              )}
              {entity === 'tickets' &&
                select('departmentId', 'Department', workspace.departments, true)}
              {entity === 'projects' && (
                <>
                  {field('progress', 'Progress (%)', 'number')}
                  {dates('startDate', 'Start date')}
                </>
              )}
              {dates('dueDate', 'Due date')}
            </>
          )}
        </div>
        <div className="dialog-footer">
          <button className="btn" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button className="btn primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : record ? 'Save changes' : `Create ${entityLabels[entity]}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
