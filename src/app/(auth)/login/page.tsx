import { Suspense } from 'react';
import { AuthScreen } from '@/components/auth-screen';
import { demoMode } from '@/lib/demo';

// Read DEMO_MODE at request time so one build works with or without the public demo.
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen mode="login" demo={demoMode()} />
    </Suspense>
  );
}
