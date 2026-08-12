export function getRingStyle(pulseProgress: number, offset: number) {
  const t = (pulseProgress - offset + 1) % 1;
  const scale = 1 + t * 0.7;
  const opacity = 1 - t;
  return {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    boxShadow: '0 0 0 2px rgba(255, 102, 153, 0.9)',
    transform: `scale(${scale})`,
    opacity,
    pointerEvents: 'none' as const,
    boxSizing: 'border-box' as const,
  };
}
