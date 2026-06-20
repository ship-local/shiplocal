/** `core` = tunnel engine (public OSS). `cloud` = full SaaS including feedback overlay. */
export type ShipLocalEdition = 'core' | 'cloud';

export function getEdition(): ShipLocalEdition {
  const value = process.env['SHIPLOCAL_EDITION'] ?? 'cloud';
  return value === 'core' ? 'core' : 'cloud';
}

export function isCloudEdition(): boolean {
  return getEdition() === 'cloud';
}

export function isCoreEdition(): boolean {
  return getEdition() === 'core';
}
