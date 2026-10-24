import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/common/Navbar.js';
import { ProtectedRoute } from './components/common/ProtectedRoute.js';

// Public Pages
import { LandingPage } from './pages/public/LandingPage.js';
import { DestinationExplorePage } from './pages/public/DestinationExplorePage.js';
import { DestinationDetailPage } from './pages/public/DestinationDetailPage.js';
import { LoginPage } from './pages/public/LoginPage.js';
import { AuthCallbackPage } from './pages/public/AuthCallbackPage.js';
import { PortalSelectionPage } from './pages/public/PortalSelectionPage.js';
import { SchoolRegisterPage } from './pages/public/SchoolRegisterPage.js';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage.js';

// School Portal Pages
import { SchoolDashboard } from './pages/school/SchoolDashboard.js';
import { SchoolBookingsPage } from './pages/school/SchoolBookingsPage.js';
import { SchoolBookingPage } from './pages/school/SchoolBookingPage.js';
import { SchoolOnboardingPage } from './pages/school/SchoolOnboardingPage.js';

// Destination Portal Pages
import { DestinationDashboard } from './pages/destination/DestinationDashboard.js';
import { DestinationCalendarPage } from './pages/destination/DestinationCalendarPage.js';
import { DestinationListingPage } from './pages/destination/DestinationListingPage.js';
import { DestinationOnboardingPage } from './pages/destination/DestinationOnboardingPage.js';

// Super Admin Portal Pages
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AdminDestinationsPage } from './pages/admin/AdminDestinationsPage.js';
import { AdminSchoolsPage } from './pages/admin/AdminSchoolsPage.js';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage.js';
import { AdminTravellerPage } from './pages/admin/AdminTravellerPage.js';
import { AdminSettingsAndAuditPage } from './pages/admin/AdminSettingsAndAuditPage.js';
import { AdminSuperAdminsPage } from './pages/admin/AdminSuperAdminsPage.js';
import { AdminAcceptInvitePage } from './pages/admin/AdminAcceptInvitePage.js';

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-blue-600 selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/destinations" element={<DestinationExplorePage />} />
          <Route path="/destinations/:slug" element={<DestinationDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/admin/accept-invite" element={<AdminAcceptInvitePage />} />
          <Route
            path="/choose-portal"
            element={
              <ProtectedRoute>
                <PortalSelectionPage />
              </ProtectedRoute>
            }
          />
          <Route path="/register-school" element={<SchoolRegisterPage />} />
          <Route
            path="/school/onboard"
            element={
              <ProtectedRoute>
                <SchoolOnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/destination/onboard"
            element={
              <ProtectedRoute>
                <DestinationOnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Protected School Portal */}
          <Route
            path="/school"
            element={
              <ProtectedRoute allowedRoles={['SCHOOL_ADMIN', 'SCHOOL_STAFF']}>
                <SchoolDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/bookings"
            element={
              <ProtectedRoute allowedRoles={['SCHOOL_ADMIN', 'SCHOOL_STAFF']}>
                <SchoolBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/book"
            element={
              <ProtectedRoute allowedRoles={['SCHOOL_ADMIN', 'SCHOOL_STAFF']}>
                <SchoolBookingPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Destination Portal */}
          <Route
            path="/destination"
            element={
              <ProtectedRoute allowedRoles={['DESTINATION_MANAGER', 'DESTINATION_STAFF']}>
                <DestinationDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/destination/calendar"
            element={
              <ProtectedRoute allowedRoles={['DESTINATION_MANAGER', 'DESTINATION_STAFF']}>
                <DestinationCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/destination/listing"
            element={
              <ProtectedRoute allowedRoles={['DESTINATION_MANAGER', 'DESTINATION_STAFF']}>
                <DestinationListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/destination/bookings"
            element={
              <ProtectedRoute allowedRoles={['DESTINATION_MANAGER', 'DESTINATION_STAFF']}>
                <DestinationDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Super Admin Portal - Strictly SUPER_ADMIN only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/destinations"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminDestinationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schools"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminSchoolsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/traveller-requests"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminTravellerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/super-admins"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminSuperAdminsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminSettingsAndAuditPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
