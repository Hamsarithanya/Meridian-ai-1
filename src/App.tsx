import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Compass,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Sun,
  User,
  X,
} from 'lucide-react';
import {
  loadUserWorkspace,
  saveUserWorkspace,
  signInWithGooglePopup,
  signOutUser,
  subscribeToAuth,
} from './lib/firebase';
import { LoginView } from './components/LoginView';
import {
  CAREER_ROLES,
  INITIAL_MENTOR_MESSAGES,
  INITIAL_ORCHESTRATION,
  INITIAL_PROFILE,
  LEARNER_PRESETS,
  SEEDED_QUIZZES,
} from './data/seed';
import { APP_THEMES, getThemeById, ThemeId } from './themes';
import {
  AssessmentQuiz,
  AssessmentResult,
  CareerRole,
  LearnerProfile,
  LearningResource,
  MentorActionSuggestion,
  MentorMessage,
  NavSection,
  OrchestrationState,
} from './types';
import { OverviewView } from './components/OverviewView';
import { ProfileView } from './components/ProfileView';
import { SkillAnalysisView } from './components/SkillAnalysisView';
import { RoadmapView } from './components/RoadmapView';
import { AssessmentsView } from './components/AssessmentsView';
import { MentorView } from './components/MentorView';

const STORAGE_KEY = 'meridian_workspace_v1';
const THEME_STORAGE_KEY = 'meridian_theme_v1';
const GUEST_MODE_KEY = 'meridian_guest_mode';

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Command Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'User Profile', icon: User },
  { id: 'analysis', label: 'Skill Analysis', icon: BarChart3 },
  { id: 'career-match', label: 'Career Match', icon: Compass },
  { id: 'roadmap', label: 'Learning Roadmap', icon: BookOpen },
  { id: 'assessments', label: 'Assessments', icon: ClipboardCheck },
  { id: 'mentor', label: 'AI Mentor', icon: Bot },
];

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<LearnerProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) {
          return { ...parsed.profile, avatarUrl: INITIAL_PROFILE.avatarUrl };
        }
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_PROFILE;
  });

  const [orchestration, setOrchestration] = useState<OrchestrationState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.orchestration) return parsed.orchestration;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_ORCHESTRATION;
  });

  const [roles, setRoles] = useState<CareerRole[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.roles) && parsed.roles.length > 0) return parsed.roles;
      }
    } catch {
      // ignore storage errors
    }
    return CAREER_ROLES;
  });

  const [quizzes, setQuizzes] = useState<AssessmentQuiz[]>(SEEDED_QUIZZES);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const [mentorMessages, setMentorMessages] = useState<MentorMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.mentorMessages)) return parsed.mentorMessages;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_MENTOR_MESSAGES;
  });

  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isSendingMentor, setIsSendingMentor] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [guestMode, setGuestMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(GUEST_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [cloudHydratedUid, setCloudHydratedUid] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const latestWorkspaceRef = useRef({
    profile,
    orchestration,
    roles,
    mentorMessages,
  });
  latestWorkspaceRef.current = {
    profile,
    orchestration,
    roles,
    mentorMessages,
  };

  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && APP_THEMES.some((t) => t.id === saved)) {
        return saved as ThemeId;
      }
    } catch {
      // ignore storage errors
    }
    return 'studio';
  });
  const [lastLightThemeId, setLastLightThemeId] = useState<ThemeId>(() =>
    themeId === 'dark' ? 'studio' : themeId
  );

  const activeTheme = useMemo(() => getThemeById(themeId), [themeId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // ignore storage errors
    }
    if (themeId !== 'dark') {
      setLastLightThemeId(themeId);
    }
  }, [themeId]);

  const handleToggleDarkLight = () => {
    setThemeId((cur) => (cur === 'dark' ? lastLightThemeId : 'dark'));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 5000);
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ profile, orchestration, mentorMessages, roles })
      );
    } catch {
      // ignore quota errors
    }
  }, [profile, orchestration, mentorMessages, roles]);

  // Firebase Authentication & Cloud Firestore hydration
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuth(async (user) => {
      if (!active) return;
      setAuthUser(user);
      setAuthReady(true);

      if (!user) {
        setCloudHydratedUid(null);
        return;
      }

      setIsCloudSyncing(true);
      try {
        const remote = await loadUserWorkspace(user.uid);
        if (!active) return;

        if (remote) {
          const mergedProfile: LearnerProfile = {
            ...INITIAL_PROFILE,
            ...remote.profile,
            avatarUrl:
              remote.profile?.avatarUrl ||
              user.photoURL ||
              INITIAL_PROFILE.avatarUrl,
          };
          setProfile(mergedProfile);
          if (remote.orchestration) setOrchestration(remote.orchestration);
          if (Array.isArray(remote.roles) && remote.roles.length > 0) {
            setRoles(remote.roles);
          }
          if (Array.isArray(remote.mentorMessages)) {
            setMentorMessages(remote.mentorMessages);
          }
          setAvatarBroken(false);
        } else {
          const current = latestWorkspaceRef.current;
          const seededProfile: LearnerProfile = {
            ...current.profile,
            name:
              current.profile.name === INITIAL_PROFILE.name && user.displayName
                ? user.displayName
                : current.profile.name,
            avatarUrl:
              user.photoURL ||
              current.profile.avatarUrl ||
              INITIAL_PROFILE.avatarUrl,
          };
          setProfile(seededProfile);
          setAvatarBroken(false);
          await saveUserWorkspace(user, {
            profile: seededProfile,
            orchestration: current.orchestration,
            roles: current.roles,
            mentorMessages: current.mentorMessages,
          });
        }
        if (active) {
          setCloudHydratedUid(user.uid);
        }
      } catch (err) {
        console.error('Failed to load cloud workspace:', err);
        if (active) {
          setErrorBanner(
            'Signed in, but could not sync cloud workspace. Using local session state.'
          );
        }
      } finally {
        if (active) {
          setIsCloudSyncing(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Debounced Firestore sync after hydration
  useEffect(() => {
    if (!authUser || cloudHydratedUid !== authUser.uid) return;
    const timer = window.setTimeout(() => {
      saveUserWorkspace(authUser, {
        profile,
        orchestration,
        roles,
        mentorMessages,
      }).catch((err) => {
        console.error('Cloud workspace auto-save failed:', err);
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [authUser, cloudHydratedUid, profile, orchestration, roles, mentorMessages]);

  const handleGoogleLogin = async () => {
    await signInWithGooglePopup();
    try {
      sessionStorage.removeItem(GUEST_MODE_KEY);
    } catch {
      // ignore storage errors
    }
    setGuestMode(false);
  };

  const handleContinueDemo = () => {
    try {
      sessionStorage.setItem(GUEST_MODE_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setGuestMode(true);
  };

  const handleSignOutOrOpenLogin = async () => {
    try {
      sessionStorage.removeItem(GUEST_MODE_KEY);
    } catch {
      // ignore storage errors
    }
    setGuestMode(false);
    setCloudHydratedUid(null);
    if (authUser) {
      await signOutUser();
    }
  };

  const targetRole = useMemo(
    () => roles.find((r) => r.id === profile.targetRoleId) || roles[0] || CAREER_ROLES[0],
    [profile.targetRoleId, roles]
  );

  const completedResourceIds = useMemo(
    () =>
      orchestration.roadmap
        .flatMap((p) => p.resources)
        .filter((r) => r.completed)
        .map((r) => r.id),
    [orchestration.roadmap]
  );

  // Live SSE streaming invocation of the 4 collaborating Gemini agents
  const runAgentOrchestration = async (
    nextProfile: LearnerProfile,
    triggerReason: string,
    latestAssessment?: AssessmentResult,
    rolesOverride?: CareerRole[]
  ) => {
    const availableRoles = rolesOverride || roles;
    const roleObj =
      availableRoles.find((r) => r.id === nextProfile.targetRoleId) || availableRoles[0] || CAREER_ROLES[0];

    setIsOrchestrating(true);
    setErrorBanner(null);

    // Prepare running indicator state on existing trace cards
    setOrchestration((prev) => ({
      ...prev,
      lastTrigger: triggerReason,
      agentTrace: prev.agentTrace.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'running' : 'idle',
        summary: idx === 0 ? 'Analyzing updated learner profile and diagnostics...' : 'Waiting for upstream handoff...',
        handoffNote: idx === 0 ? 'In progress' : 'Queued',
        durationMs: 0,
      })),
    }));

    try {
      const response = await fetch('/api/agents/orchestrate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: nextProfile,
          targetRole: roleObj,
          triggerReason,
          latestAssessment,
          completedResourceIds,
        }),
      });

      if (!response.ok || !response.body) {
        const fallbackErr = await response.text();
        throw new Error(fallbackErr || 'Failed to connect to Multi-Agent Orchestrator.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
          const line = rawEvent
            .split('\n')
            .find((l) => l.startsWith('data: '));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6));

          if (payload.type === 'agent_start' && payload.agentStep) {
            setOrchestration((prev) => ({
              ...prev,
              agentTrace: prev.agentTrace.map((s) =>
                s.agentId === payload.agentStep.agentId ? payload.agentStep : s
              ),
            }));
          } else if (payload.type === 'agent_complete' && payload.agentStep) {
            setOrchestration((prev) => ({
              ...prev,
              agentTrace: prev.agentTrace.map((s) =>
                s.agentId === payload.agentStep.agentId ? payload.agentStep : s
              ),
            }));
          } else if (payload.type === 'final' && payload.result) {
            const finalState: OrchestrationState = payload.result;
            setOrchestration(finalState);
            showToast(`4 AI agents updated your ${roleObj.title} roadmap (${finalState.readinessScore}% ready).`);

            // Also log an automatic Mentor update message when adaptation happened
            if (latestAssessment || triggerReason.toLowerCase().includes('goal')) {
              setMentorMessages((prev) => [
                ...prev,
                {
                  id: `msg-auto-${Date.now()}`,
                  sender: 'mentor',
                  text: `${finalState.mentorBriefing}\n\nAdaptation Summary: ${finalState.adaptationReason}`,
                  timestamp: 'Just now',
                },
              ]);
            }
          } else if (payload.type === 'error') {
            throw new Error(payload.error || 'Agent execution error');
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Agent synchronization failed.';
      setErrorBanner(msg);
      setOrchestration((prev) => ({
        ...prev,
        agentTrace: prev.agentTrace.map((s) =>
          s.status === 'running' ? { ...s, status: 'error', summary: msg } : s
        ),
      }));
    } finally {
      setIsOrchestrating(false);
    }
  };

  const handleSelectTargetRole = (roleId: string) => {
    if (roleId === profile.targetRoleId) return;
    const role = roles.find((r) => r.id === roleId);
    const nextProfile = { ...profile, targetRoleId: roleId };
    setProfile(nextProfile);
    runAgentOrchestration(
      nextProfile,
      `Career goal switched to ${role?.title || 'new role'}`
    );
  };

  const handleAddCustomRole = (newRole: CareerRole) => {
    const nextRoles = [newRole, ...roles.filter((r) => r.id !== newRole.id)];
    const nextProfile = { ...profile, targetRoleId: newRole.id };
    setRoles(nextRoles);
    setProfile(nextProfile);
    runAgentOrchestration(
      nextProfile,
      `Custom career goal created: ${newRole.title}`,
      undefined,
      nextRoles
    );
  };

  const handleUpdateProfile = (nextProfile: LearnerProfile, triggerReason?: string) => {
    setProfile(nextProfile);
    runAgentOrchestration(
      nextProfile,
      triggerReason || 'Profile and skill evidence updated'
    );
  };

  const handleToggleResource = (resourceId: string) => {
    setOrchestration((prev) => ({
      ...prev,
      roadmap: prev.roadmap.map((phase) => ({
        ...phase,
        resources: phase.resources.map((res) =>
          res.id === resourceId ? { ...res, completed: !res.completed } : res
        ),
      })),
    }));
  };

  const handleMarkResourceCompleted = (resourceId: string) => {
    setOrchestration((prev) => ({
      ...prev,
      roadmap: prev.roadmap.map((phase) => ({
        ...phase,
        resources: phase.resources.map((res) =>
          res.id === resourceId ? { ...res, completed: true } : res
        ),
      })),
    }));
  };

  const handleCompleteAssessment = (result: AssessmentResult) => {
    const nextProfile: LearnerProfile = {
      ...profile,
      assessmentHistory: [result, ...profile.assessmentHistory],
    };
    setProfile(nextProfile);

    const reason =
      result.score < 60
        ? `Low diagnostic score (${result.score}%) in ${result.targetSkill} — triggering remedial adaptation`
        : `Completed ${result.targetSkill} diagnostic (${result.score}%)`;
    runAgentOrchestration(nextProfile, reason, result);
  };

  const handleSimulateLowScore = () => {
    const simulated: AssessmentResult = {
      id: `res-sim-${Date.now()}`,
      topic: 'JavaScript Fundamentals & Async Execution',
      targetSkill: 'JavaScript',
      score: 25,
      correctCount: 1,
      totalQuestions: 4,
      weakConcepts: ['Event Loop & Microtasks', 'Lexical Scope & Closures', 'Async/Await Error Handling'],
      timestamp: 'Just now',
      triggeredAdaptation: true,
    };
    handleCompleteAssessment(simulated);
  };

  const handleSendMentorMessage = async (text: string) => {
    const userMsg: MentorMessage = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...mentorMessages, userMsg];
    setMentorMessages(nextHistory);
    setIsSendingMentor(true);
    setErrorBanner(null);

    try {
      const resp = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextHistory.map((m) => ({ sender: m.sender, text: m.text })),
          profile,
          targetRole,
          orchestration,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Mentor failed to respond.');
      }

      const mentorMsg: MentorMessage = {
        id: `msg-m-${Date.now()}`,
        sender: 'mentor',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: data.suggestedAction,
      };
      setMentorMessages((prev) => [...prev, mentorMsg]);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to reach AI Mentor.');
    } finally {
      setIsSendingMentor(false);
    }
  };

  const handleExecuteSuggestedAction = (action: MentorActionSuggestion) => {
    if (action.actionType === 'launch_quiz') {
      const exists = quizzes.find((q) => q.id === action.payload);
      setActiveQuizId(exists ? exists.id : quizzes[0]?.id || null);
      setActiveNav('assessments');
    } else if (action.actionType === 'add_remedial') {
      runAgentOrchestration(
        profile,
        `Mentor-recommended remedial focus on ${action.payload}`
      );
      setActiveNav('roadmap');
    } else if (action.actionType === 'switch_role') {
      const match = roles.find(
        (r) =>
          r.id === action.payload ||
          r.title.toLowerCase().includes(action.payload.toLowerCase())
      );
      if (match) {
        handleSelectTargetRole(match.id);
      }
    }
  };

  const handleAskMentorAboutResource = (resource: LearningResource) => {
    setActiveNav('mentor');
    handleSendMentorMessage(
      `Can you guide me on how to approach "${resource.title}" (${resource.type} for ${resource.targetSkill}) given my current background?`
    );
  };

  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRoles(CAREER_ROLES);
    setProfile(INITIAL_PROFILE);
    setOrchestration(INITIAL_ORCHESTRATION);
    setMentorMessages(INITIAL_MENTOR_MESSAGES);
    setActiveQuizId(null);
    setErrorBanner(null);
    setActiveNav('overview');
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeNav) || NAV_ITEMS[0];

  const isLightSidebar = themeId === 'academic';
  const resolvedAvatarUrl = authUser?.photoURL || profile.avatarUrl;

  if (!authReady) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--m-canvas)',
          color: activeTheme.isDark ? '#F1F5F9' : '#0F172A',
        }}
      >
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--m-primary)' }} />
        <p className="text-xs font-medium text-slate-500">Loading Meridian AI workspace...</p>
      </div>
    );
  }

  if (!authUser && !guestMode) {
    return (
      <LoginView
        theme={activeTheme}
        themeId={themeId}
        onSelectTheme={setThemeId}
        onToggleDarkLight={handleToggleDarkLight}
        onGoogleLogin={handleGoogleLogin}
        onContinueDemo={handleContinueDemo}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex transition-colors duration-200"
      style={{
        backgroundColor: 'var(--m-canvas)',
        color: activeTheme.isDark ? '#F1F5F9' : '#0F172A',
      }}
    >
      {/* Desktop Left Sidebar (240px) */}
      <aside
        className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r transition-colors duration-200"
        style={{
          backgroundColor: 'var(--m-sidebar-bg)',
          borderColor: 'var(--m-sidebar-border)',
          color: 'var(--m-sidebar-text)',
        }}
      >
        <div
          className="flex h-16 items-center gap-2.5 px-6 border-b"
          style={{ borderColor: 'var(--m-sidebar-border)' }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: 'var(--m-primary)' }}
          >
            M
          </div>
          <span
            className={`font-display text-lg font-bold tracking-tight whitespace-nowrap ${
              isLightSidebar ? 'text-slate-900' : 'text-white'
            }`}
          >
            Meridian AI
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary Workspace Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-sm'
                    : isLightSidebar
                      ? 'text-slate-600 hover:bg-blue-50 hover:text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                style={isActive ? { backgroundColor: 'var(--m-primary)' } : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Learner Summary & Reset */}
        <div
          className="border-t p-4 space-y-3"
          style={{
            borderColor: 'var(--m-sidebar-border)',
            backgroundColor: 'var(--m-sidebar-footer)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveNav('profile')}
            className={`flex w-full items-center gap-3 rounded-lg p-1.5 -m-1.5 text-left transition-colors ${
              isLightSidebar ? 'hover:bg-slate-200/60' : 'hover:bg-slate-800/80'
            }`}
          >
            {!avatarBroken && resolvedAvatarUrl ? (
              <img
                src={resolvedAvatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarBroken(true)}
                className={`h-9 w-9 rounded-lg border object-cover shrink-0 ${
                  isLightSidebar ? 'border-slate-200' : 'border-slate-700'
                }`}
              />
            ) : (
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg border shrink-0 ${
                  isLightSidebar
                    ? 'border-slate-200 bg-slate-100 text-slate-600'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div
                className={`truncate text-xs font-semibold ${
                  isLightSidebar ? 'text-slate-900' : 'text-white'
                }`}
              >
                {profile.name}
              </div>
              <div
                className="truncate text-[11px] font-medium"
                style={{ color: 'var(--m-sidebar-accent)' }}
              >
                Edit details · {targetRole.title}
              </div>
            </div>
          </button>

          <div
            className={`flex items-center gap-1.5 text-[11px] truncate ${
              isLightSidebar ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {authUser ? (
              <>
                <Cloud className="h-3 w-3 shrink-0 text-emerald-400" />
                <span className="truncate">
                  {isCloudSyncing ? 'Syncing cloud workspace...' : authUser.email || 'Cloud synced'}
                </span>
              </>
            ) : (
              <span className="truncate">Guest Demo Mode · Local only</span>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setShowGuide(true);
                setActiveNav('overview');
              }}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                isLightSidebar
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" style={{ color: 'var(--m-sidebar-accent)' }} />{' '}
              How to Use Guide
            </button>
            <button
              onClick={handleResetDemo}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                isLightSidebar
                  ? 'border-slate-200 bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  : 'border-slate-800 bg-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <RotateCcw className="h-3 w-3" /> Reset Baseline Demo
            </button>
            <button
              onClick={handleSignOutOrOpenLogin}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                isLightSidebar
                  ? 'border-slate-200 bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  : 'border-slate-800 bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              {authUser ? (
                <>
                  <LogOut className="h-3 w-3" /> Sign Out
                </>
              ) : (
                <>
                  <LogIn className="h-3 w-3" /> Sign In Page
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            className="relative z-10 flex w-64 flex-col border-r"
            style={{
              backgroundColor: 'var(--m-sidebar-bg)',
              borderColor: 'var(--m-sidebar-border)',
              color: 'var(--m-sidebar-text)',
            }}
          >
            <div
              className="flex h-14 items-center justify-between px-5 border-b"
              style={{ borderColor: 'var(--m-sidebar-border)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--m-primary)' }}
                >
                  M
                </div>
                <span
                  className={`font-display text-lg font-bold ${
                    isLightSidebar ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Meridian AI
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className={`rounded-md p-1.5 ${
                  isLightSidebar
                    ? 'text-slate-500 hover:bg-slate-100'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveNav(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'text-white'
                        : isLightSidebar
                          ? 'text-slate-600 hover:bg-blue-50'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                    style={isActive ? { backgroundColor: 'var(--m-primary)' } : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div
              className="border-t p-3 space-y-2"
              style={{ borderColor: 'var(--m-sidebar-border)' }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleDarkLight}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                    isLightSidebar
                      ? 'border-slate-200 bg-white text-slate-700'
                      : 'border-slate-700 bg-slate-800/70 text-slate-200'
                  }`}
                >
                  {activeTheme.isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
                  {activeTheme.isDark ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value as ThemeId)}
                aria-label="Select theme mobile"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
              >
                {APP_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    Theme: {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setShowGuide(true);
                  setActiveNav('overview');
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  isLightSidebar
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'border-slate-700 bg-slate-800/70 text-slate-200'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" style={{ color: 'var(--m-sidebar-accent)' }} />{' '}
                How to Use Guide
              </button>
              <button
                onClick={() => {
                  handleResetDemo();
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  isLightSidebar
                    ? 'border-slate-200 text-slate-600'
                    : 'border-slate-800 text-slate-400'
                }`}
              >
                <RotateCcw className="h-3 w-3" /> Reset Baseline Demo
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleSignOutOrOpenLogin();
                }}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  isLightSidebar
                    ? 'border-slate-200 text-slate-700'
                    : 'border-slate-800 text-slate-300'
                }`}
              >
                {authUser ? (
                  <>
                    <LogOut className="h-3 w-3" /> Sign Out
                  </>
                ) : (
                  <>
                    <LogIn className="h-3 w-3" /> Sign In Page
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-60">
        {/* Top Bar */}
        <header
          className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b px-4 backdrop-blur sm:px-8 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--m-header-bg)',
            borderColor: 'var(--m-header-border)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400">Meridian AI</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="truncate font-semibold text-slate-900">
                {activeNavMeta.label}
              </span>
            </div>
          </div>

          {/* Right Controls: Theme Switcher + Dark/Light Toggle + Role Switcher + Agent Sync */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 1-Click Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleDarkLight}
              aria-label={activeTheme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={activeTheme.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {activeTheme.isDark ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* Theme Style Preset Picker */}
            <label className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
              <Palette className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--m-primary)' }} />
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value as ThemeId)}
                aria-label="Workspace color theme"
                className="bg-transparent py-0.5 text-xs font-medium text-slate-900 focus:outline-none"
              >
                {APP_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="hidden xl:flex items-center gap-2 text-xs text-slate-500">
              <span className="whitespace-nowrap">Goal:</span>
              <select
                value={profile.targetRoleId}
                disabled={isOrchestrating}
                onChange={(e) => handleSelectTargetRole(e.target.value)}
                aria-label="Target career goal"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-[#2563EB] focus:outline-none"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>

            {!authUser && (
              <button
                type="button"
                onClick={handleSignOutOrOpenLogin}
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <LogIn className="h-3.5 w-3.5" style={{ color: 'var(--m-primary)' }} />
                Sign In
              </button>
            )}

            <button
              onClick={() =>
                runAgentOrchestration(
                  profile,
                  `Manual multi-agent calibration for ${targetRole.title}`
                )
              }
              disabled={isOrchestrating}
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--m-primary)' }}
            >
              {isOrchestrating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isOrchestrating ? 'Agents Syncing...' : 'Run Agent Sync'}
            </button>
          </div>
        </header>

        {/* Mobile Career Goal Selector Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 md:hidden">
          <span className="text-xs font-medium text-slate-600">Goal:</span>
          <select
            value={profile.targetRoleId}
            disabled={isOrchestrating}
            onChange={(e) => handleSelectTargetRole(e.target.value)}
            aria-label="Target career goal mobile"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>

        {/* Confirmation Toast Banner */}
        {toastMessage && (
          <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 sm:mx-8">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="font-medium text-emerald-700 hover:underline whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Propagation Banner */}
        {errorBanner && (
          <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 sm:mx-8">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="font-medium text-red-700 hover:underline whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Viewport */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8">
          {activeNav === 'overview' && (
            <OverviewView
              profile={profile}
              targetRole={targetRole}
              orchestration={orchestration}
              isOrchestrating={isOrchestrating}
              showGuide={showGuide}
              theme={activeTheme}
              onDismissGuide={() => setShowGuide(false)}
              onNavigate={setActiveNav}
              onSimulateLowScore={handleSimulateLowScore}
              onToggleResource={handleToggleResource}
            />
          )}

          {activeNav === 'profile' && (
            <ProfileView
              profile={profile}
              roles={roles}
              presets={LEARNER_PRESETS}
              isOrchestrating={isOrchestrating}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {(activeNav === 'analysis' || activeNav === 'career-match') && (
            <SkillAnalysisView
              mode={activeNav}
              profile={profile}
              roles={roles}
              targetRole={targetRole}
              orchestration={orchestration}
              isOrchestrating={isOrchestrating}
              theme={activeTheme}
              onSelectTargetRole={handleSelectTargetRole}
              onAddCustomRole={handleAddCustomRole}
            />
          )}

          {activeNav === 'roadmap' && (
            <RoadmapView
              profile={profile}
              targetRole={targetRole}
              orchestration={orchestration}
              weeklyHoursBudget={profile.weeklyHoursBudget}
              targetRoleTitle={targetRole.title}
              onToggleResource={handleToggleResource}
              onMarkResourceCompleted={handleMarkResourceCompleted}
              onAskMentorAboutResource={handleAskMentorAboutResource}
            />
          )}

          {activeNav === 'assessments' && (
            <AssessmentsView
              profile={profile}
              quizzes={quizzes}
              activeQuizId={activeQuizId}
              targetRole={targetRole}
              missingSkills={orchestration.missingSkills}
              history={profile.assessmentHistory}
              isOrchestrating={isOrchestrating}
              onSelectQuiz={setActiveQuizId}
              onAddCustomQuiz={(q) => setQuizzes((prev) => [q, ...prev])}
              onCompleteAssessment={handleCompleteAssessment}
              onViewRoadmap={() => setActiveNav('roadmap')}
            />
          )}

          {activeNav === 'mentor' && (
            <MentorView
              profile={profile}
              targetRole={targetRole}
              orchestration={orchestration}
              messages={mentorMessages}
              onSendMessage={handleSendMentorMessage}
              onExecuteSuggestedAction={handleExecuteSuggestedAction}
              isSending={isSendingMentor}
            />
          )}
        </main>
      </div>
    </div>
  );
}
