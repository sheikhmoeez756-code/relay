import { Suspense } from 'react';
import { AuthScreen } from '@/components/auth-screen';
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen mode="verify-email" />
    </Suspense>
  );
}
