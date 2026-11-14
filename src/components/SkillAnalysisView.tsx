import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AppTheme, APP_THEMES } from '../themes';
import {
  CareerRole,
  LearnerProfile,
  OrchestrationState,
  SkillAuditItem,
} from '../types';
import { SkillRadarChart } from './SkillRadarChart';

interface SkillAnalysisViewProps {
  mode: 'analysis' | 'career-match';
  profile: LearnerProfile;
  roles: CareerRole[];
  targetRole: CareerRole;
  orchestration: OrchestrationState;
  isOrchestrating: boolean;
  theme?: AppTheme;
  onSelectTargetRole: (roleId: string) => void;
  onAddCustomRole: (role: CareerRole) => void;
}

function computeClientMatchPreview(profile: LearnerProfile, role: CareerRole): number {
  if (role.requirements.length === 0) return 0;
  let weightedEarned = 0;
  let totalWeight = 0;

  for (const req of role.requirements) {
    const weight = req.priority === 'Core' ? 3 : req.priority === 'Important' ? 2 : 1;
    totalWeight += weight;

    const found = profile.existingSkills.find(
      (s) =>
        s.name.toLowerCase() === req.skill.toLowerCase() ||
        req.skill.toLowerCase().includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(req.skill.toLowerCase())
    );
    const current = found ? found.level : 0;
    const ratio = Math.min(1, current / req.requiredLevel);
    weightedEarned += ratio * weight;
  }

  return Math.round((weightedEarned / totalWeight) * 100);
}

