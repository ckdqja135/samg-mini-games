'use client';

import { CSSProperties } from 'react';
import { SPRITE_SHEET, getCharacter } from '@/data/characterSprite';

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

  const { bounds } = character;
  const { totalWidth, totalHeight, url } = SPRITE_SHEET;

  const scale = size / bounds.height;
  const displayWidth = bounds.width * scale;

  const style: CSSProperties = {
    width: `${displayWidth}px`,
    height: `${size}px`,
    backgroundImage: `url(${url})`,
    backgroundPosition: `-${bounds.x * scale}px -${bounds.y * scale}px`,
    backgroundSize: `${totalWidth * scale}px ${totalHeight * scale}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
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
