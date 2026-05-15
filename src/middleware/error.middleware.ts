import type { Request, Response } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response): void => {
    res.status(500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

export default errorHandler;
