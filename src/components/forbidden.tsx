import Link from 'next/link';
import { authorize, HttpError } from '@/lib/security';

export function Forbidden() {
  return (
    <div className="page">
      <div className="panel empty">
        <h1>403</h1>
        <h2>This space requires a different role.</h2>
        <p>Your administrator can help with access.</p>
        <Link className="btn" href="/dashboard" style={{ marginTop: 20 }}>
          Back to overview
        </Link>
      </div>
    </div>
  );
}

/** Returns false when the signed-in user lacks access, so pages can render <Forbidden />. */
export async function canView(resource: string) {
  try {
    await authorize(resource);
    return true;
  } catch (e) {
    if (e instanceof HttpError && e.status === 403) return false;
    throw e;
  }
}
