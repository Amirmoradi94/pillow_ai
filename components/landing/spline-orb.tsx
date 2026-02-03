'use client';

import Spline from '@splinetool/react-spline';
import { useState } from 'react';

// Spline 3D scene URLs - public scenes
const SPLINE_SCENES = {
  // Gradient sphere with morphing effect
  gradientOrb: 'https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode',

  // Abstract 3D shapes
  abstractShapes: 'https://prod.spline.design/xMHaPDfzqkJjLRLy/scene.splinecode',

  // Glowing orb
  glowOrb: 'https://prod.spline.design/Fjt4qqF0YVa7xJjT/scene.splinecode',

  // AI assistant style orb
  aiOrb: 'https://prod.spline.design/WgASPlVJDg1u9VLq/scene.splinecode',
};

export type SplineVariant = keyof typeof SPLINE_SCENES;

interface SplineOrbProps {
  variant?: SplineVariant;
  className?: string;
}

export function SplineOrb({ variant = 'gradientOrb', className = '' }: SplineOrbProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sceneUrl = SPLINE_SCENES[variant];

  // Fallback to CSS orb if Spline fails
  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative h-64 w-64 md:h-80 md:w-80">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600 animate-pulse" />
          <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-48 w-48 md:h-64 md:w-64 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 md:h-80 md:w-80 rounded-full bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-900 animate-pulse" />
        </div>
      )}

      {/* Spline 3D Scene */}
      <div className="h-64 w-64 md:h-80 md:w-80 lg:h-96 lg:w-96 relative z-10">
        <Spline
          scene={sceneUrl}
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

export const SPLINE_VARIANTS = Object.keys(SPLINE_SCENES) as SplineVariant[];
