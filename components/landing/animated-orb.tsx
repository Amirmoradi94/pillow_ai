'use client';

export function AnimatedOrb() {
  return (
    <div className="relative h-64 w-64 md:h-80 md:w-80 lg:h-96 lg:w-96">
      {/* Outer ambient glow */}
      <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 blur-3xl animate-pulse" />

      {/* Main orb container - glass sphere effect */}
      <div className="relative h-full w-full rounded-full overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(30, 41, 59, 0.8) 0%, rgba(2, 6, 23, 0.95) 50%, rgba(0, 0, 0, 1) 100%)',
          boxShadow: '0 0 60px rgba(56, 189, 248, 0.3), inset 0 0 80px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Sphere edge glow - creates 3D depth */}
        <div className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 55%, rgba(6, 182, 212, 0.15) 70%, rgba(147, 51, 234, 0.1) 85%, transparent 100%)',
          }}
        />

        {/* Top reflection - glass effect */}
        <div className="absolute top-2 left-1/4 right-1/4 h-1/4 rounded-full opacity-40"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
            filter: 'blur(8px)',
          }}
        />

        {/* Rotating color blobs container 1 */}
        <div className="absolute inset-0 animate-spin-slow">
          {/* Blue blob */}
          <div className="absolute top-[20%] left-[25%] h-24 w-24 md:h-32 md:w-32 animate-morph"
            style={{
              background: 'radial-gradient(ellipse at 40% 40%, #3b82f6 0%, #0ea5e9 40%, #06b6d4 70%, transparent 100%)',
              filter: 'blur(4px)',
            }}
          />
        </div>

        {/* Rotating color blobs container 2 - opposite direction */}
        <div className="absolute inset-0 animate-spin-reverse">
          {/* Orange-pink gradient blob */}
          <div className="absolute bottom-[15%] right-[20%] h-20 w-28 md:h-28 md:w-36 animate-morph"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, #f97316 0%, #ec4899 50%, #d946ef 80%, transparent 100%)',
              filter: 'blur(6px)',
              animationDelay: '-3s',
            }}
          />
        </div>

        {/* Floating elements */}
        <div className="absolute inset-0 animate-float">
          {/* Yellow-orange accent */}
          <div className="absolute top-[35%] right-[30%] h-16 w-16 md:h-20 md:w-20"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, #fbbf24 0%, #f97316 60%, transparent 100%)',
              filter: 'blur(4px)',
              borderRadius: '40% 60% 55% 45% / 55% 45% 60% 40%',
            }}
          />
        </div>

        <div className="absolute inset-0 animate-float-delayed">
          {/* Pink-magenta accent */}
          <div className="absolute bottom-[30%] left-[25%] h-14 w-14 md:h-20 md:w-20"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, #ec4899 0%, #d946ef 60%, transparent 100%)',
              filter: 'blur(5px)',
              borderRadius: '55% 45% 40% 60% / 45% 55% 60% 40%',
            }}
          />
        </div>

        {/* Center glow - core energy */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 md:h-16 md:w-16 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.8) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
        </div>

        {/* Crossing orbital ring effect */}
        <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '25s' }}>
          <div className="absolute top-1/2 left-0 right-0 h-px opacity-20"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), transparent)',
              transform: 'rotate(30deg)',
            }}
          />
        </div>

        {/* Inner sphere border - subtle */}
        <div className="absolute inset-4 rounded-full border border-white/5" />
      </div>

      {/* Outer ring glow */}
      <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-pulse" />

      {/* Floating particles around orb */}
      <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '30s' }}>
        <div className="absolute -top-2 left-1/2 h-2 w-2 rounded-full bg-cyan-400/80 blur-[2px]" />
        <div className="absolute -bottom-1 right-1/4 h-1.5 w-1.5 rounded-full bg-pink-400/80 blur-[1px]" />
        <div className="absolute top-1/4 -right-1 h-1.5 w-1.5 rounded-full bg-yellow-400/80 blur-[1px]" />
        <div className="absolute bottom-1/4 -left-1 h-1 w-1 rounded-full bg-purple-400/80 blur-[1px]" />
      </div>
    </div>
  );
}
