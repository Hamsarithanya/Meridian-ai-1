import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Loader2,
  MessageSquare,
  Square,
  Target,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { downloadStudyPlanMarkdown } from '../lib/exportPlan';
import { AppTheme } from '../themes';
import {
  CareerRole,
  LearnerProfile,
  NavSection,
  OrchestrationState,
} from '../types';
import { AgentPipelinePanel } from './AgentPipelinePanel';
import { SkillRadarChart } from './SkillRadarChart';

interface OverviewViewProps {
  profile: LearnerProfile;
  targetRole: CareerRole;
  orchestration: OrchestrationState;
  isOrchestrating: boolean;
  showGuide: boolean;
  theme: AppTheme;
  onDismissGuide: () => void;
  onNavigate: (section: NavSection) => void;
  onSimulateLowScore: () => void;
  onToggleResource: (resourceId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  targetRole,
  orchestration,
  isOrchestrating,
  showGuide,
  theme,
  onDismissGuide,
  onNavigate,
  onSimulateLowScore,
  onToggleResource,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeakBriefing = async () => {
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      return;
    }

    setIsLoadingAudio(true);
    setAudioError(null);
    try {
      const resp = await fetch('/api/mentor/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: orchestration.mentorBriefing }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not generate audio briefing.');
      }
      const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
      setIsSpeaking(true);
    } catch (err: unknown) {
      setAudioError(err instanceof Error ? err.message : 'Audio playback failed.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const allResources = orchestration.roadmap.flatMap((p) => p.resources);
  const completedCount = allResources.filter((r) => r.completed).length;
  const totalHours = allResources.reduce((acc, r) => acc + r.durationHours, 0);
  const completedHours = allResources
    .filter((r) => r.completed)
    .reduce((acc, r) => acc + r.durationHours, 0);
  const progressPct =
    allResources.length > 0 ? Math.round((completedCount / allResources.length) * 100) : 0;

  const phaseOneResources = orchestration.roadmap[0]?.resources || [];

  return (
    <div className="space-y-6">
      {/* Friendly 4-Step Quick-Start Walkthrough */}
      {showGuide && (
        <section
          className="rounded-xl p-6 text-white shadow-sm"
          style={{ background: theme.bannerGradient }}
        >
          <div className="flex flex-col justify-between gap-2 border-b border-white/15 pb-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-lg font-semibold text-white">
                Welcome to Meridian AI — How to Use This Platform
              </h1>
              <p className="mt-0.5 text-xs text-blue-100">
                Follow these four steps to build your profile, uncover skill gaps, and watch four AI agents adapt your learning plan in real time.
              </p>
            </div>
            <button
              onClick={onDismissGuide}
              className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 self-start whitespace-nowrap shrink-0"
            >
              Hide Guide
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="group flex flex-col justify-between rounded-lg bg-white p-4 text-left text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <div>
                <div className="font-mono text-xs font-semibold text-[#2563EB]">Step 01</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Set Skills & Career Goal
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Add your skills, projects, and target job—or auto-fill from a resume snippet in one click.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] group-hover:underline">
                Open User Profile <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('career-match')}
              className="group flex flex-col justify-between rounded-lg bg-white p-4 text-left text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <div>
                <div className="font-mono text-xs font-semibold text-[#0D9488]">Step 02</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Compare Role Readiness
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  See strengths vs. missing skills on the radar, or create any custom role benchmark.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] group-hover:underline">
                Open Career Match <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('assessments')}
              className="group flex flex-col justify-between rounded-lg bg-white p-4 text-left text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <div>
                <div className="font-mono text-xs font-semibold text-[#4F46E5]">Step 03</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Diagnostic & Mock Interview
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Take a skill quiz or live mock interview. Scoring under 60% auto-inserts remedial labs.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#4F46E5] group-hover:underline">
                Go to Assessments <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('mentor')}
              className="group flex flex-col justify-between rounded-lg bg-white p-4 text-left text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <div>
                <div className="font-mono text-xs font-semibold text-[#D97706]">Step 04</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Code Labs, Links & AI Mentor
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Get AI code reviews, find live free courses, export your plan, or listen to Mentor audio.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] group-hover:underline">
                Chat with AI Mentor <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </section>
      )}
      {/* KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Target Role Readiness</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
              <Target className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {orchestration.readinessScore}%
            </span>
            <span className="text-xs font-semibold text-[#2563EB]">{targetRole.title}</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
              style={{ width: `${orchestration.readinessScore}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Priority Missing Skills</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#D97706]">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {orchestration.missingSkills.length}
            </span>
            <button
              onClick={() => onNavigate('career-match')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#D97706] hover:underline whitespace-nowrap shrink-0"
            >
              Inspect matrix <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-3 truncate text-xs text-slate-600">
            {orchestration.missingSkills.join(' · ') || 'All role benchmarks met'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Roadmap Completion</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#059669]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {progressPct}%
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {completedHours.toFixed(1)} / {totalHours.toFixed(1)} hrs
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#059669] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {completedCount} of {allResources.length} modules completed
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Diagnostic Assessments</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-[#4F46E5]">
              <ClipboardCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {profile.assessmentHistory.length}
            </span>
            <button
              onClick={() => onNavigate('assessments')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#4F46E5] hover:underline whitespace-nowrap shrink-0"
            >
              Take diagnostic <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-3 truncate text-xs text-slate-600">
            Latest:{' '}
            {profile.assessmentHistory[0]
              ? `${profile.assessmentHistory[0].topic} (${profile.assessmentHistory[0].score}%)`
              : 'None taken yet'}
          </p>
        </div>
      </section>

      {/* Main Split: Skill Competency Radar + Adaptive Mentor Briefing */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Skill Gap Constellation
              </h2>
              <p className="text-xs text-slate-500">
                {profile.name} · Current mastery benchmarked against {targetRole.title}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onNavigate('profile')}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Edit My Details
              </button>
              <button
                onClick={() => onNavigate('analysis')}
                className="text-xs font-medium text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                Open Full Analysis
              </button>
            </div>
          </div>

          <div className="py-4">
            <SkillRadarChart audits={orchestration.skillAudits} theme={theme} />
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified Strengths
              </div>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                {orchestration.strengths.slice(0, 2).map((s, idx) => (
                  <li key={idx}>· {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Priority Weaknesses
              </div>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
                {orchestration.weaknesses.slice(0, 2).map((w, idx) => (
                  <li key={idx}>· {w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Adaptive Mentor & Immediate Phase 1 Focus */}
        <div className="flex flex-col justify-between gap-6 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Target className="h-3.5 w-3.5 text-[#1D4ED8]" />
                Adaptive Mentor Briefing
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleSpeakBriefing}
                  disabled={isLoadingAudio}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {isLoadingAudio ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isSpeaking ? (
                    <Square className="h-3 w-3 text-red-600" />
                  ) : (
                    <Volume2 className="h-3 w-3 text-[#1D4ED8]" />
                  )}
                  {isLoadingAudio ? 'Generating Audio...' : isSpeaking ? 'Stop Audio' : 'Listen'}
                </button>
                <button
                  onClick={() => onNavigate('mentor')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:underline whitespace-nowrap"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Chat
                </button>
              </div>
            </div>

            {audioError && (
              <p className="mt-2 text-[11px] text-red-600">{audioError}</p>
            )}

            <p className="mt-3 text-sm leading-relaxed text-slate-800">
              {orchestration.mentorBriefing}
            </p>

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              <div className="text-xs font-semibold text-slate-900">Recommended Next Moves</div>
              {orchestration.quickActions.map((act, i) => (
                <div key={i} className="text-xs text-slate-600">
                  {i + 1}. {act}
                </div>
              ))}
            </div>

            {/* Interactive Hackathon Demo Control for Testing Adaptive Loop */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => onNavigate('assessments')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Start Diagnostic
              </button>
              <button
                onClick={onSimulateLowScore}
                disabled={isOrchestrating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                title="Tests how all 4 agents respond when a learner scores 25% on an assessment"
              >
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                Test Low Score (25%)
              </button>
              <button
                onClick={() => downloadStudyPlanMarkdown(profile, targetRole, orchestration)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Export Plan (.md)
              </button>
            </div>
          </div>

          {/* Phase 1 Active Queue */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs text-slate-500">Up Next in Roadmap</div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {orchestration.roadmap[0]?.title || 'Phase 1'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('roadmap')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0"
              >
                <BookOpen className="h-3.5 w-3.5" /> View All Phases
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {phaseOneResources.map((res) => (
                <div key={res.id} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
                  <input
                    type="checkbox"
                    checked={res.completed}
                    onChange={() => onToggleResource(res.id)}
                    aria-label={`Mark ${res.title} as completed`}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className={res.isRemedial ? 'font-semibold text-amber-700' : ''}>
                        {res.isRemedial ? 'Remedial · ' : ''}
                        {res.type}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{res.targetSkill}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{res.durationHours}h</span>
                    </div>
                    <div
                      className={`mt-0.5 text-sm font-medium ${
                        res.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {res.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live 4-Agent Collaboration Pipeline */}
      <AgentPipelinePanel
        steps={orchestration.agentTrace}
        isRunning={isOrchestrating}
        lastTrigger={orchestration.lastTrigger}
        adaptationReason={orchestration.adaptationReason}
        lastUpdated={orchestration.lastUpdated}
      />
    </div>
  );
};
