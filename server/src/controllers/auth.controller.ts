import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { generateToken, generatePasswordResetToken, verifyPasswordResetToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';
import { AuthRequest, logAudit } from '../middleware/auth.js';
import { Role, VerificationStatus, DestinationStatus, PortalType, Prisma, SuperAdminInvitationStatus } from '@prisma/client';
import { verifyFirebaseToken } from '../utils/firebase.js';
import { verifyNeonAuthToken } from '../utils/neonAuth.js';

const userStaffInclude = {
  schoolStaff: { include: { school: true } },
  destinationStaff: { include: { destination: true } },
};

/**
 * Deterministically resolve an existing user or create a new one for Neon Auth.
 * Handles exact Neon Auth ID lookup, case-insensitive email fallback, safe account linking,
 * Super Admin strict isolation, and P2002 race-condition concurrency resolution.
 */
async function resolveOrCreateNeonUser(verified: {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
}) {
  const normalizedEmail = (verified.email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    throw new AppError('Verified email is missing from authentication credentials.', 400);
  }

  // Check if an active PENDING Super Admin invitation exists for this verified email
  const pendingInvitation = await prisma.superAdminInvitation.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
      status: SuperAdminInvitationStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 1. Primary lookup strictly by verified Neon Auth ID
  let user = await prisma.user.findUnique({
    where: { neonAuthId: verified.id },
    include: userStaffInclude,
  });

  if (user) {
    if (!user.isActive) {
      throw new AppError('Account has been suspended. Please contact platform administration.', 403);
    }

    // If an active pending invitation exists for this verified identity, promote to SUPER_ADMIN atomically
    if (pendingInvitation) {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.superAdminInvitation.updateMany({
          where: {
            id: pendingInvitation.id,
            status: SuperAdminInvitationStatus.PENDING,
            expiresAt: { gt: new Date() },
          },
          data: {
            status: SuperAdminInvitationStatus.ACCEPTED,
            acceptedById: user!.id,
          },
        });
        if (claimed.count > 0) {
          user = await tx.user.update({
            where: { id: user!.id },
            data: {
              role: Role.SUPER_ADMIN,
              lastLoginAt: new Date(),
              name: verified.name && (!user!.name || user!.name === 'Neon User' || user!.name === 'Google User') ? verified.name : user!.name,
            },
            include: userStaffInclude,
          });
          await logAudit(user!.id, 'SUPER_ADMIN_INVITATION_ACCEPTED', 'SuperAdminInvitation', pendingInvitation.id, `Super Admin invitation accepted via Google sign-in by ${normalizedEmail}`);
          await logAudit(user!.id, 'SUPER_ADMIN_PRIVILEGE_GRANTED', 'User', user!.id, `Super Admin role granted to ${normalizedEmail}`);
        }
      });
      return user!;
    }

    // If an accepted invitation exists for this user, restore SUPER_ADMIN role
    const acceptedInvitation = await prisma.superAdminInvitation.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        status: SuperAdminInvitationStatus.ACCEPTED,
        acceptedById: user.id,
      },
    });
    if (acceptedInvitation && user.role !== Role.SUPER_ADMIN) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: Role.SUPER_ADMIN,
          lastLoginAt: new Date(),
          name: verified.name && (!user.name || user.name === 'Neon User' || user.name === 'Google User') ? verified.name : user.name,
        },
        include: userStaffInclude,
      });
      return user;
    }

    // Security Check: If Super Admin, enforce email matching with authorized record
    if (user.role === Role.SUPER_ADMIN && user.email.toLowerCase().trim() !== normalizedEmail) {
      throw new AppError('Super Admin identity mismatch. Authorized email does not match authenticated token.', 403);
    }

    // Update last login timestamp and display name if needed
    return await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        name: verified.name && (!user.name || user.name === 'Neon User' || user.name === 'Google User') ? verified.name : user.name,
      },
      include: userStaffInclude,
    });
  }

  // 2. Not found by neonAuthId. Check if an account exists by email (case-insensitive)
  const existingByEmail = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
    },
    include: userStaffInclude,
  });

  if (existingByEmail) {
    // If pending invitation exists:
    if (pendingInvitation) {
      let acceptedUser: any;
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.superAdminInvitation.updateMany({
          where: {
            id: pendingInvitation.id,
            status: SuperAdminInvitationStatus.PENDING,
            expiresAt: { gt: new Date() },
          },
          data: {
            status: SuperAdminInvitationStatus.ACCEPTED,
            acceptedById: existingByEmail.id,
          },
        });
        if (claimed.count > 0) {
          acceptedUser = await tx.user.update({
            where: { id: existingByEmail.id },
            data: {
              role: Role.SUPER_ADMIN,
              neonAuthId: verified.id,
              email: normalizedEmail,
              emailVerified: true,
              lastLoginAt: new Date(),
              name: existingByEmail.name || verified.name,
            },
            include: userStaffInclude,
          });
          await logAudit(existingByEmail.id, 'SUPER_ADMIN_INVITATION_ACCEPTED', 'SuperAdminInvitation', pendingInvitation.id, `Super Admin invitation accepted via Google sign-in by ${normalizedEmail}`);
          await logAudit(existingByEmail.id, 'SUPER_ADMIN_PRIVILEGE_GRANTED', 'User', existingByEmail.id, `Super Admin role granted to ${normalizedEmail}`);
        }
      });
      if (acceptedUser) return acceptedUser;
    }

    // If an accepted invitation exists for this existing email, restore SUPER_ADMIN role
    const acceptedInvByEmail = await prisma.superAdminInvitation.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        status: SuperAdminInvitationStatus.ACCEPTED,
        acceptedById: existingByEmail.id,
      },
    });
    if (acceptedInvByEmail && existingByEmail.role !== Role.SUPER_ADMIN) {
      return await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          role: Role.SUPER_ADMIN,
          neonAuthId: verified.id,
          email: normalizedEmail,
          emailVerified: true,
          lastLoginAt: new Date(),
          name: existingByEmail.name || verified.name,
        },
        include: userStaffInclude,
      });
    }

    // SECURITY INVARIANT 1: SUPER_ADMIN MUST NEVER be linked implicitly via email match without a valid invitation.
    if (existingByEmail.role === Role.SUPER_ADMIN) {
      throw new AppError(
        'Super Administrator accounts cannot be linked automatically via email. The platform owner must explicitly provision the verified Neon Auth ID in Neon PostgreSQL.',
        403
      );
    }

    // SECURITY INVARIANT 2: Never overwrite an existing, different Neon Auth ID
    if (existingByEmail.neonAuthId && existingByEmail.neonAuthId !== verified.id) {
      throw new AppError(
        'This email account is already associated with a different authenticated identity. Contact platform administration for assistance.',
        409
      );
    }

    // SECURITY INVARIANT 3: Only link if Google email is verified by identity provider
    if (verified.emailVerified === false) {
      throw new AppError('Account email is not verified by authentication provider. Cannot link account.', 401);
    }

    if (!existingByEmail.isActive) {
      throw new AppError('Account has been suspended. Please contact platform administration.', 403);
    }

    // Safe link for pre-existing standard school / venue coordinator
    return await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        neonAuthId: verified.id,
        email: normalizedEmail,
        lastLoginAt: new Date(),
        name: existingByEmail.name || verified.name,
        emailVerified: true,
      },
      include: userStaffInclude,
    });
  }

  // 3. Brand new user:
  // If an active pending Super Admin invitation exists:
  if (pendingInvitation) {
    let newAdmin: any;
    await prisma.$transaction(async (tx) => {
      newAdmin = await tx.user.create({
        data: {
          email: normalizedEmail,
          neonAuthId: verified.id,
          name: verified.name || 'Super Admin',
          role: Role.SUPER_ADMIN,
          isActive: true,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
        include: userStaffInclude,
      });

      await tx.superAdminInvitation.updateMany({
        where: {
          id: pendingInvitation.id,
          status: SuperAdminInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: SuperAdminInvitationStatus.ACCEPTED,
          acceptedById: newAdmin.id,
        },
      });

      await logAudit(newAdmin.id, 'SUPER_ADMIN_INVITATION_ACCEPTED', 'SuperAdminInvitation', pendingInvitation.id, `Super Admin invitation accepted via Google sign-in by ${normalizedEmail}`);
      await logAudit(newAdmin.id, 'SUPER_ADMIN_PRIVILEGE_GRANTED', 'User', newAdmin.id, `Super Admin role granted to brand new user ${normalizedEmail}`);
    });
    if (newAdmin) return newAdmin;
  }

  // Otherwise strictly default to SCHOOL_STAFF, NEVER SUPER_ADMIN
  try {
    return await prisma.user.create({
      data: {
        email: normalizedEmail,
        neonAuthId: verified.id,
        name: verified.name || 'Google User',
        role: Role.SCHOOL_STAFF,
        isActive: true,
        emailVerified: verified.emailVerified ?? true,
        lastLoginAt: new Date(),
      },
      include: userStaffInclude,
    });
  } catch (createErr: any) {
    // Catch Prisma P2002 on concurrent first-time logins and safely re-resolve
    if (
      createErr?.code === 'P2002' ||
      (createErr instanceof Prisma.PrismaClientKnownRequestError && createErr.code === 'P2002')
    ) {
      const reResolved = await prisma.user.findFirst({
        where: {
          OR: [
            { neonAuthId: verified.id },
            { email: { equals: normalizedEmail, mode: 'insensitive' } },
          ],
        },
        include: userStaffInclude,
      });

      if (reResolved) {
        if (!reResolved.isActive) {
          throw new AppError('Account has been suspended. Please contact platform administration.', 403);
        }

        if (reResolved.role === Role.SUPER_ADMIN) {
          if (reResolved.neonAuthId !== verified.id) {
            throw new AppError(
              'Super Administrator accounts cannot be linked automatically via email. The platform owner must explicitly provision the verified Neon Auth ID in Neon PostgreSQL.',
              403
            );
          }
          if (reResolved.email.toLowerCase().trim() !== normalizedEmail) {
            throw new AppError('Super Admin identity mismatch. Authorized email does not match authenticated token.', 403);
          }
        }

        if (reResolved.neonAuthId === verified.id) {
          return await prisma.user.update({
            where: { id: reResolved.id },
            data: { lastLoginAt: new Date() },
            include: userStaffInclude,
          });
        }

        if (!reResolved.neonAuthId) {
          if (verified.emailVerified === false) {
            throw new AppError('Account email is not verified by authentication provider. Cannot link account.', 401);
          }
          return await prisma.user.update({
            where: { id: reResolved.id },
            data: {
              neonAuthId: verified.id,
              email: normalizedEmail,
              lastLoginAt: new Date(),
            },
            include: userStaffInclude,
          });
        }

        throw new AppError(
          'This email account is already associated with a different authenticated identity. Contact platform administration for assistance.',
          409
        );
      }
    }
    throw createErr;
  }
}

