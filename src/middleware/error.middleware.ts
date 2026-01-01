import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Erros conhecidos
  if (err.message === 'Invalid credentials') {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  if (err.message === 'Email already registered') {
    return res.status(409).json({
      success: false,
      message: 'Email already registered',
    });
  }

  if (err.message === 'Project not found' || err.message === 'User not found') {
    return res.status(404).json({
      success: false,
      message: err.message,
    });
  }

  if (err.message === 'Unauthorized') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  // Erro genérico
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};
