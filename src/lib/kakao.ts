// Kakao JavaScript SDK 동적 로더
// - ShareButton에서 첫 마운트 시 prefetch, 클릭 시점에는 이미 로드돼 있어 즉시 호출
// - 결과 페이지 외에서는 SDK가 로드되지 않도록 layout이 아닌 컴포넌트에서 호출
const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
const KAKAO_SDK_INTEGRITY =
  'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka';

let loadingPromise: Promise<void> | null = null;

export function isKakaoConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
}

export function loadKakao(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if (window.Kakao?.isInitialized()) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<void>((resolve, reject) => {
    const initIfPossible = () => {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY 미설정'));
        return;
      }
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(key);
      }
      resolve();
    };

    if (window.Kakao) {
      initIfPossible();
      return;
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.integrity = KAKAO_SDK_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => initIfPossible();
    script.onerror = () => {
      loadingPromise = null;
      reject(new Error('Kakao SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}
