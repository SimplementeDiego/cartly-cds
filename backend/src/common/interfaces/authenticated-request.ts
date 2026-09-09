import { Role } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName?: string | null;
  role: Role;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  rawBody?: Buffer;
}
