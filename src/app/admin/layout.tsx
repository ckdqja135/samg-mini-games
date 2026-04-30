import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/session';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect('/');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-gradient)' }}>
      <header className="bg-white/80 backdrop-blur-sm border-b border-soft-pink px-6 py-3 flex items-center gap-4">
        <Link href="/admin" className="font-pixel text-lg text-primary-pink">
          🛡️ Admin
        </Link>
        <nav className="flex gap-4 text-sm font-pixel text-text-dark">
          <Link href="/admin">개요</Link>
          <Link href="/admin/users">사용자</Link>
        </nav>
        <div className="ml-auto text-xs text-text-light font-pixel">
          {session.nickname}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
