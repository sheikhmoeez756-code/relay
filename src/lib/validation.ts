import { z } from 'zod';
export const cleanText = (v: string) =>
  v
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();
const text = z.string().trim().max(5000).transform(cleanText);
const name = z.string().trim().min(2).max(120).transform(cleanText);
const optionalId = z.string().cuid().nullable().optional();
const date = z.string().datetime().nullable().optional();
export const status = z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']);
export const priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const password = z
  .string()
  .min(12)
  .max(72)
  .regex(/[A-Z]/, 'Use an uppercase letter')
  .regex(/[a-z]/, 'Use a lowercase letter')
  .regex(/[0-9]/, 'Use a number')
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    'Password must fit within 72 UTF-8 bytes',
  );
export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const schemas = {
  clients: z
    .object({
      name,
      email: z.string().email().max(254),
      phone: text.optional(),
      industry: text.optional(),
      website: z.union([z.string().url(), z.literal('')]).optional(),
      notes: text.optional(),
      status: z.enum(['Active', 'Onboarding', 'Inactive']).optional(),
    })
    .strict(),
  leads: z
    .object({
      name,
      email: z.union([z.string().email(), z.literal('')]).optional(),
      organization: text.optional(),
      value: z.coerce.number().min(0).max(999999999999).optional(),
      stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
      ownerId: optionalId,
      followUpDate: date,
      notes: text.optional(),
    })
    .strict(),
  projects: z
    .object({
      name,
      description: text.optional(),
      clientId: optionalId,
      status: status.optional(),
      priority: priority.optional(),
      progress: z.coerce.number().int().min(0).max(100).optional(),
      startDate: date,
      dueDate: date,
    })
    .strict(),
  tasks: z
    .object({
      name,
      description: text.optional(),
      projectId: optionalId,
      assigneeId: optionalId,
      status: status.optional(),
      priority: priority.optional(),
      dueDate: date,
    })
    .strict(),
  tickets: z
    .object({
      name,
      description: text.optional(),
      clientId: optionalId,
      projectId: optionalId,
      departmentId: optionalId,
      assigneeId: optionalId,
      status: status.optional(),
      priority: priority.optional(),
      dueDate: date,
    })
    .strict(),
};
export type Entity = keyof typeof schemas;
export const isEntity = (v: string): v is Entity => Object.hasOwn(schemas, v);
export const listSchema = z.object({
  q: z.string().max(120).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['name', 'createdAt', 'updatedAt', 'dueDate']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: z.string().max(30).optional(),
});
