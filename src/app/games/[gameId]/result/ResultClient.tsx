'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CharacterSprite } from '@/components/character/CharacterSprite';
import { CuteButton } from '@/components/ui/CuteButton';
import { CountUp } from '@/components/ui/CountUp';
import { Confetti } from '@/components/ui/Confetti';
import { RankingList } from '@/components/game/RankingList';
import type { GameOverResult } from '@/types/cloudJump';
import type {
  GameRankingResponse,
  SubmitScoreResponse,
} from '@/types/score';
import { audio } from '@/lib/audio';
import { vibrate } from '@/lib/haptic';
import { ShareButton } from '@/components/game/ShareButton';
import { CHARACTER_SPRITES } from '@/data/characterSprite';

interface ResultClientProps {
  gameId: string;
  gameName: string;
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; data: SubmitScoreResponse }
  | { status: 'error'; message: string };

export function ResultClient({ gameId, gameName }: ResultClientProps) {
  const router = useRouter();
  const [result, setResult] = useState<GameOverResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const [ranking, setRanking] = useState<GameRankingResponse | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`samg:lastResult:${gameId}`);
      if (raw) setResult(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [gameId]);

  // 결과 데이터 로드 후 점수 등록 + 내 ID 조회 (한 번만)
  useEffect(() => {
    if (!result || submit.status !== 'idle') return;

    let cancelled = false;
    setSubmit({ status: 'submitting' });

    const submitScore = async () => {
      try {
        // 세션 토큰이 없으면 서버 검증 불가 — 사용자에게 안내하고 종료
        if (!result.sessionToken) {
          setSubmit({
            status: 'error',
            message: '세션이 만료되어 점수를 등록할 수 없어요. 다시 시도해주세요.',
          });
          return;
        }
        const [submitRes, meRes] = await Promise.all([
          fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: result.gameId,
              characterId: result.characterId,
              score: result.score,
              maxCombo: result.maxCombo,
              abilityActivations: result.abilityActivations,
              sessionToken: result.sessionToken,
              events: result.events,
              untrustedInputs: result.untrustedInputs,
              totalInputs: result.totalInputs,
              automationFlags: {
                webdriver:
                  typeof navigator !== 'undefined' &&
                  navigator.webdriver === true,
              },
            }),
          }),
          fetch('/api/auth/me', { cache: 'no-store' }),
        ]);

        if (cancelled) return;

        if (!submitRes.ok) {
          const err = await submitRes.json().catch(() => ({}));
          setSubmit({
            status: 'error',
            message: err.error || '점수 등록에 실패했어요',
          });
          return;
        }

        const data: SubmitScoreResponse = await submitRes.json();
        setSubmit({ status: 'success', data });

        if (data.isNewRecord) {
          audio.play('newRecord');
          vibrate('success');
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          if (!cancelled) setMyUserId(meData?.user?.id ?? null);
        }

        // 등록 직후 갱신된 랭킹 조회
        const rankingRes = await fetch(
          `/api/games/${gameId}/ranking?limit=5`,
          { cache: 'no-store' }
        );
        if (rankingRes.ok && !cancelled) {
          const rankingData: GameRankingResponse = await rankingRes.json();
          setRanking(rankingData);
        }

        // 라우터 캐시 무효화 — 캐릭터 선택/랭킹 페이지로 돌아갈 때 최신 랭킹 반영
        router.refresh();

        // 등록한 결과는 1회성이므로 sessionStorage에서 제거
        try {
          sessionStorage.removeItem(`samg:lastResult:${gameId}`);
        } catch {
          // ignore
        }
      } catch {
        if (!cancelled) {
          setSubmit({
            status: 'error',
            message: '네트워크 오류가 발생했어요',
          });
        }
      }
    };

    submitScore();
    return () => {
      cancelled = true;
    };
  }, [result, submit.status, gameId, router]);

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-sans text-text-light">결과 불러오는 중...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3 text-center">
        <h2 className="font-sans font-bold text-lg text-text-dark">
          결과 데이터가 없어요
        </h2>
        <Link href={`/games/${gameId}`} className="block w-full">
          <CuteButton variant="primary" fullWidth>
            다시 시작하기
          </CuteButton>
        </Link>
      </div>
    );
  }

  const isNewRecord = submit.status === 'success' && submit.data.isNewRecord;
  const top5Updated = submit.status === 'success' && submit.data.top5Updated;
  const myRank = submit.status === 'success' ? submit.data.rank : null;

  return (
    <div className="relative flex-1 flex flex-col items-center px-6 py-6 gap-3">
      {(isNewRecord || top5Updated) && <Confetti count={100} durationMs={3000} />}

      <h1 className="font-sans font-bold text-2xl text-primary-pink relative z-10 tracking-tight">
        Game Over
      </h1>

      <div className="flex justify-center my-1">
        <CharacterSprite
          characterId={result.characterId}
          size={120}
          animation={isNewRecord ? 'celebrate' : 'idle'}
        />
      </div>

      <p className="font-sans font-semibold text-sm text-text-dark">{gameName}</p>

      <div className="card-cute w-full text-center py-4">
        <p className="text-xs text-text-light">최종 점수</p>
        <p className="font-sans font-bold text-4xl text-primary-pink mt-1 tracking-tight">
          <CountUp to={result.score} duration={1500} />
        </p>
      </div>

      {isNewRecord && (
        <div
          className="w-full px-4 py-3 rounded-cute-lg border-2 border-yellow-300 bg-gradient-to-r from-yellow-100 to-pink-100 text-center font-sans font-bold"
          style={{
            animation: 'character-celebrate 0.8s ease-in-out infinite',
          }}
        >
          <span className="text-primary-pink">새로운 기록!</span>
          {myRank && myRank <= 100 && (
            <span className="ml-2 text-text-dark">#{myRank}위</span>
          )}
        </div>
      )}

      {!isNewRecord && submit.status === 'success' && myRank && (
        <div className="w-full px-4 py-2 rounded-cute bg-white/70 text-center font-sans font-semibold text-sm text-text-dark">
          현재 순위: <span className="text-primary-pink">#{myRank}위</span>
        </div>
      )}

      {submit.status === 'error' && (
        <div className="w-full px-4 py-2 rounded-cute bg-red-50 border border-red-200 text-center font-sans text-xs text-red-600">
          {submit.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="card-cute py-3 text-center">
          <p className="text-xs text-text-light">최고 콤보</p>
          <p className="font-sans font-bold text-lg text-text-dark">{result.maxCombo}</p>
        </div>
        <div className="card-cute py-3 text-center">
          <p className="text-xs text-text-light">능력 발동</p>
          <p className="font-sans font-bold text-lg text-text-dark">
            {result.abilityActivations}회
          </p>
        </div>
      </div>

      {ranking && (
        <div className="card-cute w-full">
          <h3 className="font-sans font-bold text-sm text-text-dark mb-2">
            TOP 5 랭킹
          </h3>
          <RankingList ranking={ranking.ranking} myUserId={myUserId} />
        </div>
      )}

      <div className="w-full flex flex-col gap-2 pt-2">
        <ShareButton
          gameName={gameName}
          score={result.score}
          characterName={
            CHARACTER_SPRITES.find((c) => c.id === result.characterId)?.name
          }
        />
        <Link href={`/games/${gameId}`} className="block">
          <CuteButton variant="primary" fullWidth>
            다시하기
          </CuteButton>
        </Link>
        <Link href="/games" className="block">
          <CuteButton variant="secondary" fullWidth>
            게임선택
          </CuteButton>
        </Link>
      </div>
    </div>
  );
}
