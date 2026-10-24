import { User } from '../types/index.js';

/**
 * Determines the single, deterministic post-login redirect path for a user based on:
 * 1. Role (SUPER_ADMIN -> /admin)
 * 2. Organization Association & Approval Status (School -> /school or /school/onboard; Destination -> /destination or /destination/onboard)
 * 3. Incomplete Onboarding (portalType -> /school/onboard or /destination/onboard)
 * 4. First-time User with no portal assignment -> /choose-portal
 */
export function getPostLoginRedirect(user: User | null, storedRedirect?: string | null): string {
  if (!user) {
    return '/login';
  }

  // 0. Stored invitation acceptance landing URL takes absolute priority
  if (storedRedirect && storedRedirect.startsWith('/admin/accept-invite')) {
    return storedRedirect;
  }

  // 1. Super Admin
  if (user.role === 'SUPER_ADMIN') {
    if (storedRedirect && storedRedirect.startsWith('/admin')) {
      return storedRedirect;
    }
    return '/admin';
  }

  // 2. School Association
  if (user.school) {
    if (user.school.verificationStatus === 'VERIFIED') {
      if (storedRedirect && storedRedirect.startsWith('/school') && storedRedirect !== '/school/onboard') {
        return storedRedirect;
      }
      return '/school';
    }
    // Awaiting review (PENDING or REJECTED) -> redirect to application review screen
    return '/school/onboard';
  }

  // 3. Destination Association
  if (user.destination) {
    if (user.destination.status === 'PUBLISHED') {
      if (storedRedirect && storedRedirect.startsWith('/destination') && storedRedirect !== '/destination/onboard') {
        return storedRedirect;
      }
      return '/destination';
    }
    // Awaiting review (PENDING_APPROVAL, DRAFT, etc.) -> redirect to proposal review screen
    return '/destination/onboard';
  }

  // 4. Incomplete Onboarding: user has locked in a portalType but hasn't completed onboarding
  if (user.portalType === 'SCHOOL') {
    return '/school/onboard';
  }
  if (user.portalType === 'DESTINATION') {
    return '/destination/onboard';
  }

  // 5. Genuinely new user with no portal assignment
  return '/choose-portal';
}
