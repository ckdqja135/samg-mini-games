import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { MobileFrame } from '@/components/layout/MobileFrame';

export default async function GamesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  return (
    <MobileFrame>
      <div className="flex-1 flex flex-col px-6 py-8">
        <div className="flex items-center mb-6">
          <h1 className="flex-1 text-center font-pixel text-lg text-text-dark">
            미니게임 선택
          </h1>
        </div>

        <div className="card-cute text-center">
          <div className="text-5xl mb-3">🎮</div>
          <h2 className="font-pixel text-xl text-primary-pink mb-2">
            안녕, {session.nickname}!
          </h2>
          <p className="text-sm text-text-light">
            게임 선택 화면은<br />
            Phase 3에서 구현됩니다
          </p>
        </div>
      </div>
    </MobileFrame>
  );
}
