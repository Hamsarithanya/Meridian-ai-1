import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Compass,
  Layers,
  Loader2,
  Moon,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { APP_THEMES, AppTheme, ThemeId } from '../themes';

interface LoginViewProps {
  theme: AppTheme;
  themeId: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  onToggleDarkLight: () => void;
  onGoogleLogin: () => Promise<void>;
  onContinueDemo: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  theme,
  themeId,
  onSelectTheme,
  onToggleDarkLight,
  onGoogleLogin,
  onContinueDemo,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await onGoogleLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in right now.';
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Sign-in popup was closed before completing. Please try again.');
      } else if (msg.includes('popup-blocked')) {
        setAuthError(
          'Your browser blocked the sign-in popup. Allow popups for this site or continue in Guest Demo Mode.'
        );
      } else {
        setAuthError(msg);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between transition-colors duration-200"
      style={{
        backgroundColor: 'var(--m-canvas)',
        color: theme.isDark ? '#F1F5F9' : '#0F172A',
      }}
    >
      {/* Top Minimal Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-xs"
            style={{ backgroundColor: 'var(--m-primary)' }}
          >
            M
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              Meridian AI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDarkLight}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {theme.isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                Light
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-slate-600" />
                Dark
              </>
            )}
          </button>

          <select
            value={themeId}
            onChange={(e) => onSelectTheme(e.target.value as ThemeId)}
            aria-label="Login page theme"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none"
          >
            {APP_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Split Sign-In Studio */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-8">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-12">
          {/* Left Panel: Multi-Agent Learning Intelligence Showcase */}
          <section
            className="flex flex-col justify-between p-8 text-white lg:col-span-7 sm:p-10"
            style={{ background: theme.bannerGradient }}
          >
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
                <Sparkles className="h-3.5 w-3.5" />
                Adaptive Career & Skill Intelligence
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Four collaborating AI agents tailored to your career journey.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100">
                Sign in to sync your verified skills, competency radar, practical lab code reviews, mock technical interviews, and custom study roadmap across sessions.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <SearchCheck className="h-4 w-4 text-sky-300" />
                  Skill Analyst Agent
                </div>
                <p className="mt-1 text-xs leading-relaxed text-blue-100">
                  Audits skills, projects, and diagnostic scores into objective mastery ratings.
                </p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Compass className="h-4 w-4 text-teal-300" />
                  Career Matcher Agent
                </div>
                <p className="mt-1 text-xs leading-relaxed text-blue-100">
                  Benchmarks your readiness against real roles or custom job postings.
                </p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Layers className="h-4 w-4 text-indigo-200" />
                  Curriculum Architect
                </div>
                <p className="mt-1 text-xs leading-relaxed text-blue-100">
                  Builds 3-phase plans and inserts remedial labs whenever scores drop below 60%.
                </p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Bot className="h-4 w-4 text-amber-300" />
                  Adaptive Mentor Agent
                </div>
                <p className="mt-1 text-xs leading-relaxed text-blue-100">
                  Guides you via chat, audio briefings, mock interviews, and AI lab reviews.
                </p>
              </div>
            </div>
          </section>

          {/* Right Panel: Sign-In Actions */}
          <section className="flex flex-col justify-center p-8 lg:col-span-5 sm:p-10">
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Sign in to Meridian AI
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  Save your personalized roadmap, quiz diagnostics, and AI Mentor history securely in your cloud workspace.
                </p>
              </div>

              {authError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--m-primary)' }}
                >
                  {isSigningIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#FFFFFF"
                        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                      />
                    </svg>
                  )}
                  {isSigningIn ? 'Signing in with Google...' : 'Continue with Google'}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-slate-400">or preview without account</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onContinueDemo}
                  disabled={isSigningIn}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100"
                >
                  Continue in Guest Demo Mode
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                <span>
                  Authenticated workspaces are encrypted and isolated per learner UID via Firebase Auth and Firestore rules.
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-4 text-center text-xs text-slate-500">
        Meridian AI · Multi-Agent Personalized Learning & Career Navigation
      </footer>
    </div>
  );
};
