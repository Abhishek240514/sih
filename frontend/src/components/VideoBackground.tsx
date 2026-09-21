import { useEffect } from 'react';

interface VideoBackgroundProps {
  onVideoReady?: () => void;
}

/**
 * Offline-compatible animated background.
 * Replaces external CDN video with CSS animations.
 * No network dependencies.
 */
export function VideoBackground({ onVideoReady }: VideoBackgroundProps) {
  useEffect(() => {
    // Simulate ready state immediately for offline operation
    const timer = setTimeout(() => {
      onVideoReady?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [onVideoReady]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* Animated gradient background - fully offline */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAFA] via-[#F5F0EB] to-[#E8E0D8] animate-gradient" />
      
      {/* Subtle geometric pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `
        radial-gradient(circle at 20% 80%, #D4AF37 1px, transparent 1px),
        radial-gradient(circle at 80% 20%, #D4AF37 1px, transparent 1px),
        radial-gradient(circle at 40% 40%, #D4AF37 1px, transparent 1px)
      `, backgroundSize: '60px 60px' }} />
      
      {/* Floating orbs for depth */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-transparent blur-3xl animate-float-1" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-bl from-[#D4AF37]/15 to-transparent blur-3xl animate-float-2" />
      <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full bg-gradient-to-r from-[#D4AF37]/10 to-transparent blur-3xl animate-float-3" />
      
      {/* Top/bottom gradient fades for content blending */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#FAFAFA] via-[#FAFAFA]/70 to-transparent z-[1]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#FAFAFA] to-transparent z-[1]" />
    </div>
  );
}