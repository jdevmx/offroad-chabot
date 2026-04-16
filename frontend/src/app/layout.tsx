import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OffRoad Chabot',
  description: 'AI assistant for off-road enthusiasts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
