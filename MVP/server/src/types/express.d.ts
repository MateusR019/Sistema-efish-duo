import type { UserRecord } from '.';

declare global {
  namespace Express {
    interface Request {
      currentUser?: Omit<UserRecord, 'passwordHash'>;
      authUserId?: string;
    }
  }
}

export {};
