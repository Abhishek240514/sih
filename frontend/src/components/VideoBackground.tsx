import { useRef, useEffect } from 'react';

interface VideoBackgroundProps {
  onVideoReady?: () => void;
}

export function VideoBackground({ onVideoReady }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      onVideoReady?.();
    };

    video.addEventListener('canplay', handleCanPlay);
    // Fallback if already cached/ready
    if (video.readyState >= 3) {
      onVideoReady?.();
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onVideoReady]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover opacity-90"
        src="https://strvid.nyc3.digitaloceanspaces.com/motionitems/source/1782066233149-motion_105.mp4"
      />
      {/* Top 50% gradient fade from brand-bg (#FAFAFA) to transparent to blend video smoothly into header */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#FAFAFA] via-[#FAFAFA]/70 to-transparent z-[1]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#FAFAFA] to-transparent z-[1]" />
    </div>
  );
}
