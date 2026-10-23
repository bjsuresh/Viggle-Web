/** Credit estimators (1 credit = $0.01) matching docs.viggle.ai/v1/pricing. */

export function h3VideoCredits(durationS: number, resolution: string): number {
  const perSec = resolution === '4k' ? 5 : 1;
  return Math.ceil(durationS) * perSec;
}

export function animationCredits(drivingSeconds: number): number {
  return Math.max(1, Math.ceil(drivingSeconds));
}

export function remixCredits(outputSeconds: number, characters = 1): number {
  return Math.max(1, Math.ceil(outputSeconds)) * characters;
}

export function upscaleCredits(sourceSeconds: number): number {
  return Math.max(1, Math.ceil(sourceSeconds));
}

export function imageCredits(n: number, resolution: string): number {
  return n * (resolution.toUpperCase() === '2K' ? 2 : 1);
}

export function characterCredits(type: string, enhance: boolean): number {
  if (type === 'render') return 1;
  const vsplat = enhance ? 30 : 25;
  return type === 'all' ? vsplat + 1 : vsplat;
}

export function motionCredits(type: string, sourceSeconds: number): number {
  if (type === 'render') return 0;
  return 5 * Math.max(1, Math.ceil(sourceSeconds));
}

export const TEXT_TO_MOTION_CREDITS = 10;
export const SCENE_PANO_CREDITS = 6;

export function usd(credits: number): string {
  return `$${(credits / 100).toFixed(2)}`;
}
