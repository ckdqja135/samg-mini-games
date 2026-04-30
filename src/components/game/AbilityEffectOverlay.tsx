'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGamePlayStore } from '@/store/gameStore';

export function AbilityEffectOverlay() {
  const comboCount = useGamePlayStore((s) => s.comboCount);
  const recentEffectMessages = useGamePlayStore((s) => s.recentEffectMessages);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {comboCount >= 3 && (
          <motion.div
            key={`combo-${comboCount}`}
            className="absolute top-24 right-4 text-center font-pixel"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <span
              className="block text-4xl font-black leading-none"
              style={{
                color: '#FFB800',
                WebkitTextStroke: '2px #4A3B52',
                textShadow:
                  '2px 2px 0 #4A3B52, -1px -1px 0 #4A3B52, 1px -1px 0 #4A3B52, -1px 1px 0 #4A3B52',
              }}
            >
              {comboCount}
            </span>
            <span
              className="block text-xs font-bold mt-1"
              style={{
                color: '#FF6B6B',
                textShadow: '1px 1px 0 #FFFFFF',
              }}
            >
              COMBO!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recentEffectMessages.map((msg, i) => (
          <motion.div
            key={`${msg}-${i}`}
            className="absolute left-1/2 top-1/2 font-pixel text-xl font-bold whitespace-nowrap"
            style={{
              transform: 'translateX(-50%)',
              color: '#FFD700',
              textShadow:
                '2px 2px 0 #4A3B52, -2px -2px 0 #4A3B52, 2px -2px 0 #4A3B52, -2px 2px 0 #4A3B52',
            }}
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -80, opacity: 1, scale: 1.15 }}
            exit={{ y: -120, opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            {msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
