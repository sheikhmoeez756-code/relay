import Link from 'next/link';
import { notFound } from 'next/navigation';
export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const states: Record<string, [string, string]> = {
    '403': ['Access is restricted.', 'Your administrator can help you get the right access.'],
    '500': ['Something went wrong.', 'Please try again or contact your workspace administrator.'],
    offline: ['You’re offline.', 'Reconnect to access your workspace and save changes.'],
    maintenance: [
      'A little maintenance. A better workspace.',
      'The workspace is temporarily unavailable. Please check back shortly.',
    ],
  };
  if (!states[state]) notFound();
  return (
    <main
      id="main-content"
      className="auth-main"
      style={{ minHeight: '100vh', textAlign: 'center' }}
    >
      <span className="eyebrow">{state}</span>
      <h1 style={{ margin: '15px 0' }}>{states[state][0]}</h1>
      <p className="muted">{states[state][1]}</p>
      <Link className="btn primary" href="/dashboard" style={{ marginTop: 25 }}>
        Return to workspace
      </Link>
    </main>
  );
}
