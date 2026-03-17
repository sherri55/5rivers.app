import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(message, 404, 'NOT_FOUND');
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(message, 403, 'FORBIDDEN');
}

export function badRequest(message = 'Bad request'): AppError {
  return new AppError(message, 400, 'BAD_REQUEST');
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const message =
    statusCode === 500 && config.isProduction
      ? 'Internal server error'
      : err.message;

  res.status(statusCode).json({ error: { code, message } });
}
