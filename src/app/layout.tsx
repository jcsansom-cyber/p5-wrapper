import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'p5.js AI Studio',
  description: 'Create interactive p5.js and ml5.js sketches with AI assistance.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
