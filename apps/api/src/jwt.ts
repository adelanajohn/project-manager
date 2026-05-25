import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@pm/shared';
import { env } from './env.js';

const privateKey = Buffer.from(env.JWT_PRIVATE_KEY, 'base64').toString('utf-8');
const publicKey = Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf-8');

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: env.JWT_ACCESS_EXPIRY as string,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
