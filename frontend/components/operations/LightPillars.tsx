'use client';

export default function LightPillars() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated light pillars */}
      <div className="absolute inset-0">
        {/* Pillar 1 - Left side */}
        <div 
          className="absolute top-0 bottom-0 w-[200px] opacity-30"
          style={{
            left: '10%',
            background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(99, 102, 241, 0) 100%)',
            filter: 'blur(60px)',
            animation: 'pillarPulse 8s ease-in-out infinite',
            animationDelay: '0s'
          }}
        />
        
        {/* Pillar 2 - Center left */}
        <div 
          className="absolute top-0 bottom-0 w-[250px] opacity-25"
          style={{
            left: '30%',
            background: 'linear-gradient(to bottom, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(139, 92, 246, 0) 100%)',
            filter: 'blur(80px)',
            animation: 'pillarPulse 10s ease-in-out infinite',
            animationDelay: '2s'
          }}
        />
        
        {/* Pillar 3 - Center */}
        <div 
          className="absolute top-0 bottom-0 w-[180px] opacity-20"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(to bottom, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(168, 85, 247, 0) 100%)',
            filter: 'blur(70px)',
            animation: 'pillarPulse 12s ease-in-out infinite',
            animationDelay: '4s'
          }}
        />
        
        {/* Pillar 4 - Center right */}
        <div 
          className="absolute top-0 bottom-0 w-[220px] opacity-25"
          style={{
            right: '25%',
            background: 'linear-gradient(to bottom, rgba(79, 70, 229, 0.3) 0%, rgba(79, 70, 229, 0.1) 50%, rgba(79, 70, 229, 0) 100%)',
            filter: 'blur(75px)',
            animation: 'pillarPulse 9s ease-in-out infinite',
            animationDelay: '1s'
          }}
        />
        
        {/* Pillar 5 - Right side */}
        <div 
          className="absolute top-0 bottom-0 w-[190px] opacity-30"
          style={{
            right: '8%',
            background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0.1) 50%, rgba(99, 102, 241, 0) 100%)',
            filter: 'blur(65px)',
            animation: 'pillarPulse 11s ease-in-out infinite',
            animationDelay: '3s'
          }}
        />

        {/* Additional subtle pillars for depth */}
        <div 
          className="absolute top-0 bottom-0 w-[150px] opacity-15"
          style={{
            left: '20%',
            background: 'linear-gradient(to bottom, rgba(147, 51, 234, 0.2) 0%, rgba(147, 51, 234, 0.05) 50%, rgba(147, 51, 234, 0) 100%)',
            filter: 'blur(90px)',
            animation: 'pillarPulse 13s ease-in-out infinite',
            animationDelay: '5s'
          }}
        />
        
        <div 
          className="absolute top-0 bottom-0 w-[160px] opacity-15"
          style={{
            right: '15%',
            background: 'linear-gradient(to bottom, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.05) 50%, rgba(124, 58, 237, 0) 100%)',
            filter: 'blur(85px)',
            animation: 'pillarPulse 14s ease-in-out infinite',
            animationDelay: '6s'
          }}
        />
      </div>

      {/* Radial gradient overlay for better blending */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(248, 250, 252, 0.3) 70%, rgba(248, 250, 252, 0.8) 100%)'
        }}
      />

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes pillarPulse {
          0%, 100% {
            opacity: 0.3;
            transform: translateY(0) scaleY(1);
          }
          25% {
            opacity: 0.4;
            transform: translateY(-20px) scaleY(1.05);
          }
          50% {
            opacity: 0.25;
            transform: translateY(0) scaleY(0.95);
          }
          75% {
            opacity: 0.35;
            transform: translateY(20px) scaleY(1.02);
          }
        }
      `}</style>
    </div>
  );
}
