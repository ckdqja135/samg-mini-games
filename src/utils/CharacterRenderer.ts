import { SPRITE_SHEET, getCharacter } from '@/data/characterSprite';

export type CanvasAnimation = 'idle' | 'walk' | 'jump' | 'hurt';

export class CharacterRenderer {
  private image: HTMLImageElement;
  private isLoaded = false;
  private loadPromise: Promise<void>;

  constructor() {
    this.image = new Image();
    this.loadPromise = new Promise((resolve, reject) => {
      this.image.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      this.image.onerror = () => reject(new Error('Failed to load sprite sheet'));
    });
    this.image.src = SPRITE_SHEET.url;
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
    if (!this.isLoaded) return;

    const character = getCharacter(characterId);
    if (!character) return;

    const { bounds } = character;
    const aspect = bounds.width / bounds.height;
    const width = height * aspect;

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
    ctx.imageSmoothingEnabled = false;

    ctx.translate(x + width / 2, y + height / 2 + offsetY);
    ctx.rotate(rotation);
    ctx.scale(scaleX * (flipX ? -1 : 1), scaleY);
    ctx.translate(-width / 2, -height / 2);

    ctx.drawImage(
      this.image,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      width,
      height
    );
    ctx.restore();
  }

  /** 캐릭터의 종횡비(width/height)를 반환 — 충돌 박스 계산 등에 사용 */
  getAspectRatio(characterId: string): number {
    const character = getCharacter(characterId);
    if (!character) return 1;
    return character.bounds.width / character.bounds.height;
  }
}
