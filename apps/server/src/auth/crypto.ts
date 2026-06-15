import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const API_TOKEN_PREFIX = 'sl_';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiTokenValue(): string {
  return `${API_TOKEN_PREFIX}${randomBytes(32).toString('hex')}`;
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getApiTokenPrefix(token: string): string {
  return token.slice(0, 12);
}

export function isApiToken(value: string): boolean {
  return value.startsWith(API_TOKEN_PREFIX);
}
