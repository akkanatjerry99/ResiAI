import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import AuditLog from '../models/AuditLog';

export const auditLog = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Store original send function
      const originalSend = res.json;

      // Override res.json to capture response
      res.json = function (data: any) {
        // Only log successful operations (2xx status)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Create audit log entry asynchronously (don't wait)
          if (req.user) {
            AuditLog.create({
              userId: req.user._id,
              userName: req.user.name,
              action,
              resource,
              resourceId: req.params.id || data?._id || data?.id,
              details: {
                method: req.method,
                path: req.path,
                body: sanitizeData(req.body),
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('user-agent'),
            }).catch(err => console.error('Audit log error:', err));
          }
        }

        // Call original send function
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Remove sensitive data before logging
function sanitizeData(data: any): any {
  if (!data) return data;
  
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'pin', 'nightPin', 'token'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}
