import { useState, useEffect } from "react";

export function useLivePulse(isLive: boolean) {
  const [pulseProgress, setPulseProgress] = useState(0);

  useEffect(() => {
    if (!isLive) {
      setPulseProgress(0);
      return;
    }

    let startTime: number | null = null;
    const duration = 1800;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % duration;
      setPulseProgress(elapsed / duration);
      rafId = requestAnimationFrame(animate);
    };

    let rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isLive]);

  return pulseProgress;
}
