'use client';

import { CSSProperties, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CHARACTER_SPRITES } from '@/data/characterSprite';
import {
  CHARACTER_ABILITIES,
  getTriggerTypeLabel,
} from '@/data/characterAbilities';
import { GAME_RECOMMENDATIONS } from '@/data/gameRecommendations';
import { TUTORIALS } from '@/components/game/TutorialOverlay';
import { CharacterSprite } from './CharacterSprite';
import { CuteButton } from '@/components/ui/CuteButton';
import { SparkleEffect } from '@/components/ui/SparkleEffect';
import { useGamePlayStore } from '@/store/gameStore';

interface CharacterSelectProps {
  gameId: string;
  gameName: string;
}

export function CharacterSelect({ gameId, gameName }: CharacterSelectProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(CHARACTER_SPRITES[0].id);
  const setStoreCharacter = useGamePlayStore((s) => s.setCharacter);

  const selected = CHARACTER_SPRITES.find((c) => c.id === selectedId);
  const ability = CHARACTER_ABILITIES[selectedId];

  if (!selected || !ability) return null;

  const handleStart = () => {
    setStoreCharacter(selected.id);
    router.push(`/games/${gameId}/play`);
  };

  return (
    <div className="flex-1 flex flex-col px-4 py-6 gap-4">
      <div className="flex items-center">
        <Link href="/games" className="text-text-dark text-xl px-2">
          ←
        </Link>
        <h1 className="flex-1 text-center font-sans font-bold text-base text-text-dark tracking-tight">
          {gameName} · 캐릭터 선택
        </h1>
        <div className="w-8" />
      </div>

      <h2 className="text-center font-sans font-bold text-lg text-primary-pink tracking-tight">
        함께할 캐릭터를 골라주세요
      </h2>

      {(() => {
        const rec = GAME_RECOMMENDATIONS[gameId];
        if (!rec) return null;
        const char = CHARACTER_SPRITES.find((c) => c.id === rec.primary);
        if (!char) return null;
        return (
          <div
            className="px-3 py-2 mx-2 rounded-cute text-sm bg-white/95 border-l-4 flex items-center justify-center gap-1.5"
            style={{ borderLeftColor: char.color }}
          >
            <span className="text-text-dark font-semibold">이 게임엔</span>
            <span
              className="font-bold px-2 py-0.5 rounded-full text-white text-xs"
              style={{ backgroundColor: char.color }}
            >
              {char.name}
            </span>
            <span className="text-text-dark font-semibold">추천!</span>
          </div>
        );
      })()}

      {(() => {
        const t = TUTORIALS[gameId];
        if (!t) return null;
        return (
          <div className="mx-2 px-4 py-3 rounded-cute-lg bg-white/95 border-2 border-primary-pink/30">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">{t.emoji}</span>
              <h3 className="font-sans font-bold text-sm text-text-dark tracking-tight">
                이렇게 플레이해요
              </h3>
            </div>
            <ol className="flex flex-col gap-1.5">
              {t.steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[12.5px] text-text-dark/85 leading-snug"
                >
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full bg-primary-pink/15 text-primary-pink font-sans font-bold text-[10px] flex items-center justify-center mt-0.5 tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })()}

      <div className="character-grid px-2">
        {CHARACTER_SPRITES.map((char) => {
          const charAbility = CHARACTER_ABILITIES[char.id];
          const isSelected = selectedId === char.id;
          return (
            <button
              key={char.id}
              onClick={() => setSelectedId(char.id)}
              className={`character-card ${isSelected ? 'selected' : ''}`}
              style={{ '--char-color': char.color } as CSSProperties}
              aria-pressed={isSelected}
            >
              <CharacterSprite
                characterId={char.id}
                size={70}
                animation={isSelected ? 'walk' : 'idle'}
              />
              <span className="char-name">{char.name}</span>
              <span
                className="ability-badge"
                title={charAbility.name}
                aria-label={charAbility.name}
              >
                {charAbility.iconEmoji}
              </span>
              {isSelected && <SparkleEffect count={3} />}
            </button>
          );
        })}
      </div>

      <div
        className="selected-preview"
        style={{ '--char-color': selected.color } as CSSProperties}
      >
        <div className="flex justify-center mb-2">
          <CharacterSprite
            characterId={selected.id}
            size={180}
            animation="celebrate"
          />
        </div>
        <h3 className="preview-name">{selected.name}</h3>
        <p className="preview-desc">{selected.description}</p>

        <div className="ability-card">
          <div className="ability-header">
            <span className="ability-icon-large">{ability.iconEmoji}</span>
            <span className="ability-name">{ability.name}</span>
          </div>
          <p className="ability-desc">{ability.description}</p>
          <div className="ability-tags">
            <span className={`tag tag-${ability.triggerType}`}>
              {getTriggerTypeLabel(ability.triggerType)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <CuteButton variant="primary" fullWidth onClick={handleStart}>
          이 캐릭터로 시작
        </CuteButton>
      </div>
    </div>
  );
}
