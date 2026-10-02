import Link from 'next/link';
import { notFound } from 'next/navigation';
import { policies } from '@/lib/policies';
import { CookiePreferences } from '@/components/cookie-preferences';
export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  if (policy !== 'cookie-preferences' && !policies[policy]) notFound();
  const page = policies[policy] || { title: 'Cookie Preferences', sections: [] };
  return (
    <main className="policy panel" id="main-content">
      <Link href="/dashboard" className="text-link">
        ← Back to Relay
      </Link>
      <div className="eyebrow" style={{ marginTop: 30 }}>
        TRUST & TRANSPARENCY
      </div>
      <h1>{page.title}</h1>
      {policy !== 'cookie-preferences' && (
        <div className="alert" style={{ marginBottom: 25 }}>
          Implementation draft — company details and legal review required before production use.
        </div>
      )}
      {page.sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
        </section>
      ))}
      {['cookie-preferences', 'cookies'].includes(policy) && <CookiePreferences />}
      <footer style={{ borderTop: '1px solid var(--line)', paddingTop: 20, marginTop: 30 }}>
        <Link className="text-link" href="/policies/privacy">
          Privacy
        </Link>{' '}
        ·{' '}
        <Link className="text-link" href="/policies/terms">
          Terms
        </Link>{' '}
        ·{' '}
        <Link className="text-link" href="/policies/cookie-preferences">
          Cookie preferences
        </Link>
      </footer>
    </main>
  );
}
