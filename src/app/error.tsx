'use client';
import Link from 'next/link';
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page">
      <section className="panel empty" role="alert">
        <h1>Something didn’t connect.</h1>
        <p>We couldn’t load this page. Check that the database is available, then try again.</p>
        <div className="flex-row" style={{ justifyContent: 'center', marginTop: 20 }}>
          <button className="btn primary" onClick={reset}>
            Try again
          </button>
          <Link className="btn" href="/dashboard">
            Back to overview
          </Link>
        </div>
      </section>
    </div>
  );
}
