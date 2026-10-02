# Relay architecture and delivery plan

Original BPO operations workspace using Next.js 15 App Router, React, TypeScript, Tailwind, accessible Radix/shadcn-style primitives, Prisma/PostgreSQL, NextAuth, Zod, React Hook Form, Recharts and Socket.io.

1. Foundation: schema, migration, development seed, authentication, tenant boundary, role policy, responsive shell.
2. Operations: database-backed dashboard; reusable searchable/sortable/paginated CRUD for clients, leads, projects, tasks and tickets; contextual detail views and activity.
3. Collaboration: reports/export, scoped messaging, notifications, immutable audit trail and settings.
4. Delivery: billing provider boundary, policy drafts and lifecycle states, automated tests, Docker and operating instructions.

Server components load protected data. Route handlers validate Zod inputs, authorize every request, constrain all queries to the authenticated company and use transactions for writes and audit events. JWT sessions are checked against active database users. Socket connections authenticate using the same session and join server-authorized rooms. Password reset/invitation tokens are hashed, expiring and single-use. Production requires SMTP and an external PostgreSQL service or the provided Docker stack.

Demo records are explicitly labeled. No business analytics or payment outcomes are represented as live commercial results. Billing changes require a configured provider; local plan simulations are explicitly labeled.

## Mandatory scope checklist

| Category | Items | Status |
|---|---|---|
| Legal | Privacy Policy, Terms of Service, Cookie Policy, Cookie Preferences, Disclaimer, Accessibility Statement, Data Processing Agreement, Acceptable Use Policy, Security Policy, Responsible Disclosure | In scope: clearly identified drafts/preferences |
| Legal | Final legal wording, production analytics consent configuration, production payment terms | Deferred until company/provider details and legal review |
| Legal | Shipping Policy, Return / Exchange Policy | Not applicable: no physical goods |
| Legal | Refund Policy, Cancellation Policy | Not applicable under requested scope until paid purchases; subscription cancellation UI is in scope |
| Legal | Community Guidelines | Not applicable: no public user-generated content |
| Lifecycle | Login, Register by invitation, Email Verification, Forgot Password, Reset Password, Onboarding, Account Settings, Billing, Upgrade, Downgrade, Cancel Subscription, Payment Success, Payment Failed, Payment Pending, Support, Help Center | In scope |
| UX | 404, 403, 500, Maintenance, Offline, Empty State, No Search Results, Loading State, Error State, Success State, Session Expired | In scope |
| Authentication | Optional two-factor provider integration | Deferred; schema/settings structure only |

## Verification gates

Prisma validation and migration, TypeScript, production build, Vitest permission/validation/service tests, database integration tests and Playwright critical workflows. Record actual command outcomes in README; never substitute mocked tests for database isolation evidence.
