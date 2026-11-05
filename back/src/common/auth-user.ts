import { Role } from '@prisma/client';

/** The authenticated user, as decoded from the access token. */
export interface AuthUser {
  id: string;
  organizationId: string;
  role: Role;
  /** True when the user belongs to the demo organization. */
  isDemo: boolean;
}

export interface AccessTokenPayload {
  sub: string;
  org: string;
  role: Role;
  demo: boolean;
}
