import { dashboard } from '@/lib/dashboard';
import { authorize } from '@/lib/security';
import { Dashboard } from '@/components/dashboard';
export default async function DashboardPage() {
  const user = await authorize('dashboard');
  const data = await dashboard(user);
  return (
    <Dashboard
      initialData={JSON.parse(JSON.stringify(data))}
      name={user.name}
      isDemo={user.company.isDemo}
    />
  );
}
