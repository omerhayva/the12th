import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'THE 12TH — Football Intelligence',
  description: 'Read the game. Make the call. Prove your football IQ.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
