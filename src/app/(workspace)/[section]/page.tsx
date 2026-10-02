import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/security';
import { Forbidden, canView } from '@/components/forbidden';
import { isEntity } from '@/lib/validation';
import { Records } from '@/components/records';
import {
  Employees,
  Notifications,
  Audit,
  Messages,
  Analytics,
} from '@/components/collaboration-pages';
import { Settings, Billing, Onboarding, Help } from '@/components/settings-pages';
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const special = [
    'employees',
    'notifications',
    'audit',
    'messages',
    'analytics',
    'settings',
    'billing',
    'onboarding',
    'help',
    'support',
  ];
  if (!isEntity(section) && !special.includes(section)) notFound();
  if (['help', 'support'].includes(section)) await currentUser();
  else if (!(await canView(section === 'onboarding' ? 'billing' : section))) return <Forbidden />;
  if (isEntity(section)) return <Records entity={section} />;
  const pages: Record<string, React.ReactNode> = {
    employees: <Employees />,
    notifications: <Notifications />,
    audit: <Audit />,
    messages: <Messages />,
    analytics: <Analytics />,
    settings: <Settings />,
    billing: <Billing />,
    onboarding: <Onboarding />,
    help: <Help />,
    support: <Help />,
  };
  return pages[section];
}
