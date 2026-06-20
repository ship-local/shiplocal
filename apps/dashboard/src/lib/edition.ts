/** Client-side edition flag — must match server `SHIPLOCAL_EDITION`. */
export type ShipLocalEdition = 'core' | 'cloud';

export function getEdition(): ShipLocalEdition {
  const value = process.env.NEXT_PUBLIC_SHIPLOCAL_EDITION ?? 'cloud';
  return value === 'core' ? 'core' : 'cloud';
}

export function isCloudEdition(): boolean {
  return getEdition() === 'cloud';
}
