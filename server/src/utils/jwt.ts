import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'schooldest_super_secure_jwt_secret_key_2026_enterprise_level';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  schoolId?: string;
  destinationId?: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function generatePasswordResetToken(payload: { userId: string; email: string }): string {
  return jwt.sign({ ...payload, type: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
}

export function verifyPasswordResetToken(token: string): { userId: string; email: string; type: string } {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  if (!decoded || decoded.type !== 'password_reset') {
    throw new Error('Invalid password reset token format.');
  }
  return decoded;
}
