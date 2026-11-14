import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Compass,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
} from 'lucide-react';
import { downloadStudyPlanMarkdown } from '../lib/exportPlan';
import {
  CareerRole,
  GroundedSearchResult,
  LabReviewResult,
  LearnerProfile,
  LearningResource,
  OrchestrationState,
} from '../types';

interface RoadmapViewProps {
  profile: LearnerProfile;
  targetRole: CareerRole;
  orchestration: OrchestrationState;
  weeklyHoursBudget: number;
  targetRoleTitle: string;
  onToggleResource: (resourceId: string) => void;
  onMarkResourceCompleted: (resourceId: string) => void;
  onAskMentorAboutResource: (resource: LearningResource) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  profile,
  targetRole,
  orchestration,
  weeklyHoursBudget,
  targetRoleTitle,
  onToggleResource,
  onMarkResourceCompleted,
  onAskMentorAboutResource,
}) => {
  const [filter, setFilter] = useState<
    'All' | 'Course' | 'Tutorial' | 'Practical Exercise' | 'Remedial'
  >('All');
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Interactive Lab Review state keyed by resource ID
  const [labInputs, setLabInputs] = useState<Record<string, string>>({});
  const [labReviews, setLabReviews] = useState<Record<string, LabReviewResult>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [labErrors, setLabErrors] = useState<Record<string, string>>({});

  // Google Search Grounding state keyed by resource ID
  const [searchResults, setSearchResults] = useState<Record<string, GroundedSearchResult>>({});
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [searchErrors, setSearchErrors] = useState<Record<string, string>>({});

  // Standalone Learning Resource Finder state (top of Roadmap)
  const [customLinkQuery, setCustomLinkQuery] = useState<string>(
    orchestration.missingSkills[0] || targetRole.requirements[0]?.skill || 'JavaScript'
  );
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [finderResult, setFinderResult] = useState<GroundedSearchResult | null>(null);
  const [isFindingCustomLinks, setIsFindingCustomLinks] = useState(false);
  const [finderError, setFinderError] = useState<string | null>(null);

  const quickSearchSkills = Array.from(
    new Set([
      ...orchestration.missingSkills,
      ...targetRole.requirements.map((r) => r.skill),
    ])
  ).slice(0, 6);

  const allResources = orchestration.roadmap.flatMap((p) => p.resources);
  const completedCount = allResources.filter((r) => r.completed).length;
  const totalHours = allResources.reduce((sum, r) => sum + r.durationHours, 0);
  const completedHours = allResources
    .filter((r) => r.completed)
    .reduce((sum, r) => sum + r.durationHours, 0);
  const remainingHours = Math.max(0, totalHours - completedHours);
  const estimatedWeeks =
    weeklyHoursBudget > 0 ? Math.max(1, Math.ceil(remainingHours / weeklyHoursBudget)) : 4;
  const progressPct =
    allResources.length > 0 ? Math.round((completedCount / allResources.length) * 100) : 0;

  const handleFindCustomLinks = async (
    skillOverride?: string,
    pricingOverride?: 'all' | 'free' | 'paid'
  ) => {
    const query = (skillOverride ?? customLinkQuery).trim();
    const effectivePricing = pricingOverride ?? pricingFilter;
    if (!query || isFindingCustomLinks) return;
    if (skillOverride) setCustomLinkQuery(skillOverride);
    if (pricingOverride) setPricingFilter(pricingOverride);

    setIsFindingCustomLinks(true);
    setFinderError(null);
    try {
      const resp = await fetch('/api/resources/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: query,
          targetRoleTitle,
          pricing: effectivePricing,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not find learning links.');
      }
      setFinderResult(data as GroundedSearchResult);
    } catch (err: unknown) {
      setFinderError(err instanceof Error ? err.message : 'Unable to search learning links.');
    } finally {
      setIsFindingCustomLinks(false);
    }
  };

  const handleSearchLiveResources = async (res: LearningResource) => {
    if (searchingId) return;
    setSearchingId(res.id);
    setSearchErrors((prev) => ({ ...prev, [res.id]: '' }));
    try {
      const resp = await fetch('/api/resources/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: res.targetSkill,
          targetRoleTitle,
          pricing: 'all',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not find live courses.');
      }
      setSearchResults((prev) => ({ ...prev, [res.id]: data as GroundedSearchResult }));
    } catch (err: unknown) {
      setSearchErrors((prev) => ({
        ...prev,
        [res.id]: err instanceof Error ? err.message : 'Search failed.',
      }));
    } finally {
      setSearchingId(null);
    }
  };

  const handleSubmitLabReview = async (res: LearningResource) => {
    const submission = (labInputs[res.id] || '').trim();
    if (!submission || reviewingId) return;
    setReviewingId(res.id);
    setLabErrors((prev) => ({ ...prev, [res.id]: '' }));
    try {
      const resp = await fetch('/api/labs/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseTitle: res.title,
          exercisePrompt: res.exercisePrompt || res.description,
          targetSkill: res.targetSkill,
          submission,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Lab review failed.');
      }
      const review = data as LabReviewResult;
      setLabReviews((prev) => ({ ...prev, [res.id]: review }));
      if (review.passed && !res.completed) {
        onMarkResourceCompleted(res.id);
      }
    } catch (err: unknown) {
      setLabErrors((prev) => ({
        ...prev,
        [res.id]: err instanceof Error ? err.message : 'Unable to review submission.',
      }));
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress & Adaptation Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs text-slate-500">
              Curriculum Architect Agent · Personalized for {targetRoleTitle}
            </div>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              Adaptive Learning Roadmap & Practical Labs
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {orchestration.adaptationReason}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-slate-200 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <div>
              <div className="text-[11px] text-slate-500">Completion</div>
              <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                {progressPct}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Hours Logged</div>
              <div className="font-mono text-xl font-semibold text-[#1D4ED8] tabular-nums">
                {completedHours.toFixed(1)}h
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Est. Pace</div>
              <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums">
                ~{estimatedWeeks} wks
              </div>
            </div>
            <button
              onClick={() => downloadStudyPlanMarkdown(profile, targetRole, orchestration)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Export Study Plan (.md)
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['All', 'Course', 'Tutorial', 'Practical Exercise', 'Remedial'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    filter === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'Remedial' ? 'Remedial Focus' : tab}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            {remainingHours.toFixed(1)}h remaining at {weeklyHoursBudget}h/week
          </div>
        </div>
      </section>

      {/* Free & Paid Course Link Finder */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
              <Globe className="h-3.5 w-3.5" />
              Course &amp; Learning Link Finder (Free &amp; Paid)
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Discover verified free official docs &amp; tutorials alongside top-rated paid courses and certificate tracks.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0">
            {(
              [
                { id: 'all', label: 'All (Free & Paid)' },
                { id: 'free', label: 'Free Only' },
                { id: 'paid', label: 'Paid Courses' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={isFindingCustomLinks}
                onClick={() => {
                  setPricingFilter(opt.id);
                  if (finderResult) {
                    void handleFindCustomLinks(finderResult.skill, opt.id);
                  }
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  pricingFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleFindCustomLinks();
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={customLinkQuery}
              onChange={(e) => setCustomLinkQuery(e.target.value)}
              placeholder="Enter any skill or topic (e.g., JavaScript, React, SQL, Docker, PyTorch)..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isFindingCustomLinks || !customLinkQuery.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#059669] px-4 py-2 text-xs font-medium text-white hover:opacity-95 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isFindingCustomLinks ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            {isFindingCustomLinks ? 'Finding Courses...' : 'Find Links & Courses'}
          </button>
        </form>

        {/* Quick skill selectors */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-medium text-slate-500 mr-1">Priority skills:</span>
          {quickSearchSkills.map((sk) => (
            <button
              key={sk}
              type="button"
              onClick={() => void handleFindCustomLinks(sk)}
              disabled={isFindingCustomLinks}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {sk}
            </button>
          ))}
        </div>

        {finderError && <p className="text-xs text-red-600">{finderError}</p>}

        {finderResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-800">
                Resources &amp; Courses for {finderResult.skill}
              </span>
              {finderResult.sourceMode && (
                <span className="font-mono text-[11px] text-slate-600">
                  {finderResult.sourceMode === 'live-search'
                    ? 'Live Web Search'
                    : finderResult.sourceMode === 'ai-curated'
                      ? 'AI Curated Links'
                      : 'Verified Course Directory'}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-700">{finderResult.guidance}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {finderResult.links.map((link) => {
                const isPaid = link.pricing === 'Paid';
                return (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-xs transition-colors ${
                      isPaid
                        ? 'border-indigo-200 hover:bg-indigo-50/60'
                        : 'border-emerald-200 hover:bg-emerald-50/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                            isPaid ? 'text-[#4F46E5]' : 'text-[#059669]'
                          }`}
                        >
                          {isPaid ? 'Paid' : 'Free'}
                        </span>
                        <span className="truncate font-semibold text-slate-900">{link.title}</span>
                      </div>
                      {(link.provider || link.note) && (
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">
                          {[link.provider, link.note].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <ExternalLink
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isPaid ? 'text-[#4F46E5]' : 'text-[#059669]'
                      }`}
                    />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Up Next Spotlight */}
      {(() => {
        const nextUp = allResources.find((r) => !r.completed);
        if (!nextUp) return null;
        return (
          <section className="flex flex-col justify-between gap-4 rounded-xl border border-[#1D4ED8]/30 bg-blue-50/30 p-5 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-semibold text-[#1D4ED8]">
                Recommended Next Step · {nextUp.targetSkill} · {nextUp.durationHours}h
              </div>
              <h2 className="mt-1 text-base font-semibold text-slate-900">{nextUp.title}</h2>
              <p className="mt-0.5 text-xs text-slate-600">{nextUp.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onAskMentorAboutResource(nextUp)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <MessageSquare className="h-3.5 w-3.5 text-[#1D4ED8]" />
                Ask Mentor
              </button>
              <button
                onClick={() => onToggleResource(nextUp.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Complete
              </button>
            </div>
          </section>
        );
      })()}

      {/* Phases */}
      <div className="space-y-6">
        {orchestration.roadmap.map((phase, phaseIndex) => {
          const filteredResources = phase.resources.filter((r) => {
            if (filter === 'All') return true;
            if (filter === 'Remedial') return Boolean(r.isRemedial);
            return r.type === filter;
          });

          if (filteredResources.length === 0) return null;

          const phaseCompleted = phase.resources.filter((r) => r.completed).length;
          const phaseThemes = [
            {
              headerBg: 'bg-blue-50/75 border-b border-blue-100',
              labelColor: 'text-[#2563EB]',
              countColor: 'text-[#2563EB]',
            },
            {
              headerBg: 'bg-teal-50/75 border-b border-teal-100',
              labelColor: 'text-[#0D9488]',
              countColor: 'text-[#0D9488]',
            },
            {
              headerBg: 'bg-indigo-50/75 border-b border-indigo-100',
              labelColor: 'text-[#4F46E5]',
              countColor: 'text-[#4F46E5]',
            },
          ];
          const phaseTheme = phaseThemes[phaseIndex % phaseThemes.length];

          return (
            <section
              key={phase.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div
                className={`flex flex-col justify-between gap-2 px-6 py-4 sm:flex-row sm:items-center ${phaseTheme.headerBg}`}
              >
                <div>
                  <div className={`font-mono text-[11px] font-semibold uppercase tracking-wide ${phaseTheme.labelColor}`}>
                    Learning Phase 0{phaseIndex + 1}
                  </div>
                  <h2 className="mt-0.5 text-base font-semibold text-slate-900">{phase.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-600">{phase.focusSummary}</p>
                </div>
                <div className={`font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 ${phaseTheme.countColor}`}>
                  {phaseCompleted} / {phase.resources.length} completed
                </div>
              </div>

              <div className="divide-y divide-slate-100 px-6 py-2">
                {filteredResources.map((res) => {
                  const isExercise = res.type === 'Practical Exercise';
                  const isExpanded = expandedExerciseId === res.id;
                  const liveSearch = searchResults[res.id];
                  const labReview = labReviews[res.id];

                  return (
                    <div
                      key={res.id}
                      className={`py-4 ${
                        res.isRemedial ? '-mx-6 bg-amber-50/35 px-6' : ''
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={res.completed}
                            onChange={() => onToggleResource(res.id)}
                            aria-label={`Mark ${res.title} complete`}
                            className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              {res.isRemedial && (
                                <>
                                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                                    <AlertTriangle className="h-3 w-3" /> Remedial Insertion
                                  </span>
                                  <span aria-hidden="true">·</span>
                                </>
                              )}
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                                {res.type === 'Course' && <BookOpen className="h-3 w-3" />}
                                {res.type === 'Tutorial' && <Compass className="h-3 w-3" />}
                                {res.type === 'Practical Exercise' && (
                                  <Code2 className="h-3 w-3 text-[#1D4ED8]" />
                                )}
                                {res.type}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{res.targetSkill}</span>
                              <span aria-hidden="true">·</span>
                              <span>{res.difficulty}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">{res.durationHours}h</span>
                            </div>

                            <h3
                              className={`mt-1 text-sm font-semibold ${
                                res.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                              }`}
                            >
                              {res.title}
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                              {res.description}
                            </p>
                            <div className="mt-1 text-[11px] text-slate-400">
                              Source: {res.provider}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pl-7 xl:pl-0 shrink-0">
                          <button
                            onClick={() => handleSearchLiveResources(res)}
                            disabled={searchingId === res.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                          >
                            {searchingId === res.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Globe className="h-3.5 w-3.5 text-emerald-700" />
                            )}
                            {searchingId === res.id ? 'Searching...' : 'Find Free & Paid Links'}
                          </button>

                          {isExercise && (
                            <button
                              onClick={() =>
                                setExpandedExerciseId(isExpanded ? null : res.id)
                              }
                              className="rounded-lg border border-[#1D4ED8]/40 bg-blue-50/40 px-3 py-1.5 text-xs font-medium text-[#1D4ED8] hover:bg-blue-50 whitespace-nowrap"
                            >
                              {isExpanded ? 'Hide Lab Workspace' : 'Open AI Lab Workspace'}
                            </button>
                          )}

                          <button
                            onClick={() => onAskMentorAboutResource(res)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-[#1D4ED8]" />
                            Ask Mentor
                          </button>

                          <button
                            onClick={() => onToggleResource(res.id)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                              res.completed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {res.completed ? 'Completed' : 'Complete'}
                          </button>
                        </div>
                      </div>

                      {/* Grounded Google Search Free & Paid Resources Panel */}
                      {searchErrors[res.id] && (
                        <div className="mt-3 ml-7 text-xs text-red-600">{searchErrors[res.id]}</div>
                      )}
                      {liveSearch && (
                        <div className="mt-3 ml-7 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                              <Globe className="h-3.5 w-3.5" />
                              Free &amp; Paid Courses for {liveSearch.skill}
                            </div>
                            {liveSearch.sourceMode && (
                              <span className="font-mono text-[11px] text-emerald-700">
                                {liveSearch.sourceMode === 'live-search'
                                  ? 'Live Web Search'
                                  : liveSearch.sourceMode === 'ai-curated'
                                    ? 'AI Curated Links'
                                    : 'Verified Course Directory'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed text-slate-700">
                            {liveSearch.guidance}
                          </p>
                          {liveSearch.links.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {liveSearch.links.map((link) => {
                                const isPaid = link.pricing === 'Paid';
                                return (
                                  <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-xs font-medium ${
                                      isPaid
                                        ? 'border-indigo-200 text-indigo-800 hover:bg-indigo-50'
                                        : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                                    }`}
                                  >
                                    <span
                                      className={`text-[10px] font-bold uppercase ${
                                        isPaid ? 'text-[#4F46E5]' : 'text-[#059669]'
                                      }`}
                                    >
                                      {isPaid ? 'Paid' : 'Free'}
                                    </span>
                                    <span className="max-w-[230px] truncate">{link.title}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Interactive AI Practical Exercise Lab Workspace */}
                      {isExercise && isExpanded && (
                        <div className="mt-3 ml-7 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              Practical Exercise Brief
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-700">
                              {res.exercisePrompt || res.description}
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700">
                              Your Code, SQL, or Implementation Approach
                            </label>
                            <textarea
                              rows={5}
                              value={labInputs[res.id] || ''}
                              onChange={(e) =>
                                setLabInputs((prev) => ({ ...prev, [res.id]: e.target.value }))
                              }
                              placeholder={`Write or paste your ${res.targetSkill} solution, pseudocode, or component outline here for instant AI engineering review...`}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500">
                              Passing score (70%+) automatically marks this practical lab complete.
                            </span>
                            <button
                              onClick={() => handleSubmitLabReview(res)}
                              disabled={
                                reviewingId === res.id || (labInputs[res.id] || '').trim().length < 5
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                            >
                              {reviewingId === res.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                              {reviewingId === res.id
                                ? 'Reviewing Solution...'
                                : 'Review My Solution with AI'}
                            </button>
                          </div>

                          {labErrors[res.id] && (
                            <p className="text-xs text-red-600">{labErrors[res.id]}</p>
                          )}

                          {labReview && (
                            <div
                              className={`rounded-lg border p-3.5 space-y-2 ${
                                labReview.passed
                                  ? 'border-emerald-200 bg-white'
                                  : 'border-amber-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-xs font-semibold ${
                                    labReview.passed ? 'text-emerald-700' : 'text-amber-700'
                                  }`}
                                >
                                  {labReview.passed ? 'Lab Passed & Logged' : 'Needs Refinement'}
                                </span>
                                <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                                  Score: {labReview.score}%
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed text-slate-700">
                                {labReview.summary}
                              </p>
                              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                                <div>
                                  <div className="text-[11px] font-semibold text-emerald-700">
                                    Strengths
                                  </div>
                                  <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                    {labReview.strengths.map((s, idx) => (
                                      <li key={idx}>· {s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="text-[11px] font-semibold text-amber-700">
                                    Improvements & Edge Cases
                                  </div>
                                  <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                    {labReview.improvements.map((im, idx) => (
                                      <li key={idx}>· {im}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <div className="border-t border-slate-100 pt-2 text-xs text-slate-700">
                                <span className="font-semibold text-slate-900">Next Tip: </span>
                                {labReview.refactoredTip}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
