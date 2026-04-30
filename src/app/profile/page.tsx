import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { ProfileClient } from './ProfileClient';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }
  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-6 py-6 gap-4">
        <div className="flex items-center">
          <Link href="/games" className="text-text-dark text-xl px-1">
            ←
          </Link>
          <h1 className="flex-1 text-center font-pixel text-lg text-text-dark">
            내 프로필
          </h1>
          <div className="w-6" />
        </div>
        <ProfileClient />
      </div>
    </MobileFrame>
  );
}