/**
 * Deterministically resolve an existing user or create a new one for Firebase Auth.
 * Handles exact Firebase UID lookup, case-insensitive email fallback, safe account linking,
 * Super Admin strict isolation, and P2002 race-condition concurrency resolution.
 */
async function resolveOrCreateFirebaseUser(verified: {
  uid: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
}) {
  const normalizedEmail = (verified.email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    throw new AppError('Verified email is required from authentication provider.', 400);
  }

  // Check if an active PENDING Super Admin invitation exists for this verified email
  const pendingInvitation = await prisma.superAdminInvitation.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
      status: SuperAdminInvitationStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 1. Primary lookup strictly by verified Firebase UID
  let user = await prisma.user.findUnique({
    where: { firebaseUid: verified.uid },
    include: userStaffInclude,
  });

  if (user) {
    if (!user.isActive) {
      throw new AppError('Account has been suspended. Please contact platform administration.', 403);
    }

    if (pendingInvitation) {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.superAdminInvitation.updateMany({
          where: {
            id: pendingInvitation.id,
            status: SuperAdminInvitationStatus.PENDING,
            expiresAt: { gt: new Date() },
          },
          data: {
            status: SuperAdminInvitationStatus.ACCEPTED,
            acceptedById: user!.id,
          },
        });
        if (claimed.count > 0) {
          user = await tx.user.update({
            where: { id: user!.id },
            data: {
              role: Role.SUPER_ADMIN,
              lastLoginAt: new Date(),
              name: verified.name && (!user!.name || user!.name === 'Google User') ? verified.name : user!.name,
            },
            include: userStaffInclude,
          });
          await logAudit(user!.id, 'SUPER_ADMIN_INVITATION_ACCEPTED', 'SuperAdminInvitation', pendingInvitation.id, `Super Admin invitation accepted via Firebase Google sign-in by ${normalizedEmail}`);
          await logAudit(user!.id, 'SUPER_ADMIN_PRIVILEGE_GRANTED', 'User', user!.id, `Super Admin role granted to ${normalizedEmail}`);
        }
      });
      return user!;
    }

    if (user.role === Role.SUPER_ADMIN && user.email.toLowerCase().trim() !== normalizedEmail) {
      throw new AppError('Super Admin identity mismatch. Authorized email does not match authenticated token.', 403);
    }

    return await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        name: verified.name && (!user.name || user.name === 'Google User') ? verified.name : user.name,
      },
      include: userStaffInclude,
    });
  }

  // 2. Not found by firebaseUid. Check if account exists by email
  const existingByEmail = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
    },
    include: userStaffInclude,
  });

  if (existingByEmail) {
    if (pendingInvitation) {
      let acceptedUser: any;
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.superAdminInvitation.updateMany({
          where: {
            id: pendingInvitation.id,
            status: SuperAdminInvitationStatus.PENDING,
            expiresAt: { gt: new Date() },
          },
          data: {
            status: SuperAdminInvitationStatus.ACCEPTED,
            acceptedById: existingByEmail.id,
          },
        });
        if (claimed.count > 0) {
          acceptedUser = await tx.user.update({
            where: { id: existingByEmail.id },
            data: {
              role: Role.SUPER_ADMIN,
              firebaseUid: verified.uid,
              email: normalizedEmail,
              emailVerified: true,
              lastLoginAt: new Date(),
              name: existingByEmail.name || verified.name,
            },
            include: userStaffInclude,
          });
          await logAudit(existingByEmail.id, 'SUPER_ADMIN_INVITATION_ACCEPTED', 'SuperAdminInvitation', pendingInvitation.id, `Super Admin invitation accepted via Firebase Google sign-in by ${normalizedEmail}`);
          await logAudit(existingByEmail.id, 'SUPER_ADMIN_PRIVILEGE_GRANTED', 'User', existingByEmail.id, `Super Admin role granted to ${normalizedEmail}`);
        }
      });
      if (acceptedUser) return acceptedUser;
    }

    if (existingByEmail.role === Role.SUPER_ADMIN) {
      throw new AppError(
        'Super Administrator accounts cannot be linked automatically via email. The platform owner must explicitly provision the verified Firebase UID in Neon PostgreSQL.',
        403
      );
    }

    if (existingByEmail.firebaseUid && existingByEmail.firebaseUid !== verified.uid) {
      throw new AppError(
        'This email account is already associated with a different authenticated identity. Contact support.',
        409
      );
    }

    if (!verified.emailVerified) {
      throw new AppError('Google account email is not verified.', 401);
    }

    if (!existingByEmail.isActive) {
      throw new AppError('Account has been suspended. Please contact platform administration.', 403);
    }

    return await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        firebaseUid: verified.uid,
        email: normalizedEmail,
        lastLoginAt: new Date(),
        name: existingByEmail.name || verified.name,
      },
      include: userStaffInclude,
    });
  }

  // 3. Brand new user
  if (pendingInvitation) {
    let newAdmin: any;
    await prisma.$transaction(async (tx) => {
      newAdmin = await tx.user.create({
        data: {
          email: normalizedEmail,
          firebaseUid: verified.uid,
          name: verified.name || 'Super Admin',
          role: Role.SUPER_ADMIN,
          isActive: true,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
        include: userStaffInclude,
      });

      await tx.superAdminInvitation.updateMany({
        where: {
          id: pendingInvitation.id,
          status: SuperAdminInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: SuperAdminInvitationStatus.ACCEPTED,
          acceptedById: newAdmin.id,
        },
      });

      await logAudit(newAdmin.id, 'SUPER_ADMIN_INVITATION_ACCEPTED', 'SuperAdminInvitation', pendingInvitation.id, `Super Admin invitation accepted via Firebase Google sign-in by ${normalizedEmail}`);
      await logAudit(newAdmin.id, 'SUPER_ADMIN_PRIVILEGE_GRANTED', 'User', newAdmin.id, `Super Admin role granted to brand new user ${normalizedEmail}`);
    });
    if (newAdmin) return newAdmin;
  }

  try {
    return await prisma.user.create({
      data: {
        email: normalizedEmail,
        firebaseUid: verified.uid,
        name: verified.name || 'Google User',
        role: Role.SCHOOL_STAFF,
        isActive: true,
        emailVerified: verified.emailVerified ?? false,
        lastLoginAt: new Date(),
      },
      include: userStaffInclude,
    });
  } catch (createErr: any) {
    if (
      createErr?.code === 'P2002' ||
      (createErr instanceof Prisma.PrismaClientKnownRequestError && createErr.code === 'P2002')
    ) {
      const reResolved = await prisma.user.findFirst({
        where: {
          OR: [
            { firebaseUid: verified.uid },
            { email: { equals: normalizedEmail, mode: 'insensitive' } },
          ],
        },
        include: userStaffInclude,
      });

      if (reResolved) {
        if (!reResolved.isActive) {
          throw new AppError('Account has been suspended. Please contact platform administration.', 403);
        }

        if (reResolved.role === Role.SUPER_ADMIN) {
          if (reResolved.firebaseUid !== verified.uid) {
            throw new AppError(
              'Super Administrator accounts cannot be linked automatically via email. The platform owner must explicitly provision the verified Firebase UID in Neon PostgreSQL.',
              403
            );
          }
          if (reResolved.email.toLowerCase().trim() !== normalizedEmail) {
            throw new AppError('Super Admin identity mismatch. Authorized email does not match authenticated token.', 403);
          }
        }

        if (reResolved.firebaseUid === verified.uid) {
          return await prisma.user.update({
            where: { id: reResolved.id },
            data: { lastLoginAt: new Date() },
            include: userStaffInclude,
          });
        }

        if (!reResolved.firebaseUid) {
          if (!verified.emailVerified) {
            throw new AppError('Google account email is not verified.', 401);
          }
          return await prisma.user.update({
            where: { id: reResolved.id },
            data: {
              firebaseUid: verified.uid,
              email: normalizedEmail,
              lastLoginAt: new Date(),
            },
            include: userStaffInclude,
          });
        }

        throw new AppError(
          'This email account is already associated with a different authenticated identity. Contact support.',
          409
        );
      }
    }
    throw createErr;
  }
}

