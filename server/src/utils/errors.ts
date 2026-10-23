import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', err);

  let statusCode = err.statusCode || (err.status ? err.status : 500);
  let message = err.message || 'Internal server error';

  // Sanitize Prisma errors so raw DB schema/stack traces are never exposed to the client
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : (err.meta?.target || 'field');
      message = `A record with this ${target} already exists.`;
    } else {
      statusCode = 400;
      message = 'Database operation failed. Please verify your request.';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      details: err.details || null,
    },
  });
}
