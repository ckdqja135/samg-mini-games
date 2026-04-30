import { ReactNode } from 'react';

interface MobileFrameProps {
  children: ReactNode;
  showStatusBar?: boolean;
}

export function MobileFrame({ children, showStatusBar = false }: MobileFrameProps) {
  return (
    <div className="min-h-screen flex justify-center items-stretch" style={{ background: 'var(--bg-gradient)' }}>
      <div className="w-full max-w-[480px] min-h-screen bg-cream/40 shadow-2xl relative overflow-hidden flex flex-col">
        {showStatusBar && (
          <div className="status-bar h-6 bg-soft-pink/40 flex items-center px-4 text-xs text-text-dark font-pixel">
            <span>9:41</span>
            <div className="flex-1" />
            <span>● ● ● 💗</span>
          </div>
        )}

        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
