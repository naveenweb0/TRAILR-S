import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/errors.js';

export interface AuthRequest extends Request {
  user?: TokenPayload;
  schoolId?: string;
  destinationId?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing or invalid Bearer token.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;

    // Check active status in database and enforce server-authoritative role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        schoolStaff: true,
        destinationStaff: true,
      },
    });

    if (!user || !user.isActive) {
      return next(new AppError('User account not found or deactivated.', 401));
    }

    // Server-authoritative: always enforce role directly from database
    req.user.role = user.role;
    req.user.email = user.email;

    if (user.schoolStaff.length > 0) {
      req.schoolId = user.schoolStaff[0].schoolId;
    }
    if (user.destinationStaff.length > 0) {
      req.destinationId = user.destinationStaff[0].destinationId;
    }

    next();
  } catch (err: any) {
    return next(new AppError('Invalid or expired authentication token.', 401));
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Access forbidden. Required role: ${allowedRoles.join(' or ')}`, 403));
    }

    next();
  };
}

export async function logAudit(userId: string | null, action: string, entityType: string, entityId?: string, details?: string, ipAddress?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}