export async function neonLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.body.sessionToken || req.body.idToken || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (!token) {
      throw new AppError('Neon Auth session token or ID token is required.', 400);
    }

    const verified = await verifyNeonAuthToken(token);
    const user = await resolveOrCreateNeonUser(verified);

    const schoolStaff = user.schoolStaff[0];
    const destinationStaff = user.destinationStaff[0];

    const tokenPayload = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      schoolId: schoolStaff?.schoolId,
      destinationId: destinationStaff?.destinationId,
    });

    await logAudit(
      user.id,
      'USER_NEON_AUTH_LOGIN',
      'User',
      user.id,
      `User signed in via Neon Auth Google OAuth (ID: ${verified.id}) from ${req.ip}`
    );

    res.json({
      success: true,
      data: {
        token: tokenPayload,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          portalType: user.portalType,
          phone: user.phone,
          neonAuthId: user.neonAuthId,
          firebaseUid: user.firebaseUid,
          school: schoolStaff ? schoolStaff.school : null,
          destination: destinationStaff ? destinationStaff.destination : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function firebaseLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      throw new AppError('Firebase ID token is required.', 400);
    }

    const verified = await verifyFirebaseToken(idToken);
    const user = await resolveOrCreateFirebaseUser(verified);

    const schoolStaff = user.schoolStaff[0];
    const destinationStaff = user.destinationStaff[0];

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      schoolId: schoolStaff?.schoolId,
      destinationId: destinationStaff?.destinationId,
    });

    await logAudit(
      user.id,
      'USER_FIREBASE_LOGIN',
      'User',
      user.id,
      `User signed in via Firebase Google Auth (UID: ${verified.uid}) from ${req.ip}`
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          portalType: user.portalType,
          phone: user.phone,
          firebaseUid: user.firebaseUid,
          school: schoolStaff ? schoolStaff.school : null,
          destination: destinationStaff ? destinationStaff.destination : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('Email and password are required.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        schoolStaff: { include: { school: true } },
        destinationStaff: { include: { destination: true } },
      },
    });

    if (!user) {
      throw new AppError('Invalid credentials.', 401);
    }

    if (!user.passwordHash) {
      throw new AppError('This account was created using Google Sign-In. Please sign in with Google.', 400);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid credentials.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account has been suspended. Please contact platform administration.', 403);
    }

    const schoolStaff = user.schoolStaff[0];
    const destinationStaff = user.destinationStaff[0];

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      schoolId: schoolStaff?.schoolId,
      destinationId: destinationStaff?.destinationId,
    });

    await logAudit(user.id, 'USER_LOGIN', 'User', user.id, `User logged in from ${req.ip}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          portalType: user.portalType,
          phone: user.phone,
          school: schoolStaff ? schoolStaff.school : null,
          destination: destinationStaff ? destinationStaff.destination : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        schoolStaff: { include: { school: true } },
        destinationStaff: { include: { destination: true } },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          portalType: user.portalType,
          phone: user.phone,
          school: user.schoolStaff[0]?.school || null,
          destination: user.destinationStaff[0]?.destination || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function selectPortal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) throw new AppError('Authentication required.', 401);

    const portalType = req.body?.portalType;
    if (portalType !== PortalType.SCHOOL && portalType !== PortalType.DESTINATION) {
      throw new AppError('A valid portal selection is required.', 400);
    }

    const selected = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: req.user!.userId },
        include: { schoolStaff: true, destinationStaff: true },
      });
      if (!user || !user.isActive) throw new AppError('User account not found or inactive.', 401);
      if (user.role === Role.SUPER_ADMIN) throw new AppError('Super Admin portal assignment is managed separately.', 403);
      if (user.schoolStaff.length || user.destinationStaff.length) {
        throw new AppError('This account already has an assigned organization.', 409);
      }
      if (user.portalType && user.portalType !== portalType) {
        throw new AppError('Portal selection is already locked for this account.', 409);
      }
      if (user.portalType === portalType) return user;

      const updated = await tx.user.updateMany({
        where: { id: user.id, portalType: null },
        data: {
          portalType,
          role: portalType === PortalType.DESTINATION ? Role.DESTINATION_MANAGER : Role.SCHOOL_STAFF,
        },
      });
      if (updated.count === 0) {
        throw new AppError('Portal selection is already locked for this account.', 409);
      }
      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userStaffInclude,
      });
    });

    const token = generateToken({
      userId: selected.id,
      email: selected.email,
      role: selected.role,
      name: selected.name,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: selected.id,
          email: selected.email,
          name: selected.name,
          role: selected.role,
          portalType: selected.portalType,
          school: null,
          destination: null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function registerSchool(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      name,
      board,
      schoolType,
      address,
      city,
      state,
      pincode,
      officialEmail,
      contactPhone,
      contactPerson,
      designation,
      approximateStrength,
      website,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!name || !city || !state || !officialEmail || !contactPhone || !adminEmail || !adminPassword) {
      throw new AppError('Please complete all required school registration fields.', 400);
    }

    // Check existing email
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase().trim() } });
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 400);
    }

    const existingSchool = await prisma.school.findUnique({ where: { officialEmail: officialEmail.toLowerCase().trim() } });
    if (existingSchool) {
      throw new AppError('A school with this official email is already registered.', 400);
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: adminEmail.toLowerCase().trim(),
          passwordHash,
          name: adminName || contactPerson,
          phone: contactPhone,
          role: Role.SCHOOL_ADMIN,
          emailVerified: true,
          isActive: true,
        },
      });

      const school = await tx.school.create({
        data: {
          name,
          board,
          schoolType,
          address,
          city,
          state,
          pincode,
          officialEmail: officialEmail.toLowerCase().trim(),
          contactPhone,
          contactPerson,
          designation,
          approximateStrength: approximateStrength ? parseInt(approximateStrength, 10) : null,
          website,
          verificationStatus: VerificationStatus.VERIFIED, // verified for onboarding workflow
        },
      });

      await tx.schoolStaff.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          role: 'ADMIN',
          designation: designation || 'School Administrator',
        },
      });

      return { user, school };
    });

    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      schoolId: result.school.id,
    });

    await logAudit(result.user.id, 'SCHOOL_REGISTERED', 'School', result.school.id, `New school registered: ${name}`);

    res.status(201).json({
      success: true,
      message: 'School registered successfully.',
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          school: result.school,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request password recovery. Returns neutral message to avoid user enumeration.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      throw new AppError('Please provide a valid email address.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    let resetToken: string | null = null;
    // Only generate reset token if user has a password (not Google-only) and is active
    if (user && user.isActive && user.passwordHash) {
      resetToken = generatePasswordResetToken({ userId: user.id, email: user.email });
      await logAudit(user.id, 'USER_PASSWORD_RESET_REQUESTED', 'User', user.id, `Password reset token generated from IP: ${req.ip}`);
      console.log(`[PASSWORD RESET] Token generated for ${user.email}: ${resetToken}`);
    } else if (user && !user.passwordHash) {
      await logAudit(user.id, 'USER_PASSWORD_RESET_ATTEMPT_GOOGLE_ACCOUNT', 'User', user.id, `Password reset attempted on Google OAuth account from IP: ${req.ip}`);
    }

    // Always respond with neutral success messaging to prevent user enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email address, a password reset link has been dispatched to your inbox.',
      ...(process.env.NODE_ENV !== 'production' && resetToken ? { resetToken } : {}),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Complete password recovery using signed token and new password.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new AppError('Reset token and new password are required.', 400);
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400);
    }

    let decoded: { userId: string; email: string };
    try {
      decoded = verifyPasswordResetToken(token);
    } catch {
      throw new AppError('Password reset link is invalid or has expired. Please request a new link.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      throw new AppError('Account not found or has been deactivated.', 404);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    await logAudit(user.id, 'USER_PASSWORD_RESET_COMPLETED', 'User', user.id, `Password reset completed successfully from IP: ${req.ip}`);

    res.json({
      success: true,
      message: 'Your password has been successfully updated. You may now sign in with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Validate a Super Admin invitation token.
 * GET /api/v1/auth/super-admin-invitation/validate/:token
 */
export async function validateSuperAdminInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.params.token as string;
    if (!token) {
      throw new AppError('Invitation token is required.', 400);
    }

    const invitation = await prisma.superAdminInvitation.findUnique({
      where: { token },
      include: {
        invitedBy: { select: { name: true, email: true } },
      },
    });

    if (!invitation) {
      throw new AppError('Invitation not found or invalid token.', 404);
    }

    if (invitation.status === SuperAdminInvitationStatus.PENDING && invitation.expiresAt < new Date()) {
      await prisma.superAdminInvitation.update({
        where: { id: invitation.id },
        data: { status: SuperAdminInvitationStatus.EXPIRED },
      });
      invitation.status = SuperAdminInvitationStatus.EXPIRED;
    }

    const isPending = invitation.status === SuperAdminInvitationStatus.PENDING;
    const isAccepted = invitation.status === SuperAdminInvitationStatus.ACCEPTED;

    res.json({
      success: true,
      data: {
        isValid: isPending,
        isAccepted,
        status: invitation.status,
        email: invitation.email,
        notes: invitation.notes,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy?.name || invitation.invitedBy?.email || 'Platform Owner',
        message: isAccepted
          ? 'This Super Administrator invitation has already been accepted and activated.'
          : !isPending
          ? 'This invitation is no longer active.'
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Explicitly accept a Super Admin invitation using the current authenticated session.
 * POST /api/v1/auth/super-admin-invitation/accept
 */
export async function acceptSuperAdminInvitation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      throw new AppError('Invitation token is required.', 400);
    }

    if (!req.user || !req.user.userId || !req.user.email) {
      throw new AppError('Authentication required to accept an administrator invitation.', 401);
    }

    const normalizedUserEmail = req.user.email.toLowerCase().trim();

    const invitation = await prisma.superAdminInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      await logAudit(
        req.user.userId,
        'SUPER_ADMIN_INVITATION_FAILED',
        'SuperAdminInvitation',
        undefined,
        `Acceptance failed: Token not found by user ${normalizedUserEmail}`,
        req.ip
      );
      throw new AppError('Invitation not found or invalid token.', 404);
    }

    if (invitation.status !== SuperAdminInvitationStatus.PENDING || invitation.expiresAt <= new Date()) {
      if (invitation.status === SuperAdminInvitationStatus.PENDING) {
        await prisma.superAdminInvitation.update({
          where: { id: invitation.id },
          data: { status: SuperAdminInvitationStatus.EXPIRED },
        });
      }
      await logAudit(
        req.user.userId,
        'SUPER_ADMIN_INVITATION_FAILED',
        'SuperAdminInvitation',
        invitation.id,
        `Acceptance failed: Invitation status is ${invitation.status} (Expired: ${invitation.expiresAt <= new Date()}) by ${normalizedUserEmail}`,
        req.ip
      );
      throw new AppError('This invitation is no longer active, valid, or has expired.', 400);
    }

    // Security Invariant: The authenticated email MUST match the invited email
    if (invitation.email.toLowerCase().trim() !== normalizedUserEmail) {
      await logAudit(
        req.user.userId,
        'SUPER_ADMIN_INVITATION_FAILED',
        'SuperAdminInvitation',
        invitation.id,
        `Acceptance rejected: Authenticated email (${normalizedUserEmail}) does not match invited email (${invitation.email})`,
        req.ip
      );
      throw new AppError('Access forbidden. Authenticated Google account does not match the invited email address.', 403);
    }

    // Atomic transaction for concurrency safety
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomically claim invitation
      const claimResult = await tx.superAdminInvitation.updateMany({
        where: {
          id: invitation.id,
          status: SuperAdminInvitationStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        data: {
          status: SuperAdminInvitationStatus.ACCEPTED,
          acceptedById: req.user!.userId,
        },
      });

      if (claimResult.count === 0) {
        throw new AppError('Invitation was already claimed or cancelled concurrently.', 409);
      }

      // 2. Grant Super Admin role to user
      const updatedUser = await tx.user.update({
        where: { id: req.user!.userId },
        data: {
          role: Role.SUPER_ADMIN,
          isActive: true,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
        include: userStaffInclude,
      });

      return updatedUser;
    });

    await logAudit(
      req.user.userId,
      'SUPER_ADMIN_INVITATION_ACCEPTED',
      'SuperAdminInvitation',
      invitation.id,
      `Super Admin invitation accepted by ${normalizedUserEmail} (ID: ${req.user.userId})`,
      req.ip
    );

    await logAudit(
      req.user.userId,
      'SUPER_ADMIN_PRIVILEGE_GRANTED',
      'User',
      req.user.userId,
      `Super Admin privileges granted to ${normalizedUserEmail} via accepted invitation ${invitation.id}`,
      req.ip
    );

    const schoolStaff = result.schoolStaff[0];
    const destinationStaff = result.destinationStaff[0];

    // Issue fresh JWT token reflecting the new SUPER_ADMIN role
    const newToken = generateToken({
      userId: result.id,
      email: result.email,
      role: result.role,
      name: result.name,
      schoolId: schoolStaff?.schoolId,
      destinationId: destinationStaff?.destinationId,
    });

    res.json({
      success: true,
      message: 'Super Administrator privileges successfully granted.',
      data: {
        token: newToken,
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          role: result.role,
          portalType: result.portalType,
          phone: result.phone,
          neonAuthId: result.neonAuthId,
          school: schoolStaff ? schoolStaff.school : null,
          destination: destinationStaff ? destinationStaff.destination : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
