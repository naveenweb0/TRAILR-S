import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { School, LogIn, ArrowRight } from 'lucide-react';

export const SchoolRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/school/onboard', { replace: true });
      } else {
        navigate('/login?redirect=/school/onboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-dots flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-600/20">
          <School className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-[24px] sm:text-[28px] font-black text-slate-950 font-display tracking-tight">
            Authentication Required
          </h1>
          <p className="text-[15px] text-slate-600 leading-relaxed">
            Institute onboarding is completed inside your verified portal. Please sign in or register your account to continue.
          </p>
        </div>

        <Link
          to="/login?redirect=/school/onboard"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[16px] shadow-md shadow-blue-600/20 transition-all"
        >
          <LogIn className="w-5 h-5" />
          <span>Continue to Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
