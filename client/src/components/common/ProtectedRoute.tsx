import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldAlert, ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { getPostLoginRedirect } from '../../routes/routingUtils.js';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, token, loading, logout } = useAuth();
  const location = useLocation();

  // 1. While restoring session or authenticating with backend, show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-300">Verifying secure session...</p>
        <span className="text-xs text-slate-500 mt-1">Checking authorization permissions</span>
      </div>
    );
  }

  // 2. Unauthenticated -> redirect to login with return path
  if (!token || !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const currentPath = location.pathname;

  // 3. Super Admin handling: Super Admins belong in /admin
  if (user.role === 'SUPER_ADMIN') {
    if (currentPath === '/choose-portal' || currentPath.startsWith('/school') || currentPath.startsWith('/destination')) {
      return <Navigate to="/admin" replace />;
    }
  }

  // 4. Portal Selection route (/choose-portal): one-time decision only
  if (currentPath === '/choose-portal') {
    if (user.role === 'SUPER_ADMIN' || user.school || user.destination || user.portalType) {
      return <Navigate to={getPostLoginRedirect(user)} replace />;
    }
    return <>{children}</>;
  }

  // 5. Genuinely new user with NO portal assignment attempting to access protected routes
  const hasNoAssignment = !user.portalType && !user.school && !user.destination && user.role !== 'SUPER_ADMIN';
  if (hasNoAssignment && currentPath !== '/choose-portal') {
    return <Navigate to="/choose-portal" replace />;
  }

  // 6. Cross-portal access prevention for onboarding routes
  if (currentPath === '/school/onboard') {
    if (user.portalType === 'DESTINATION' && !user.school) {
      return <Navigate to="/destination/onboard" replace />;
    }
    return <>{children}</>;
  }

  if (currentPath === '/destination/onboard') {
    if (user.portalType === 'SCHOOL' && !user.destination) {
      return <Navigate to="/school/onboard" replace />;
    }
    return <>{children}</>;
  }

  // 7. Protected School Portal routes (/school, /school/bookings, /school/book)
  if (currentPath.startsWith('/school')) {
    // Must have completed onboarding
    if (!user.school) {
      return <Navigate to="/school/onboard" replace />;
    }
    // Must be verified/approved by Super Admin to access live school operations
    if (user.school.verificationStatus !== 'VERIFIED') {
      return <Navigate to="/school/onboard" replace />;
    }
  }

  // 8. Protected Destination Portal routes (/destination, /destination/calendar, /destination/listing)
  if (currentPath.startsWith('/destination')) {
    // Must have completed onboarding
    if (!user.destination) {
      return <Navigate to="/destination/onboard" replace />;
    }
    // Must be published/approved by Super Admin to access live destination operations
    if (user.destination.status !== 'PUBLISHED') {
      return <Navigate to="/destination/onboard" replace />;
    }
  }

  // 9. Role authorization check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const portalDestination = getPostLoginRedirect(user);

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white">Access Forbidden (403)</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your account <span className="font-semibold text-slate-200">({user.email})</span> with role{' '}
            <span className="font-semibold text-red-300 uppercase">{user.role}</span> does not have authorization to view this area.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={portalDestination}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Your Portal</span>
            </Link>
            <button
              onClick={logout}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
