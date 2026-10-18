import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface TenantRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRole?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
        tenantId: string;
        sub: string;
        role: string;
      };
      req.tenantId = decoded.tenantId;
      req.userId = decoded.sub;
      req.userRole = decoded.role;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    next();
  }
}
