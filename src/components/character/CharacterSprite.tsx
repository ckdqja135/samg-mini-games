'use client';

import { CSSProperties } from 'react';
import { getCharacter } from '@/data/characterSprite';

export type CharacterAnimation =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'celebrate'
  | 'hurt';

interface CharacterSpriteProps {
  characterId: string;
  /** 표시 높이(px). 너비는 캐릭터 종횡비에 맞춰 자동 계산 */
  size?: number;
  animation?: CharacterAnimation;
  flip?: boolean;
  className?: string;
}

export function CharacterSprite({
  characterId,
  size = 120,
  animation = 'idle',
  flip = false,
  className = '',
}: CharacterSpriteProps) {
  const character = getCharacter(characterId);
  if (!character) return null;

  const scaledHeight = size * (character.displayScale ?? 1);
  const displayWidth = scaledHeight * character.aspectRatio;

  const style: CSSProperties = {
    width: `${displayWidth}px`,
    height: `${scaledHeight}px`,
    backgroundImage: `url(${character.imageUrl})`,
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div
      className={`character-sprite anim-${animation} ${flip ? 'flip-x' : ''} ${className}`}
      style={style}
      role="img"
      aria-label={character.name}
    />
  );
}
