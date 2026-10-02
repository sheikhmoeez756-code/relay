import { redirect } from 'next/navigation';
import { currentUser, publicUser, HttpError } from '@/lib/security';
import { Shell } from '@/components/shell';
export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await currentUser();
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) redirect('/login');
    throw e;
  }
  return <Shell user={JSON.parse(JSON.stringify(publicUser(user)))}>{children}</Shell>;
}
