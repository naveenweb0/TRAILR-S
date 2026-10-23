import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  Compass,
  School,
  Landmark,
  Shield,
  Bell,
  LogOut,
  LogIn,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
} from 'lucide-react';
import { NotificationItem } from '../../types/index.js';
import { getPostLoginRedirect } from '../../routes/routingUtils.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // quiet fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkRead = async (id: string, link?: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        setNotificationsOpen(false);
        navigate(link);
      }
    } catch (err) {}
  };

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      return;
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getRoleLabel = (u: any) => {
    if (u.role === 'SUPER_ADMIN') return 'Super Admin';
    if (!u.portalType && !u.school && !u.destination) return 'Setup Required';
    if (u.destination) {
      const isApproved = u.destination.status === 'PUBLISHED';
      return u.destination.name ? `${u.destination.name} (${isApproved ? 'Partner' : 'Pending Review'})` : 'Destination Partner';
    }
    if (u.school) {
      const isApproved = u.school.verificationStatus === 'VERIFIED';
      return u.school.name ? `${u.school.name} (${isApproved ? 'Approved' : 'Pending Review'})` : 'Institute Member';
    }
    if (u.portalType === 'DESTINATION') return 'Destination Partner (Onboarding)';
    if (u.portalType === 'SCHOOL') return 'Institute (Onboarding)';
    return 'Registered Member';
  };

  return (
    <header className="sticky top-0 z-50 glass-nav shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Brand Logo & Descriptor */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0" title="TRAILR'S — Institute Excursions Platform">
              <img
                src="/brand/logo-dark.png"
                alt="TRAILR'S"
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              />
              <span className="hidden xl:inline-block text-[12px] font-medium text-slate-500 tracking-wide pl-2.5 border-l border-slate-200 italic">
                &ldquo;We lost the map on purpose&rdquo;
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 text-[14px] xl:text-[15px] font-semibold overflow-hidden">
              <Link
                to="/destinations"
                className={`px-2.5 xl:px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  isActive('/destinations')
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:text-blue-700 hover:bg-slate-100/70'
                }`}
              >
                Explore Destinations
              </Link>

              {/* Public Anchor Links — only at xl to avoid overlap with CTAs */}
              {!user && (
                <>
                  <button
                    onClick={() => scrollToSection('for-schools')}
                    className="hidden xl:block px-2.5 xl:px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-slate-100/70 whitespace-nowrap transition-colors"
                  >
                    For Institutes
                  </button>
                  <button
                    onClick={() => scrollToSection('partner-venues')}
                    className="hidden xl:block px-2.5 xl:px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-slate-100/70 whitespace-nowrap transition-colors"
                  >
                    Partner Venues
                  </button>
                  <button
                    onClick={() => scrollToSection('how-it-works')}
                    className="hidden xl:block px-2.5 xl:px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-slate-100/70 whitespace-nowrap transition-colors"
                  >
                    How It Works
                  </button>
                </>
              )}

              {/* Authenticated Portal Links strictly segregated by server-verified role */}
              {user && user.role === 'SUPER_ADMIN' && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    isActive('/admin')
                      ? 'bg-purple-100/80 text-purple-800 font-bold'
                      : 'text-slate-700 hover:text-purple-700 hover:bg-slate-100/70'
                  }`}
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Admin Portal</span>
                </Link>
              )}

              {user && !user.portalType && !user.school && !user.destination && user.role !== 'SUPER_ADMIN' && (
                <Link
                  to="/choose-portal"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    isActive('/choose-portal')
                      ? 'bg-blue-100/80 text-blue-800 font-bold'
                      : 'text-slate-700 hover:text-blue-700 hover:bg-slate-100/70'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Choose Portal</span>
                </Link>
              )}

              {user && user.role !== 'SUPER_ADMIN' && (user.portalType === 'SCHOOL' || user.school) && (
                <Link
                  to={getPostLoginRedirect(user)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    isActive('/school')
                      ? 'bg-blue-100/80 text-blue-800 font-bold'
                      : 'text-slate-700 hover:text-blue-700 hover:bg-slate-100/70'
                  }`}
                >
                  <School className="w-4 h-4 text-blue-600" />
                  <span>Institute Portal</span>
                </Link>
              )}

              {user && user.role !== 'SUPER_ADMIN' && (user.portalType === 'DESTINATION' || user.destination) && (
                <Link
                  to={getPostLoginRedirect(user)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    isActive('/destination')
                      ? 'bg-emerald-100/80 text-emerald-800 font-bold'
                      : 'text-slate-700 hover:text-emerald-700 hover:bg-slate-100/70'
                  }`}
                >
                  <Landmark className="w-4 h-4 text-emerald-600" />
                  <span>Destination Portal</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Authenticated Notifications Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl relative transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 text-slate-800">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                      <span className="font-bold text-[15px] text-slate-900">Notifications</span>
                      <button
                        onClick={() => handleMarkRead('all')}
                        className="text-[13px] text-blue-600 font-semibold hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-[14px] text-slate-500">No notifications yet.</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkRead(n.id, n.link)}
                            className={`p-3.5 text-[14px] cursor-pointer hover:bg-slate-50 transition-colors ${
                              !n.isRead ? 'bg-blue-50/60 border-l-4 border-blue-600' : ''
                            }`}
                          >
                            <div className="font-semibold text-slate-900 flex items-center justify-between">
                              <span>{n.title}</span>
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                            </div>
                            <p className="text-slate-600 text-[13px] mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                            <span className="text-[11px] text-slate-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile or Public CTAs */}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <div className="text-[15px] font-bold text-slate-900 leading-tight">{user.name}</div>
                  <div className="text-[13px] text-slate-500 font-medium">
                    {getRoleLabel(user)}
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[14px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl text-[14px] sm:text-[15px] font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-100/80 transition-all whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 text-slate-500" />
                  <span>Sign In</span>
                </Link>

                <Link
                  to="/login?intent=school"
                  className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[14px] sm:text-[15px] font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5 transition-all whitespace-nowrap group"
                >
                  <School className="w-4 h-4 text-blue-100 group-hover:scale-110 transition-transform" />
                  <span>Register as Institute</span>
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-4 border-t border-slate-200/90 space-y-2 text-[16px]">
            <Link
              to="/destinations"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-slate-800 font-semibold hover:bg-slate-100"
            >
              Explore Destinations
            </Link>

            {!user && (
              <>
                <button
                  onClick={() => scrollToSection('for-schools')}
                  className="w-full text-left block px-4 py-3 rounded-xl text-slate-800 font-semibold hover:bg-slate-100"
                >
                  For Institutes
                </button>
                <button
                  onClick={() => scrollToSection('partner-venues')}
                  className="w-full text-left block px-4 py-3 rounded-xl text-slate-800 font-semibold hover:bg-slate-100"
                >
                  Partner Venues
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="w-full text-left block px-4 py-3 rounded-xl text-slate-800 font-semibold hover:bg-slate-100"
                >
                  How It Works
                </button>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-slate-800 font-semibold hover:bg-slate-100"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?intent=school"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 flex items-center gap-2"
                >
                  <School className="w-4 h-4 text-blue-600" />
                  <span>Register as Institute</span>
                </Link>
              </>
            )}

            {user && !user.portalType && !user.school && !user.destination && user.role !== 'SUPER_ADMIN' && (
              <Link
                to="/choose-portal"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl font-bold transition-colors ${
                  isActive('/choose-portal') ? 'bg-amber-100 text-amber-900' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Choose Your Portal
              </Link>
            )}

            {user && (user.portalType === 'SCHOOL' || user.role === 'SCHOOL_ADMIN' || user.role === 'SCHOOL_STAFF' || user.school) && (
              <Link
                to={getPostLoginRedirect(user)}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-between ${
                  isActive('/school') ? 'bg-blue-100 text-blue-800 font-bold' : 'text-blue-700 hover:bg-blue-50'
                }`}
              >
                <span>Institute Portal</span>
                {user.school?.verificationStatus === 'VERIFIED' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Verified</span>
                ) : user.school?.verificationStatus === 'PENDING' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Setup</span>
                )}
              </Link>
            )}

            {user && (user.portalType === 'DESTINATION' || user.role === 'DESTINATION_MANAGER' || user.role === 'DESTINATION_STAFF' || user.destination) && (
              <Link
                to={getPostLoginRedirect(user)}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-between ${
                  isActive('/destination') ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>Destination Portal</span>
                {user.destination?.status === 'PUBLISHED' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>
                ) : user.destination?.status === 'PENDING_APPROVAL' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Setup</span>
                )}
              </Link>
            )}

            {user?.role === 'SUPER_ADMIN' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl font-semibold transition-colors ${
                  isActive('/admin') ? 'bg-purple-100 text-purple-800 font-bold' : 'text-purple-700 hover:bg-purple-50'
                }`}
              >
                Admin Portal
              </Link>
            )}

            {user && (
              <div className="pt-3 mt-2 border-t border-slate-100 px-4 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-bold text-slate-900">{user.name}</div>
                  <div className="text-[12px] text-slate-500 font-medium">{getRoleLabel(user)}</div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
