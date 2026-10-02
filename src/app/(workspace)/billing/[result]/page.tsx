import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Forbidden, canView } from '@/components/forbidden';
export default async function PaymentResult({ params }: { params: Promise<{ result: string }> }) {
  if (!(await canView('billing'))) return <Forbidden />;
  const { result } = await params;
  if (!['success', 'failed', 'pending'].includes(result)) notFound();
  return (
    <div className="page">
      <div className="panel empty">
        <span className="eyebrow">PAYMENT {result.toUpperCase()} · UNVERIFIED</span>
        <h1 style={{ margin: '15px 0' }}>No payment status to confirm.</h1>
        <p>
          This route alone does not prove a payment succeeded, failed, or is pending.
          <br />A configured provider and verified webhook are required. No payment was made by this
          application.
        </p>
        <Link href="/billing" className="btn primary" style={{ marginTop: 23 }}>
          Back to billing
        </Link>
      </div>
    </div>
  );
}
