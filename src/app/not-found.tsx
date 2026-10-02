import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main-content" className="auth-main" style={{ minHeight: '100vh' }}>
      <span className="eyebrow">404 · PAGE NOT FOUND</span>
      <h1 style={{ margin: '15px 0' }}>This path leads somewhere else.</h1>
      <p className="muted">The page may have moved, or the link may be incorrect.</p>
      <Link href="/dashboard" className="btn primary" style={{ marginTop: 25 }}>
        Back to your workspace
      </Link>
    </main>
  );
}
