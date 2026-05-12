// Kakao JavaScript SDK 최소 타입 — 점수 공유(Share.sendDefault)에 필요한 표면만 선언
// 전체 타입이 필요해지면 @types/kakao-js-sdk 도입 검토
interface KakaoFeedContent {
  title: string;
  description?: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  link: KakaoLink;
}

interface KakaoLink {
  mobileWebUrl?: string;
  webUrl?: string;
}

interface KakaoButton {
  title: string;
  link: KakaoLink;
}

interface KakaoShareDefaultOptions {
  objectType: 'feed';
  content: KakaoFeedContent;
  buttons?: KakaoButton[];
  installTalk?: boolean;
}

interface KakaoSDK {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share?: {
    sendDefault: (options: KakaoShareDefaultOptions) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

export {};
