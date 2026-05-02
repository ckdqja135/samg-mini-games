import { CHARACTER_SPRITES, getCharacter } from '@/data/characterSprite';

export type CanvasAnimation = 'idle' | 'walk' | 'jump' | 'hurt';

export class CharacterRenderer {
  private images = new Map<string, HTMLImageElement>();
  private loadPromise: Promise<void>;

  constructor() {
    const promises: Promise<void>[] = [];
    for (const char of CHARACTER_SPRITES) {
      const img = new Image();
      this.images.set(char.id, img);
      promises.push(
        new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // 개별 실패해도 다른 캐릭터는 진행
          img.src = char.imageUrl;
        })
      );
    }
    this.loadPromise = Promise.all(promises).then(() => undefined);
  }

  async preload(): Promise<void> {
    return this.loadPromise;
  }

  /**
   * 캐릭터를 Canvas에 그립니다.
   * @param height 표시 높이(px). 너비는 캐릭터 종횡비에 맞춰 자동 계산
   */
  draw(
    ctx: CanvasRenderingContext2D,
    characterId: string,
    x: number,
    y: number,
    height: number,
    animation: CanvasAnimation = 'idle',
    time = 0,
    flipX = false
  ): void {
    const img = this.images.get(characterId);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const character = getCharacter(characterId);
    if (!character) return;

    // 자연 종횡비 사용 (없으면 정의된 aspectRatio 폴백)
    const aspect =
      img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : character.aspectRatio;
    // 충돌·위치 기준은 원래 height (게임 로직 안 깨지게)
    const baseWidth = height * aspect;
    // 시각적 크기는 displayScale 적용
    const drawScale = character.displayScale ?? 1;
    const drawHeight = height * drawScale;
    const drawWidth = baseWidth * drawScale;

    let offsetY = 0;
    let scaleX = 1;
    let scaleY = 1;
    let rotation = 0;

    switch (animation) {
      case 'idle':
        offsetY = Math.sin(time / 300) * 3;
        scaleY = 1 + Math.sin(time / 300) * 0.02;
        break;
      case 'walk':
        offsetY = Math.abs(Math.sin(time / 100)) * -4;
        rotation = Math.sin(time / 100) * 0.05;
        break;
      case 'jump':
        scaleX = 0.95;
        scaleY = 1.05;
        break;
      case 'hurt':
        offsetY = Math.sin(time / 50) * 3;
        rotation = Math.sin(time / 50) * 0.1;
        break;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 원래 충돌박스 중앙에 그림 (스케일된 이미지가 중앙 정렬)
    ctx.translate(x + baseWidth / 2, y + height / 2 + offsetY);
    ctx.rotate(rotation);
    ctx.scale(scaleX * (flipX ? -1 : 1), scaleY);
    ctx.translate(-drawWidth / 2, -drawHeight / 2);

    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
    ctx.restore();
  }

  /** 캐릭터의 종횡비(width/height)를 반환 */
  getAspectRatio(characterId: string): number {
    const img = this.images.get(characterId);
    if (img && img.naturalHeight > 0) {
      return img.naturalWidth / img.naturalHeight;
    }
    const character = getCharacter(characterId);
    return character?.aspectRatio ?? 1;
  }
}
