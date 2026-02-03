'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

// Verified working Lottie animation URLs for AI/Voice themes
const ANIMATION_OPTIONS = {
  // AI Voice Assistant - colorful orb
  voiceAssistant: 'https://assets10.lottiefiles.com/packages/lf20_xvrofzfk.json',

  // AI Brain/Tech sphere
  aiBrain: 'https://assets3.lottiefiles.com/packages/lf20_fcfjwiyb.json',

  // Glowing pulse orb
  pulseOrb: 'https://assets8.lottiefiles.com/packages/lf20_kuoftusg.json',

  // Sound wave / voice visualization
  soundWave: 'https://assets4.lottiefiles.com/packages/lf20_HpFqiS.json',

  // Modern AI assistant
  modernAi: 'https://assets2.lottiefiles.com/packages/lf20_kkflmtur.json',

  // Gradient sphere
  gradientSphere: 'https://assets7.lottiefiles.com/packages/lf20_kyu7xb1v.json',

  // Tech loading orb
  techOrb: 'https://assets9.lottiefiles.com/packages/lf20_myejiggj.json',

  // Simple voice waves
  voiceWaves: 'https://assets1.lottiefiles.com/packages/lf20_gse4dqdb.json',
};

export type AnimationVariant = keyof typeof ANIMATION_OPTIONS;

interface LottieOrbProps {
  variant?: AnimationVariant;
  className?: string;
}

export function LottieOrb({ variant = 'voiceAssistant', className = '' }: LottieOrbProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = ANIMATION_OPTIONS[variant];
    setLoading(true);
    setError(false);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setAnimationData(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [variant]);

  // Fallback gradient orb if animation fails
  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative h-64 w-64 md:h-80 md:w-80">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600 animate-pulse opacity-80" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 animate-spin-slow" style={{ animationDuration: '8s' }} />
          <div className="absolute inset-8 rounded-full bg-gradient-to-r from-sky-300 to-blue-400 animate-pulse" />
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || !animationData) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="h-64 w-64 md:h-80 md:w-80 rounded-full bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Ambient glow behind the animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-48 w-48 md:h-64 md:w-64 rounded-full bg-sky-500/20 blur-3xl animate-pulse" />
      </div>

      <Lottie
        animationData={animationData}
        loop={true}
        className="h-64 w-64 md:h-80 md:w-80 lg:h-96 lg:w-96 relative z-10"
      />
    </div>
  );
}

// Export available variants for easy switching
export const LOTTIE_VARIANTS = Object.keys(ANIMATION_OPTIONS) as AnimationVariant[];
