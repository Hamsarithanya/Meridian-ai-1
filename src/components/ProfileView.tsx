import React, { useEffect, useState } from 'react';
import {
  Award,
  FolderGit2,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import {
  CareerRole,
  Certification,
  LearnerPreset,
  LearnerProfile,
  ProjectItem,
  SkillCategory,
  SkillEntry,
} from '../types';

interface ProfileViewProps {
  profile: LearnerProfile;
  roles: CareerRole[];
  presets: LearnerPreset[];
  isOrchestrating: boolean;
  onUpdateProfile: (next: LearnerProfile, triggerReason?: string) => void;
}

const CATEGORIES: SkillCategory[] = [
  'Frontend',
  'Backend',
  'Database',
  'AI & Data',
  'DevOps',
  'Foundations',
];

const QUICK_SKILLS: { name: string; category: SkillCategory }[] = [
  { name: 'Python', category: 'Backend' },
  { name: 'JavaScript', category: 'Frontend' },
  { name: 'React', category: 'Frontend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'SQL', category: 'Database' },
  { name: 'HTML & CSS', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'Docker & Kubernetes', category: 'DevOps' },
  { name: 'Git', category: 'DevOps' },
  { name: 'PyTorch & Deep Learning', category: 'AI & Data' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  roles,
  presets,
  isOrchestrating,
  onUpdateProfile,
}) => {
  const [draft, setDraft] = useState<LearnerProfile>(profile);
  const [bioPasteText, setBioPasteText] = useState('');
  const [isParsingBio, setIsParsingBio] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(50);
  const [newSkillCat, setNewSkillCat] = useState<SkillCategory>('Frontend');

  const [newCertTitle, setNewCertTitle] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertYear, setNewCertYear] = useState('2026');

  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjSummary, setNewProjSummary] = useState('');
  const [newProjSkills, setNewProjSkills] = useState('');
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(profile);

  const handleQuickAddSkill = (name: string, category: SkillCategory) => {
    const exists = draft.existingSkills.some(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) return;
    const entry: SkillEntry = {
      id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      level: 60,
      category,
      verifiedVia: 'Self-reported',
    };
    setDraft((prev) => ({
      ...prev,
      existingSkills: [...prev.existingSkills, entry],
    }));
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const entry: SkillEntry = {
      id: `sk-${Date.now()}`,
      name: newSkillName.trim(),
      level: newSkillLevel,
      category: newSkillCat,
      verifiedVia: 'Self-reported',
    };
    setDraft((prev) => ({
      ...prev,
      existingSkills: [...prev.existingSkills, entry],
    }));
    setNewSkillName('');
    setNewSkillLevel(50);
  };

  const handleSkillLevelChange = (id: string, level: number) => {
    setDraft((prev) => ({
      ...prev,
      existingSkills: prev.existingSkills.map((s) => (s.id === id ? { ...s, level } : s)),
    }));
  };

  const handleRemoveSkill = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      existingSkills: prev.existingSkills.filter((s) => s.id !== id),
    }));
  };

  const handleAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCertTitle.trim()) return;
    const cert: Certification = {
      id: `cert-${Date.now()}`,
      title: newCertTitle.trim(),
      issuer: newCertIssuer.trim() || 'Independent',
      year: newCertYear.trim() || '2026',
    };
    setDraft((prev) => ({
      ...prev,
      certifications: [...prev.certifications, cert],
    }));
    setNewCertTitle('');
    setNewCertIssuer('');
  };

  const handleRemoveCert = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== id),
    }));
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim()) return;
    const proj: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: newProjTitle.trim(),
      summary: newProjSummary.trim() || 'Applied technical build.',
      skillsUsed: newProjSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setDraft((prev) => ({
      ...prev,
      projects: [...prev.projects, proj],
    }));
    setNewProjTitle('');
    setNewProjSummary('');
    setNewProjSkills('');
  };

  const handleRemoveProject = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  };

  const handleSaveAndAnalyze = () => {
    const selectedRole = roles.find((r) => r.id === draft.targetRoleId);
    const goalChanged = draft.targetRoleId !== profile.targetRoleId;
    const reason = goalChanged
      ? `Career goal updated to ${selectedRole?.title || 'new target role'} for ${draft.name}`
      : `Updated learner details, skills, and project evidence for ${draft.name}`;
    onUpdateProfile(draft, reason);
  };

  const handleApplyPreset = (preset: LearnerPreset) => {
    setAvatarLoadError(false);
    setDraft(preset.profile);
    onUpdateProfile(
      preset.profile,
      `Loaded ${preset.profile.name} profile targeting ${
        roles.find((r) => r.id === preset.profile.targetRoleId)?.title || 'new role'
      }`
    );
  };

  const handleStartBlank = () => {
    setAvatarLoadError(false);
    setDraft({
      name: '',
      headline: '',
      location: '',
      avatarUrl: '',
      targetRoleId: roles[0]?.id || 'full-stack-dev',
      bio: '',
      weeklyHoursBudget: 10,
      existingSkills: [],
      certifications: [],
      projects: [],
      assessmentHistory: [],
    });
  };

  const handleAiAutoFill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bioPasteText.trim() || isParsingBio) return;
    setIsParsingBio(true);
    setParseError(null);
    try {
      const resp = await fetch('/api/profile/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bioPasteText.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not extract profile details.');
      }

      const validRole = roles.some((r) => r.id === data.targetRoleId)
        ? data.targetRoleId
        : draft.targetRoleId;

      const nextProfile: LearnerProfile = {
        name: data.name || draft.name || 'Learner',
        headline: data.headline || 'Engineering Student',
        location: data.location || 'Remote',
        avatarUrl: '',
        targetRoleId: validRole,
        bio: data.bio || bioPasteText.trim(),
        weeklyHoursBudget: Math.max(4, Math.min(35, Number(data.weeklyHoursBudget) || 10)),
        existingSkills: (data.existingSkills || []).map(
          (s: { name: string; level: number; category: string; verifiedVia: string }, idx: number) => ({
            id: `sk-ai-${Date.now()}-${idx}`,
            name: s.name,
            level: Math.max(10, Math.min(100, Number(s.level) || 50)),
            category: CATEGORIES.includes(s.category as SkillCategory)
              ? (s.category as SkillCategory)
              : 'Foundations',
            verifiedVia: s.verifiedVia || 'Extracted from Bio',
          })
        ),
        certifications: (data.certifications || []).map(
          (c: { title: string; issuer: string; year: string }, idx: number) => ({
            id: `cert-ai-${Date.now()}-${idx}`,
            title: c.title,
            issuer: c.issuer || 'Verified',
            year: c.year || '2026',
          })
        ),
        projects: (data.projects || []).map(
          (p: { title: string; summary: string; skillsUsed: string[] }, idx: number) => ({
            id: `proj-ai-${Date.now()}-${idx}`,
            title: p.title,
            summary: p.summary,
            skillsUsed: Array.isArray(p.skillsUsed) ? p.skillsUsed : [],
          })
        ),
        assessmentHistory: [],
      };

      setAvatarLoadError(false);
      setDraft(nextProfile);
      setBioPasteText('');
      onUpdateProfile(
        nextProfile,
        `Auto-filled profile for ${nextProfile.name} and calibrated ${
          roles.find((r) => r.id === nextProfile.targetRoleId)?.title || 'target role'
        }`
      );
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Unable to parse bio.');
    } finally {
      setIsParsingBio(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Option 1: AI Auto-Fill from Bio / Resume */}
      <section className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/70 p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-[#4F46E5]">
              Gemini Smart Profile Extractor
            </div>
            <h2 className="mt-0.5 text-base font-semibold text-slate-900">
              Fastest Way: Auto-Fill Your Details with AI
            </h2>
            <p className="text-xs text-slate-600">
              Paste a short introduction or resume snippet below. Gemini will populate your name, skills, projects, certifications, and build your roadmap automatically.
            </p>
          </div>
        </div>

        <form onSubmit={handleAiAutoFill} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <textarea
            rows={2}
            value={bioPasteText}
            onChange={(e) => setBioPasteText(e.target.value)}
            placeholder='Example: "Hi, I am Rithanya from Coimbatore, final-year CSE student. I know Python, SQL, and basic HTML. I built a Smart Attendance System and want to become a Full Stack Developer with 12 hrs/week."'
            className="flex-1 rounded-lg border border-indigo-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-900 focus:border-[#4F46E5] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isParsingBio || isOrchestrating || bioPasteText.trim().length < 8}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#4F46E5] px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isParsingBio ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {isParsingBio ? 'Extracting Details...' : 'Auto-Fill & Build Plan'}
          </button>
        </form>

        {parseError && (
          <p className="mt-2 text-xs text-red-600">{parseError}</p>
        )}
      </section>

      {/* Option 2: Quick-Load Sample Personas */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Or Try a Sample Persona / Start Fresh
            </h2>
            <p className="text-xs text-slate-500">
              Switch instantly between pre-built learners or clear all fields to type your own manually.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartBlank}
            disabled={isOrchestrating}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 self-start whitespace-nowrap"
          >
            Clear & Enter Manually
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {presets.map((preset) => {
            const isCurrent = draft.name === preset.profile.name;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={isOrchestrating}
                onClick={() => handleApplyPreset(preset)}
                className={`rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
                  isCurrent
                    ? 'border-[#1D4ED8] bg-blue-50/40'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900">{preset.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-600">{preset.subtitle}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Profile Header Banner + Primary Save CTA */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          {!avatarLoadError && draft.avatarUrl ? (
            <img
              src={draft.avatarUrl}
              alt={`${draft.name || 'Learner'} profile portrait`}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadError(true)}
              className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600">
              <User className="h-7 w-7" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {draft.name || 'Your Name'}
            </h1>
            <p className="text-sm text-slate-600">
              {draft.headline || 'Your Current Role / Year'} · {draft.location || 'Your City'}
            </p>
            {hasUnsavedChanges && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                You have unsaved edits — click "Save & Re-Analyze Profile" to update your AI roadmap.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSaveAndAnalyze}
          disabled={isOrchestrating || !draft.name.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isOrchestrating ? 'animate-spin' : ''}`} />
          {isOrchestrating ? 'Agents Re-Calibrating...' : 'Save & Re-Analyze Profile'}
        </button>
      </div>

      {/* Learner Details & Career Goal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Learner Details & Career Goal</h2>

          <div>
            <label className="block text-xs font-medium text-slate-600">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">Current Role / Stage</label>
              <input
                type="text"
                placeholder="e.g., 3rd Year B.Tech CSE"
                value={draft.headline}
                onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">Location</label>
              <input
                type="text"
                placeholder="e.g., Coimbatore, IN"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Target Career Goal</label>
            <select
              value={draft.targetRoleId}
              onChange={(e) => setDraft({ ...draft, targetRoleId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Weekly Study Budget</span>
              <span className="font-mono text-slate-900 tabular-nums">
                {draft.weeklyHoursBudget} hrs / week
              </span>
            </div>
            <input
              type="range"
              min={4}
              max={35}
              step={1}
              value={draft.weeklyHoursBudget}
              onChange={(e) =>
                setDraft({ ...draft, weeklyHoursBudget: Number(e.target.value) })
              }
              className="mt-2 w-full accent-[#1D4ED8]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Background Summary</label>
            <textarea
              rows={3}
              placeholder="Briefly describe your academic or work background and learning interests..."
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
        </section>

        {/* Existing Skills Inventory */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Existing Skills Inventory</h2>
              <p className="text-xs text-slate-500">
                Tap quick-add skills below or type any skill and set your proficiency slider.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {draft.existingSkills.length} logged
            </span>
          </div>

          {/* One-Tap Quick Skill Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SKILLS.map((qs) => {
              const alreadyAdded = draft.existingSkills.some(
                (s) => s.name.toLowerCase() === qs.name.toLowerCase()
              );
              return (
                <button
                  key={qs.name}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => handleQuickAddSkill(qs.name, qs.category)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    alreadyAdded
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-default'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
                  }`}
                >
                  {alreadyAdded ? `✓ ${qs.name}` : `+ ${qs.name}`}
                </button>
              );
            })}
          </div>

          {draft.existingSkills.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
              No skills added yet. Tap any quick-add skill above or enter one below.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {draft.existingSkills.map((skill) => (
                <div key={skill.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">{skill.name}</div>
                    <div className="text-xs text-slate-500">
                      {skill.category} · {skill.verifiedVia}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      aria-label={`${skill.name} proficiency percentage`}
                      value={skill.level}
                      onChange={(e) => handleSkillLevelChange(skill.id, Number(e.target.value))}
                      className="w-32 accent-[#1D4ED8]"
                    />
                    <span className="w-11 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {skill.level}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill.id)}
                      aria-label={`Remove ${skill.name}`}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Custom Skill Form */}
          <form
            onSubmit={handleAddSkill}
            className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-4 sm:grid-cols-12"
          >
            <input
              type="text"
              placeholder="Custom skill (e.g., C++, Tailwind, Kubernetes)"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-5 focus:border-[#1D4ED8] focus:outline-none"
            />
            <select
              value={newSkillCat}
              onChange={(e) => setNewSkillCat(e.target.value as SkillCategory)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs sm:col-span-3 focus:border-[#1D4ED8] focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="number"
                min={5}
                max={100}
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 font-mono text-xs tabular-nums focus:border-[#1D4ED8] focus:outline-none"
              />
              <span className="text-xs text-slate-500">%</span>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 sm:col-span-2 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>
        </section>
      </div>

      {/* Certifications & Projects */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Certifications */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">Certifications</h2>
          </div>

          {draft.certifications.length === 0 ? (
            <p className="text-xs text-slate-500">No certifications logged yet. Add one below if applicable.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {draft.certifications.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{cert.title}</div>
                    <div className="text-xs text-slate-500">
                      {cert.issuer} · <span className="font-mono tabular-nums">{cert.year}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCert(cert.id)}
                    aria-label={`Remove ${cert.title}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddCert} className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-4 sm:grid-cols-12">
            <input
              type="text"
              placeholder="Certification title"
              value={newCertTitle}
              onChange={(e) => setNewCertTitle(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs sm:col-span-5"
            />
            <input
              type="text"
              placeholder="Issuer"
              value={newCertIssuer}
              onChange={(e) => setNewCertIssuer(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs sm:col-span-3"
            />
            <input
              type="text"
              placeholder="Year"
              value={newCertYear}
              onChange={(e) => setNewCertYear(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-2 font-mono text-xs sm:col-span-2"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 sm:col-span-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>
        </section>

        {/* Projects */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">Applied Projects</h2>
          </div>

          {draft.projects.length === 0 ? (
            <p className="text-xs text-slate-500">No projects logged yet. Adding projects helps agents tailor your capstone labs.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {draft.projects.map((proj) => (
                <div key={proj.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{proj.title}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{proj.summary}</p>
                    <div className="mt-1 text-[11px] font-medium text-slate-500">
                      Stack: {proj.skillsUsed.join(' · ') || 'General'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(proj.id)}
                    aria-label={`Remove ${proj.title}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddProject} className="space-y-2 border-t border-slate-200 pt-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Project title"
                value={newProjTitle}
                onChange={(e) => setNewProjTitle(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Skills used (comma separated)"
                value={newProjSkills}
                onChange={(e) => setNewProjSkills(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="One-line outcome summary"
                value={newProjSummary}
                onChange={(e) => setNewProjSummary(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" /> Add Project
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="text-xs text-slate-600">
          {hasUnsavedChanges
            ? 'Ready to apply your edits? Save below to have all 4 AI agents analyze your updated profile.'
            : 'Your profile is synced with the multi-agent workspace.'}
        </div>
        <button
          onClick={handleSaveAndAnalyze}
          disabled={isOrchestrating || !draft.name.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isOrchestrating ? 'animate-spin' : ''}`} />
          {isOrchestrating ? 'Agents Re-Calibrating...' : 'Save My Details & Update Roadmap'}
        </button>
      </div>
    </div>
  );
};
