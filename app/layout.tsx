import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Mahila Mitr Admin', description: 'Private service dashboard for Mahila Mitr.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