export const SkillAnalysisView: React.FC<SkillAnalysisViewProps> = ({
  mode,
  profile,
  roles,
  targetRole,
  orchestration,
  isOrchestrating,
  theme = APP_THEMES[0],
  onSelectTargetRole,
  onAddCustomRole,
}) => {
  const [selectedSkill, setSelectedSkill] = useState<SkillAuditItem | null>(
    orchestration.skillAudits[0] || null
  );
  const [statusFilter, setStatusFilter] = useState<'All' | 'Strength' | 'Developing' | 'Missing'>(
    'All'
  );
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleInput.trim() || isCreatingRole) return;
    setIsCreatingRole(true);
    setRoleError(null);
    try {
      const resp = await fetch('/api/roles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleInput: customRoleInput.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not generate custom role.');
      }
      setCustomRoleInput('');
      onAddCustomRole(data as CareerRole);
    } catch (err: unknown) {
      setRoleError(err instanceof Error ? err.message : 'Unable to create custom role.');
    } finally {
      setIsCreatingRole(false);
    }
  };

  const filteredAudits = orchestration.skillAudits.filter((item) =>
    statusFilter === 'All' ? true : item.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-6 md:flex-row md:items-center">
        <div>
          <div className="text-xs text-slate-500">
            {mode === 'analysis' ? 'Skill Analyst Agent Output' : 'Career Matcher Agent Output'} ·{' '}
            {targetRole.title}
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {mode === 'analysis'
              ? 'Strengths, Weaknesses & Evidence Calibration'
              : 'Target Role Benchmark & Cross-Career Fit'}
          </h1>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-500">Calibrated Readiness</span>
          <span className="font-mono text-2xl font-semibold text-[#1D4ED8] tabular-nums">
            {orchestration.readinessScore}%
          </span>
        </div>
      </div>

      {/* Career Match Cross-Role Comparison (Featured at top in career-match mode) */}
      {mode === 'career-match' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Compare Your Skills Across Career Paths
              </h2>
              <p className="text-xs text-slate-500">
                Switching your target role immediately triggers all 4 AI agents to re-evaluate gaps and rebuild your roadmap.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roles.map((role) => {
              const isSelected = role.id === targetRole.id;
              const matchPct = isSelected
                ? orchestration.readinessScore
                : computeClientMatchPreview(profile, role);

              return (
                <div
                  key={role.id}
                  className={`flex flex-col justify-between rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? 'border-[#0D9488] bg-teal-50/45 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className={isSelected ? 'font-semibold text-[#0D9488]' : 'text-slate-500'}>
                        {role.category}
                      </span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          matchPct >= 70
                            ? 'text-[#059669]'
                            : matchPct >= 45
                              ? 'text-[#2563EB]'
                              : 'text-[#D97706]'
                        }`}
                      >
                        {matchPct}% fit
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{role.title}</h3>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          isSelected ? 'bg-[#0D9488]' : 'bg-[#2563EB]'
                        }`}
                        style={{ width: `${matchPct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {role.summary}
                    </p>
                    <div className="mt-3 text-[11px] font-mono text-slate-500 tabular-nums">
                      Band: {role.medianBand}
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectTargetRole(role.id)}
                    disabled={isSelected || isOrchestrating}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#0D9488] text-white cursor-default'
                        : 'border border-slate-200 bg-white text-slate-800 hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-50'
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    {isSelected ? 'Active Career Goal' : 'Pivot to This Role'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom Career Role / Job Description Builder */}
          <div className="mt-5 rounded-lg border border-teal-200/70 bg-teal-50/35 p-4">
            <div className="text-xs font-semibold text-[#0F766E]">
              Don’t see your target role? Create any custom career benchmark
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Enter any job title (e.g., Cybersecurity Analyst, Flutter Mobile Developer, Embedded Engineer) or paste a job posting.
            </p>
            <form onSubmit={handleCreateCustomRole} className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                placeholder="Enter any job title or paste job requirements..."
                className="flex-1 rounded-lg border border-teal-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-[#0D9488] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isCreatingRole || isOrchestrating || customRoleInput.trim().length < 2}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0D9488] px-4 py-2 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isCreatingRole ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isCreatingRole ? 'Building Role Matrix...' : 'Add & Pivot to Custom Role'}
              </button>
            </form>
            {roleError && <p className="mt-2 text-xs text-red-600">{roleError}</p>}
          </div>
        </section>
      )}

      {/* Radar + Strengths / Weaknesses Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="text-base font-semibold text-slate-900">Competency Radar vs. Benchmark</h2>
          <p className="text-xs text-slate-500">
            Click any vertex to inspect the Skill Analyst rationale below.
          </p>
          <div className="mt-4">
            <SkillRadarChart
              audits={orchestration.skillAudits}
              theme={theme}
              onSelectSkill={(item) => setSelectedSkill(item)}
            />
          </div>
        </section>

        <section className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
                <CheckCircle2 className="h-4 w-4" />
                Calibrated Strengths
              </div>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
                {orchestration.strengths.map((s, i) => (
                  <li key={i} className="rounded-lg border border-emerald-200/70 bg-emerald-50/45 px-3 py-2 text-xs">
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D97706]">
                <AlertTriangle className="h-4 w-4" />
                Identified Weaknesses & Blockers
              </div>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
                {orchestration.weaknesses.map((w, i) => (
                  <li key={i} className="rounded-lg border border-amber-200/70 bg-amber-50/45 px-3 py-2 text-xs">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {selectedSkill && (
            <div className="border-t border-slate-200 pt-4">
              <div className="text-xs font-medium text-slate-500">Selected Skill Evidence</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{selectedSkill.skill}</span>
                <span className="font-mono text-xs text-slate-600 tabular-nums">
                  {selectedSkill.currentLevel}% vs {selectedSkill.targetLevel}% target
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {selectedSkill.rationale}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* High-Density Role Matrix Comparison Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Skill-by-Skill Role Requirement Audit
            </h2>
            <p className="text-xs text-slate-500">
              Comparing logged & assessment-verified skills against {targetRole.title} benchmarks.
            </p>
          </div>

          {/* Segmented Interactive Filter */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start">
            {(['All', 'Strength', 'Developing', 'Missing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Skill</th>
                <th className="py-2.5 px-3">Domain</th>
                <th className="py-2.5 px-3 text-right">Current</th>
                <th className="py-2.5 px-3 text-right">Target</th>
                <th className="py-2.5 px-3 text-right">Gap</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pl-4">Analyst Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAudits.map((row) => (
                <tr
                  key={row.skill}
                  onClick={() => setSelectedSkill(row)}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                >
                  <td className="py-3 pr-4 font-medium text-slate-900">{row.skill}</td>
                  <td className="py-3 px-3 text-xs text-slate-500">{row.category}</td>
                  <td className="py-3 px-3 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                    {row.currentLevel}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {row.targetLevel}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs font-semibold tabular-nums">
                    <span className={row.gap > 35 ? 'text-red-600' : row.gap > 10 ? 'text-amber-700' : 'text-emerald-700'}>
                      {row.gap > 0 ? `-${row.gap}%` : '0%'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {row.status === 'Strength' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Strength
                      </span>
                    )}
                    {row.status === 'Developing' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap">
                        <ArrowRight className="h-3.5 w-3.5" /> Developing
                      </span>
                    )}
                    {row.status === 'Missing' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 whitespace-nowrap">
                        <AlertCircle className="h-3.5 w-3.5" /> Missing
                      </span>
                    )}
                  </td>
                  <td className="py-3 pl-4 text-xs text-slate-600">{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
