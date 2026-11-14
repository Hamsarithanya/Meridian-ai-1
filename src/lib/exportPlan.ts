import { CareerRole, LearnerProfile, OrchestrationState } from '../types';

export function downloadStudyPlanMarkdown(
  profile: LearnerProfile,
  targetRole: CareerRole,
  orchestration: OrchestrationState
) {
  const lines: string[] = [
    `# Meridian AI — Personalized Career & Learning Roadmap`,
    ``,
    `- **Learner:** ${profile.name} (${profile.headline})`,
    `- **Target Role:** ${targetRole.title} (${targetRole.category})`,
    `- **Calibrated Readiness:** ${orchestration.readinessScore}%`,
    `- **Weekly Study Budget:** ${profile.weeklyHoursBudget} hrs/week`,
    `- **Last Sync Trigger:** ${orchestration.lastTrigger}`,
    ``,
    `## Mentor Briefing`,
    `${orchestration.mentorBriefing}`,
    ``,
    `## Skill Gap Summary`,
    `- **Missing / Priority Skills:** ${orchestration.missingSkills.join(', ') || 'None'}`,
    ``,
    `### Verified Strengths`,
    ...orchestration.strengths.map((s) => `- ${s}`),
    ``,
    `### Priority Weaknesses`,
    ...orchestration.weaknesses.map((w) => `- ${w}`),
    ``,
    `### Role Requirement Matrix`,
    `| Skill | Current | Target | Gap | Status |`,
    `|---|---:|---:|---:|---|`,
    ...orchestration.skillAudits.map(
      (a) => `| ${a.skill} | ${a.currentLevel}% | ${a.targetLevel}% | ${a.gap}% | ${a.status} |`
    ),
    ``,
    `## Personalized Learning Roadmap`,
  ];

  for (const phase of orchestration.roadmap) {
    lines.push(``);
    lines.push(`### ${phase.title}`);
    lines.push(`${phase.focusSummary}`);
    lines.push(``);
    for (const res of phase.resources) {
      const check = res.completed ? 'x' : ' ';
      const remedialTag = res.isRemedial ? ' [REMEDIAL]' : '';
      lines.push(
        `- [${check}] **${res.title}** (${res.type}${remedialTag} · ${res.targetSkill} · ${res.durationHours}h · ${res.provider})`
      );
      lines.push(`  - ${res.description}`);
      if (res.exercisePrompt) {
        lines.push(`  - *Lab Brief:* ${res.exercisePrompt}`);
      }
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meridian-ai-${targetRole.id}-roadmap.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
