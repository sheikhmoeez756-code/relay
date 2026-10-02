import './globals.css';
import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
export const metadata: Metadata = {
  title: { default: 'Relay — Operations, connected.', template: '%s | Relay' },
  description: 'A connected workspace for BPO clients, projects, teams and support.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
