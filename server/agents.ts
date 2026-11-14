import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AgentTraceStep,
  AssessmentQuiz,
  AssessmentResult,
  CareerRole,
  GroundedResourceLink,
  GroundedSearchResult,
  InterviewFeedback,
  InterviewQuestion,
  LabReviewResult,
  LearnerProfile,
  MentorActionSuggestion,
  OrchestrationState,
  SkillCategory,
} from '../src/types';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isQuotaOrModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('404') ||
    msg.includes('NOT_FOUND')
  );
}

function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('403') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid')
  );
}

export function formatGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (isAuthError(err)) {
    return 'Gemini API key permission or validation failed. Please verify your API key in Settings > Secrets.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota')) {
    const retryMatch = raw.match(/retry in\s+([0-9a-zA-Z.]+)/i);
    const retryNote = retryMatch ? ` (retry window: ${retryMatch[1]})` : '';
    return `Free-tier Gemini request quota reached${retryNote}. Wait briefly or select a billing-enabled API key in Settings > Secrets for higher limits.`;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return String(parsed.error.message).split('\n')[0];
    }
  } catch {
    // not JSON
  }
  return raw.length > 220 ? `${raw.slice(0, 220)}...` : raw;
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      // Fail fast on auth, bad request, or quota exhaustion so model fallback runs immediately
      const msg = err instanceof Error ? err.message : String(err);
      if (isAuthError(err) || isQuotaOrModelError(err) || msg.includes('400')) {
        throw err;
      }
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function generateWithFallback(
  ai: GoogleGenAI,
  request: {
    contents: Parameters<GoogleGenAI['models']['generateContent']>[0]['contents'];
    config?: Omit<
      NonNullable<Parameters<GoogleGenAI['models']['generateContent']>[0]['config']>,
      'thinkingConfig'
    > & { thinkingLevel?: ThinkingLevel };
  },
  models: string[] = [PRIMARY_MODEL, FALLBACK_MODEL]
) {
  let lastError: unknown;
  for (let idx = 0; idx < models.length; idx++) {
    const model = models[idx];
    const { thinkingLevel, ...restConfig } = request.config || {};
    const effectiveThinkingLevel =
      model === FALLBACK_MODEL
        ? ThinkingLevel.MINIMAL
        : thinkingLevel || ThinkingLevel.LOW;

    try {
      return await callWithRetry(() =>
        ai.models.generateContent({
          model,
          contents: request.contents,
          config: {
            ...restConfig,
            ...(restConfig.tools ? {} : { thinkingConfig: { thinkingLevel: effectiveThinkingLevel } }),
          },
        })
      );
    } catch (err: unknown) {
      lastError = err;
      const canFallback = idx < models.length - 1 && isQuotaOrModelError(err);
      if (!canFallback) {
        throw new Error(formatGeminiError(err));
      }
      console.warn(`Model ${model} unavailable/rate-limited; switching to ${models[idx + 1]}.`);
    }
  }
  throw new Error(formatGeminiError(lastError));
}

function safeParseJson<T>(raw: string | undefined, fallbackMsg: string): T {
  if (!raw) throw new Error(fallbackMsg);
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error(fallbackMsg);
  }
}

export interface OrchestrateInput {
  profile: LearnerProfile;
  targetRole: CareerRole;
  triggerReason: string;
  latestAssessment?: AssessmentResult;
  completedResourceIds?: string[];
}

export type StreamCallback = (event: {
  type: 'agent_start' | 'agent_complete' | 'final' | 'error';
  agentStep?: AgentTraceStep;
  result?: OrchestrationState;
  error?: string;
}) => void;

export async function runMultiAgentOrchestration(
  input: OrchestrateInput,
  onEvent?: StreamCallback
): Promise<OrchestrationState> {
  const ai = getClient();
  const { profile, targetRole, triggerReason, latestAssessment, completedResourceIds = [] } = input;

  const profileSummary = {
    name: profile.name,
    headline: profile.headline,
    bio: profile.bio,
    weeklyHoursBudget: profile.weeklyHoursBudget,
    existingSkills: profile.existingSkills.map((s) => ({
      name: s.name,
      level: s.level,
      category: s.category,
      verifiedVia: s.verifiedVia,
    })),
    certifications: profile.certifications.map((c) => `${c.title} (${c.issuer}, ${c.year})`),
    projects: profile.projects.map((p) => ({
      title: p.title,
      summary: p.summary,
      skillsUsed: p.skillsUsed,
    })),
    assessmentHistory: profile.assessmentHistory.map((a) => ({
      topic: a.topic,
      targetSkill: a.targetSkill,
      score: a.score,
      weakConcepts: a.weakConcepts,
    })),
    latestAssessment: latestAssessment || null,
    triggerReason,
  };

  const isRemedialTrigger =
    Boolean(latestAssessment && latestAssessment.score < 60) ||
    triggerReason.toLowerCase().includes('low') ||
    triggerReason.toLowerCase().includes('remedial');

  // Stream Agent 1 start immediately
  onEvent?.({
    type: 'agent_start',
    agentStep: {
      agentId: 'analyst',
      agentName: 'Skill Analyst Agent',
      roleTitle: 'Competency & Evidence Auditor',
      status: 'running',
      summary: 'Evaluating profile skills, projects, certifications, and diagnostic scores...',
      handoffNote: 'In progress',
      durationMs: 0,
      highlights: [],
    },
  });

  const startedAt = Date.now();
  const response = await generateWithFallback(ai, {
    contents: `Execute a coordinated 4-agent adaptive learning orchestration for this learner.
Profile JSON: ${JSON.stringify(profileSummary)}
Target Role: ${JSON.stringify(targetRole)}
Trigger Reason: ${triggerReason}
Remedial Intervention Required: ${isRemedialTrigger}

Collaborating Agent Responsibilities:
1. Skill Analyst Agent: Evaluate profile skills, projects, certs, and assessments. Adjust inferred mastery downward if latestAssessment score < 60%. Output 2-3 concrete strengths and 2-3 weaknesses.
2. Career Matcher Agent: For EVERY requirement in targetRole.requirements, produce a skillAudit item with exact skill name, category ('Frontend' | 'Backend' | 'Database' | 'AI & Data' | 'DevOps' | 'Foundations'), currentLevel (0-100), targetLevel, gap = max(0, targetLevel - currentLevel), status ('Strength' if gap <= 10, 'Developing' if gap <= 35, else 'Missing'), and 1-sentence rationale. Compute weighted readinessScore (0-100) and priority missingSkills list.
3. Curriculum Architect Agent: Design exactly 3 sequential phases (phaseNumber 1, 2, 3), each with 2-3 resources mixing 'Course', 'Tutorial', and 'Practical Exercise'. CRITICAL ADAPTIVE RULE: If Remedial Intervention Required is true (or latestAssessment score < 60), Phase 1 MUST start with 1-2 targeted remedial modules (isRemedial: true) addressing weakConcepts (${latestAssessment?.weakConcepts?.join(', ') || 'foundational concepts'}). Include a concrete exercisePrompt for every Practical Exercise and realistic durations for ${profile.weeklyHoursBudget} hrs/week.
4. Adaptive Mentor Agent: Write a crisp 2-3 sentence mentorBriefing referencing their actual skills and why the plan is structured this way, plus 3 short quickActions.

Also provide a distinct trace block (agentSummary, handoffNote, highlights [2-3 short items]) for each of the 4 agents.`,
    config: {
      systemInstruction:
        'You coordinate 4 specialized educational AI agents (Skill Analyst, Career Matcher, Curriculum Architect, Adaptive Mentor). Be accurate, realistic, and concise.',
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          readinessScore: { type: Type.INTEGER },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          skillAudits: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING },
                category: { type: Type.STRING },
                currentLevel: { type: Type.INTEGER },
                targetLevel: { type: Type.INTEGER },
                gap: { type: Type.INTEGER },
                status: { type: Type.STRING },
                rationale: { type: Type.STRING },
              },
              required: [
                'skill',
                'category',
                'currentLevel',
                'targetLevel',
                'gap',
                'status',
                'rationale',
              ],
            },
          },
          adaptationReason: { type: Type.STRING },
          roadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                phaseNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                focusSummary: { type: Type.STRING },
                resources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      type: { type: Type.STRING },
                      provider: { type: Type.STRING },
                      durationHours: { type: Type.NUMBER },
                      difficulty: { type: Type.STRING },
                      targetSkill: { type: Type.STRING },
                      description: { type: Type.STRING },
                      exercisePrompt: { type: Type.STRING },
                      isRemedial: { type: Type.BOOLEAN },
                    },
                    required: [
                      'id',
                      'title',
                      'type',
                      'provider',
                      'durationHours',
                      'difficulty',
                      'targetSkill',
                      'description',
                    ],
                  },
                },
              },
              required: ['id', 'phaseNumber', 'title', 'focusSummary', 'resources'],
            },
          },
          mentorBriefing: { type: Type.STRING },
          quickActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          agentTraces: {
            type: Type.OBJECT,
            properties: {
              analyst: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  handoffNote: { type: Type.STRING },
                  highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['summary', 'handoffNote', 'highlights'],
              },
              matcher: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  handoffNote: { type: Type.STRING },
                  highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['summary', 'handoffNote', 'highlights'],
              },
              architect: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  handoffNote: { type: Type.STRING },
                  highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['summary', 'handoffNote', 'highlights'],
              },
              mentor: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  handoffNote: { type: Type.STRING },
                  highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['summary', 'handoffNote', 'highlights'],
              },
            },
            required: ['analyst', 'matcher', 'architect', 'mentor'],
          },
        },
        required: [
          'strengths',
          'weaknesses',
          'readinessScore',
          'missingSkills',
          'skillAudits',
          'adaptationReason',
          'roadmap',
          'mentorBriefing',
          'quickActions',
          'agentTraces',
        ],
      },
    },
  });

  type TraceBlock = { summary: string; handoffNote: string; highlights: string[] };
  const parsed = safeParseJson<{
    strengths: string[];
    weaknesses: string[];
    readinessScore: number;
    missingSkills: string[];
    skillAudits: OrchestrationState['skillAudits'];
    adaptationReason: string;
    roadmap: OrchestrationState['roadmap'];
    mentorBriefing: string;
    quickActions: string[];
    agentTraces: {
      analyst: TraceBlock;
      matcher: TraceBlock;
      architect: TraceBlock;
      mentor: TraceBlock;
    };
  }>(response.text, 'Multi-agent orchestrator returned an empty response');

  const totalMs = Math.max(400, Date.now() - startedAt);
  const perStepMs = Math.round(totalMs / 4);

  const traceSteps: AgentTraceStep[] = [
    {
      agentId: 'analyst',
      agentName: 'Skill Analyst Agent',
      roleTitle: 'Competency & Evidence Auditor',
      status: 'completed',
      summary: parsed.agentTraces.analyst.summary,
      handoffNote: parsed.agentTraces.analyst.handoffNote,
      durationMs: perStepMs,
      highlights: (parsed.agentTraces.analyst.highlights || []).slice(0, 3),
    },
    {
      agentId: 'matcher',
      agentName: 'Career Matcher Agent',
      roleTitle: 'Role Matrix Comparator',
      status: 'completed',
      summary: parsed.agentTraces.matcher.summary,
      handoffNote: parsed.agentTraces.matcher.handoffNote,
      durationMs: perStepMs,
      highlights: (parsed.agentTraces.matcher.highlights || []).slice(0, 3),
    },
    {
      agentId: 'architect',
      agentName: 'Curriculum Architect Agent',
      roleTitle: 'Adaptive Roadmap Synthesizer',
      status: 'completed',
      summary: parsed.agentTraces.architect.summary,
      handoffNote: parsed.agentTraces.architect.handoffNote,
      durationMs: perStepMs,
      highlights: (parsed.agentTraces.architect.highlights || []).slice(0, 3),
    },
    {
      agentId: 'mentor',
      agentName: 'Adaptive Mentor Agent',
      roleTitle: 'Guidance & Strategy Coach',
      status: 'completed',
      summary: parsed.agentTraces.mentor.summary,
      handoffNote: parsed.agentTraces.mentor.handoffNote,
      durationMs: perStepMs,
      highlights: (parsed.agentTraces.mentor.highlights || []).slice(0, 3),
    },
  ];

  // Emit smooth sequential handoff events so the live pipeline UI animates each handoff
  for (let i = 0; i < traceSteps.length; i++) {
    if (i > 0) {
      onEvent?.({
        type: 'agent_start',
        agentStep: { ...traceSteps[i], status: 'running', durationMs: 0 },
      });
      await new Promise((r) => setTimeout(r, 140));
    }
    onEvent?.({ type: 'agent_complete', agentStep: traceSteps[i] });
  }

  const normalizedRoadmap = parsed.roadmap.map((phase, pIdx) => ({
    ...phase,
    phaseNumber: phase.phaseNumber || pIdx + 1,
    resources: phase.resources.map((res, rIdx) => {
      const normalizedType =
        res.type === 'Course' || res.type === 'Tutorial' || res.type === 'Practical Exercise'
          ? res.type
          : 'Tutorial';
      const normalizedDiff =
        res.difficulty === 'Beginner' ||
        res.difficulty === 'Intermediate' ||
        res.difficulty === 'Advanced'
          ? res.difficulty
          : 'Intermediate';
      const id = res.id || `res-${pIdx + 1}-${rIdx + 1}-${Date.now()}`;
      return {
        ...res,
        id,
        type: normalizedType as 'Course' | 'Tutorial' | 'Practical Exercise',
        difficulty: normalizedDiff as 'Beginner' | 'Intermediate' | 'Advanced',
        completed: completedResourceIds.includes(id),
      };
    }),
  }));

  const finalState: OrchestrationState = {
    lastTrigger: triggerReason,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    readinessScore: Math.max(0, Math.min(100, parsed.readinessScore)),
    strengths: parsed.strengths,
    weaknesses: parsed.weaknesses,
    missingSkills: parsed.missingSkills,
    skillAudits: parsed.skillAudits.map((item) => ({
      ...item,
      status:
        item.status === 'Strength' || item.status === 'Developing' || item.status === 'Missing'
          ? item.status
          : item.gap <= 10
            ? 'Strength'
            : item.gap <= 35
              ? 'Developing'
              : 'Missing',
    })),
    roadmap: normalizedRoadmap,
    mentorBriefing: parsed.mentorBriefing,
    adaptationReason: parsed.adaptationReason,
    quickActions: (parsed.quickActions || []).slice(0, 3),
    agentTrace: traceSteps,
  };

  onEvent?.({ type: 'final', result: finalState });
  return finalState;
}

export async function generateDiagnosticQuiz(params: {
  skill: string;
  targetRoleTitle: string;
  difficulty: 'Diagnostic' | 'Intermediate' | 'Remedial';
}): Promise<AssessmentQuiz> {
  const ai = getClient();
  const response = await generateWithFallback(ai, {
    contents: `Generate a 4-question multiple-choice technical diagnostic quiz for the skill "${params.skill}" tailored for someone preparing to become a "${params.targetRoleTitle}".
Difficulty mode: ${params.difficulty}.
Include a short codeSnippet on 1-2 questions where relevant (or empty string if conceptual). Each question must have exactly 4 concise options, 1 correctIndex (0-3), a clear 1-2 sentence explanation, and a 2-4 word conceptTag.`,
    config: {
      systemInstruction:
        'You are an expert technical assessment designer. Create accurate, unambiguous diagnostic questions.',
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING },
                codeSnippet: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                conceptTag: { type: Type.STRING },
              },
              required: ['prompt', 'options', 'correctIndex', 'explanation', 'conceptTag'],
            },
          },
        },
        required: ['topic', 'questions'],
      },
    },
  });

  const parsed = safeParseJson<{
    topic: string;
    questions: {
      prompt: string;
      codeSnippet?: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      conceptTag: string;
    }[];
  }>(response.text, 'Failed to generate diagnostic quiz');

  return {
    id: `quiz-ai-${Date.now()}`,
    topic: parsed.topic,
    targetSkill: params.skill,
    difficulty: params.difficulty,
    estimatedMinutes: 4,
    questions: parsed.questions.slice(0, 4).map((q, idx) => ({
      id: `q-${Date.now()}-${idx}`,
      prompt: q.prompt,
      codeSnippet: q.codeSnippet && q.codeSnippet.trim().length > 0 ? q.codeSnippet : undefined,
      options: q.options.slice(0, 4),
      correctIndex: Math.max(0, Math.min(3, q.correctIndex)),
      explanation: q.explanation,
      conceptTag: q.conceptTag,
    })),
  };
}

export async function runMentorChat(params: {
  message: string;
  history: { sender: 'user' | 'mentor'; text: string }[];
  profile: LearnerProfile;
  targetRole: CareerRole;
  orchestration: OrchestrationState;
}): Promise<{ reply: string; suggestedAction?: MentorActionSuggestion }> {
  const ai = getClient();

  const contextSnapshot = {
    learnerName: params.profile.name,
    targetRole: params.targetRole.title,
    readinessScore: params.orchestration.readinessScore,
    strengths: params.orchestration.strengths,
    weaknesses: params.orchestration.weaknesses,
    missingSkills: params.orchestration.missingSkills,
    recentAssessments: params.profile.assessmentHistory.slice(0, 4),
    phaseTitles: params.orchestration.roadmap.map((p) => ({
      title: p.title,
      modules: p.resources.map((r) => `${r.title} (${r.completed ? 'done' : 'pending'})`),
    })),
  };

  const conversationHistory = params.history
    .slice(-8)
    .map((m) => `${m.sender === 'user' ? 'Learner' : 'Mentor'}: ${m.text}`)
    .join('\n');

  const response = await generateWithFallback(ai, {
    contents: `Context Snapshot: ${JSON.stringify(contextSnapshot)}

Recent Conversation:
${conversationHistory}

Learner's New Question: "${params.message}"

Respond as the Adaptive AI Mentor. Be concise, practical, and tailored to their exact strengths, missing skills, and assessment history.
Optionally include a suggestedAction if a concrete next step helps (actionType: 'add_remedial' with payload = skill name, or 'launch_quiz' with payload = 'quiz-js-async' | 'quiz-react-core' | 'quiz-node-api' | 'quiz-python-ml', or omit suggestedAction if not needed).`,
    config: {
      systemInstruction:
        'You are Meridian AI Adaptive Mentor, an expert career and technical coach collaborating with Skill Analyst, Career Matcher, and Curriculum Architect agents.',
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          includeAction: { type: Type.BOOLEAN },
          actionLabel: { type: Type.STRING },
          actionDescription: { type: Type.STRING },
          actionType: { type: Type.STRING },
          actionPayload: { type: Type.STRING },
        },
        required: ['reply', 'includeAction'],
      },
    },
  });

  const data = safeParseJson<{
    reply: string;
    includeAction: boolean;
    actionLabel?: string;
    actionDescription?: string;
    actionType?: string;
    actionPayload?: string;
  }>(response.text, 'Mentor returned empty response');

  let suggestedAction: MentorActionSuggestion | undefined;
  if (
    data.includeAction &&
    data.actionLabel &&
    data.actionPayload &&
    (data.actionType === 'add_remedial' ||
      data.actionType === 'launch_quiz' ||
      data.actionType === 'switch_role')
  ) {
    suggestedAction = {
      label: data.actionLabel,
      description: data.actionDescription || 'Recommended next step',
      actionType: data.actionType,
      payload: data.actionPayload,
    };
  }

  return {
    reply: data.reply,
    suggestedAction,
  };
}

export async function parseLearnerProfileFromText(rawText: string): Promise<{
  name: string;
  headline: string;
  location: string;
  targetRoleId: string;
  bio: string;
  weeklyHoursBudget: number;
  existingSkills: { name: string; level: number; category: string; verifiedVia: string }[];
  certifications: { title: string; issuer: string; year: string }[];
  projects: { title: string; summary: string; skillsUsed: string[] }[];
}> {
  const ai = getClient();
  const response = await generateWithFallback(ai, {
    contents: `Extract structured learner profile details from the user's text below.
User Text:
"""
${rawText}
"""

Rules:
- Match targetRoleId to the closest of: 'full-stack-dev', 'ai-ml-engineer', 'data-scientist', 'cloud-devops'.
- Estimate realistic skill level (30-90) from context (e.g., "basic HTML" -> 40, "experienced in Python" -> 80).
- Category must be one of: 'Frontend', 'Backend', 'Database', 'AI & Data', 'DevOps', 'Foundations'.
- Keep bio concise (1-2 sentences). If location or headline is missing, infer a sensible default like 'India' or 'Computer Science Learner'.`,
    config: {
      systemInstruction:
        'You parse learner bios, resumes, and self-introductions into clean structured learner profiles.',
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          headline: { type: Type.STRING },
          location: { type: Type.STRING },
          targetRoleId: { type: Type.STRING },
          bio: { type: Type.STRING },
          weeklyHoursBudget: { type: Type.INTEGER },
          existingSkills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                level: { type: Type.INTEGER },
                category: { type: Type.STRING },
                verifiedVia: { type: Type.STRING },
              },
              required: ['name', 'level', 'category', 'verifiedVia'],
            },
          },
          certifications: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                issuer: { type: Type.STRING },
                year: { type: Type.STRING },
              },
              required: ['title', 'issuer', 'year'],
            },
          },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                skillsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['title', 'summary', 'skillsUsed'],
            },
          },
        },
        required: [
          'name',
          'headline',
          'location',
          'targetRoleId',
          'bio',
          'weeklyHoursBudget',
          'existingSkills',
          'certifications',
          'projects',
        ],
      },
    },
  });

  return safeParseJson(response.text, 'Failed to extract learner details from text');
}

const VALID_CATEGORIES: SkillCategory[] = [
  'Frontend',
  'Backend',
  'Database',
  'AI & Data',
  'DevOps',
  'Foundations',
];

export async function generateCustomCareerRole(roleInput: string): Promise<CareerRole> {
  const ai = getClient();
  const response = await generateWithFallback(ai, {
    contents: `Create a structured Career Role benchmark matrix from this role title or job description:
"""
${roleInput}
"""

Requirements:
- Return 6-7 concrete, industry-realistic technical skill requirements.
- requiredLevel must be between 65 and 92.
- priority must be 'Core', 'Important', or 'Bonus'.
- category must be one of: 'Frontend', 'Backend', 'Database', 'AI & Data', 'DevOps', 'Foundations'.
- Keep summary to 1-2 crisp sentences.`,
    config: {
      systemInstruction:
        'You are an engineering career architect. Define accurate skill requirement matrices for any technical or product role.',
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          summary: { type: Type.STRING },
          medianBand: { type: Type.STRING },
          demandNote: { type: Type.STRING },
          requirements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING },
                requiredLevel: { type: Type.INTEGER },
                priority: { type: Type.STRING },
                category: { type: Type.STRING },
              },
              required: ['skill', 'requiredLevel', 'priority', 'category'],
            },
          },
        },
        required: ['title', 'category', 'summary', 'medianBand', 'demandNote', 'requirements'],
      },
    },
  });

  const parsed = safeParseJson<{
    title: string;
    category: string;
    summary: string;
    medianBand: string;
    demandNote: string;
    requirements: { skill: string; requiredLevel: number; priority: string; category: string }[];
  }>(response.text, 'Failed to generate custom career role');

  return {
    id: `custom-${Date.now()}`,
    title: parsed.title,
    category: parsed.category,
    summary: parsed.summary,
    medianBand: parsed.medianBand,
    demandNote: parsed.demandNote,
    requirements: parsed.requirements.slice(0, 7).map((r) => ({
      skill: r.skill,
      requiredLevel: Math.max(55, Math.min(95, r.requiredLevel)),
      priority:
        r.priority === 'Core' || r.priority === 'Important' || r.priority === 'Bonus'
          ? r.priority
          : 'Important',
      category: VALID_CATEGORIES.includes(r.category as SkillCategory)
        ? (r.category as SkillCategory)
        : 'Foundations',
    })),
  };
}

const CURATED_RESOURCE_CATALOG: {
  keywords: string[];
  guidance: string;
  freeLinks: GroundedResourceLink[];
  paidLinks: GroundedResourceLink[];
}[] = [
  {
    keywords: ['javascript', 'js', 'es6', 'async', 'closure', 'dom'],
    guidance:
      'Combine MDN and JavaScript.info free references with structured video/project tracks on Frontend Masters, Udemy, or Codecademy Pro for deeper practice.',
    freeLinks: [
      { title: 'MDN JavaScript Guide & Reference', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', provider: 'MDN Web Docs', pricing: 'Free', note: 'Official docs & specs' },
      { title: 'The Modern JavaScript Tutorial (Closures, Async, Event Loop)', url: 'https://javascript.info/', provider: 'JavaScript.info', pricing: 'Free', note: 'Deep conceptual guide' },
      { title: 'freeCodeCamp JavaScript Algorithms & Data Structures', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/', provider: 'freeCodeCamp', pricing: 'Free', note: 'Interactive challenges' },
    ],
    paidLinks: [
      { title: 'Frontend Masters — JavaScript: The Hard Parts v2', url: 'https://frontendmasters.com/courses/javascript-hard-parts-v2/', provider: 'Frontend Masters', pricing: 'Paid', note: 'Subscription · Closures & async deep dive' },
      { title: 'The Complete JavaScript Course: Zero to Expert', url: 'https://www.udemy.com/topic/javascript/', provider: 'Udemy', pricing: 'Paid', note: 'One-time · Project bootcamp' },
      { title: 'Coursera — Meta JavaScript Programming Certificate', url: 'https://www.coursera.org/learn/programming-with-javascript', provider: 'Coursera (Meta)', pricing: 'Paid', note: 'Subscription · Verified certificate' },
    ],
  },
  {
    keywords: ['react', 'jsx', 'hooks', 'next', 'frontend framework'],
    guidance:
      'Start with React.dev and Full Stack Open for free foundational patterns, or pick up Epic React, Frontend Masters, or Coursera Meta Front-End Developer for guided capstone grading.',
    freeLinks: [
      { title: 'React Official Interactive Curriculum (Learn React)', url: 'https://react.dev/learn', provider: 'React.dev', pricing: 'Free', note: 'Official interactive docs' },
      { title: 'Full Stack Open — React & State Management', url: 'https://fullstackopen.com/en/part1', provider: 'University of Helsinki', pricing: 'Free', note: 'Free university course' },
      { title: 'TypeScript + React Cheatsheets', url: 'https://react-typescript-cheatsheet.netlify.app/', provider: 'Open Source', pricing: 'Free', note: 'Quick reference' },
    ],
    paidLinks: [
      { title: 'Epic React by Kent C. Dodds', url: 'https://www.epicreact.dev/', provider: 'Epic React', pricing: 'Paid', note: 'Self-paced · Advanced hooks & patterns' },
      { title: 'Frontend Masters — Complete Intro to React', url: 'https://frontendmasters.com/courses/complete-react-v9/', provider: 'Frontend Masters', pricing: 'Paid', note: 'Subscription · Hands-on workshops' },
      { title: 'Coursera — Meta React Basics & Advanced Specialization', url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer', provider: 'Coursera (Meta)', pricing: 'Paid', note: 'Subscription · Certificate track' },
    ],
  },
  {
    keywords: ['typescript', 'ts'],
    guidance:
      'Pair the official TypeScript Handbook with Total TypeScript Pro Workshops or Frontend Masters TypeScript tracks for production generics and inference.',
    freeLinks: [
      { title: 'Official TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', provider: 'TypeScript', pricing: 'Free', note: 'Official language docs' },
      { title: 'Total TypeScript Beginners Free Tutorial', url: 'https://www.totaltypescript.com/tutorials/beginners-typescript', provider: 'Total TypeScript', pricing: 'Free', note: 'Interactive exercises' },
    ],
    paidLinks: [
      { title: 'Total TypeScript Pro Essentials & Type Transformations', url: 'https://www.totaltypescript.com/', provider: 'Total TypeScript', pricing: 'Paid', note: 'One-time · Interactive Pro workshops' },
      { title: 'Frontend Masters — TypeScript Fundamentals & Enterprise', url: 'https://frontendmasters.com/learn/typescript/', provider: 'Frontend Masters', pricing: 'Paid', note: 'Subscription · Learning path' },
    ],
  },
  {
    keywords: ['node', 'express', 'backend', 'api', 'rest', 'auth', 'jwt', 'owasp'],
    guidance:
      'Use Node.js official Learn guides and OWASP Cheat Sheets free, or enroll in Udemy/Frontend Masters/Educative backend API tracks for production deployment labs.',
    freeLinks: [
      { title: 'Official Node.js Learn Guides', url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs', provider: 'Node.js', pricing: 'Free', note: 'Official docs' },
      { title: 'Full Stack Open — Node.js & Express Server', url: 'https://fullstackopen.com/en/part3', provider: 'University of Helsinki', pricing: 'Free', note: 'Free university module' },
      { title: 'OWASP REST Security Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html', provider: 'OWASP', pricing: 'Free', note: 'Auth & validation reference' },
    ],
    paidLinks: [
      { title: 'Frontend Masters — API Design in Node.js', url: 'https://frontendmasters.com/courses/api-design-nodejs-v4/', provider: 'Frontend Masters', pricing: 'Paid', note: 'Subscription · Express, Auth & Prisma' },
      { title: 'Coursera — IBM Developing Back-End Apps with Node.js & Express', url: 'https://www.coursera.org/learn/developing-backend-apps-with-nodejs-and-express', provider: 'Coursera (IBM)', pricing: 'Paid', note: 'Subscription · Graded labs' },
      { title: 'Udemy — NodeJS Complete Guide (REST, GraphQL, Auth)', url: 'https://www.udemy.com/topic/nodejs/', provider: 'Udemy', pricing: 'Paid', note: 'One-time · Comprehensive track' },
    ],
  },
  {
    keywords: ['html', 'css', 'flexbox', 'grid', 'tailwind', 'responsive'],
    guidance:
      'Practice responsive Flexbox and Grid for free on web.dev and MDN, or accelerate with CSS for JavaScript Developers and Frontend Masters CSS Grid courses.',
    freeLinks: [
      { title: 'web.dev Learn CSS (Layout, Grid, Flexbox)', url: 'https://web.dev/learn/css', provider: 'Google web.dev', pricing: 'Free', note: 'Interactive modules' },
      { title: 'MDN Learn Web Development — HTML & CSS', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development', provider: 'MDN Web Docs', pricing: 'Free', note: 'Complete free curriculum' },
      { title: 'freeCodeCamp Responsive Web Design', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', provider: 'freeCodeCamp', pricing: 'Free', note: 'Free certification' },
    ],
    paidLinks: [
      { title: 'CSS for JavaScript Developers by Josh Comeau', url: 'https://css-for-js.dev/', provider: 'Josh W. Comeau', pricing: 'Paid', note: 'One-time · Interactive visual course' },
      { title: 'Frontend Masters — Ultimate CSS Grid & Layout', url: 'https://frontendmasters.com/courses/css-grid-flexbox-v2/', provider: 'Frontend Masters', pricing: 'Paid', note: 'Subscription · Layout workshops' },
    ],
  },
  {
    keywords: ['sql', 'postgres', 'sqlite', 'database', 'relational', 'query'],
    guidance:
      'Master joins and window functions free with SQLBolt and PGExercises, or take structured data engineering & SQL bootcamps on DataCamp, Coursera, or Udemy.',
    freeLinks: [
      { title: 'SQLBolt — Interactive SQL Lessons', url: 'https://sqlbolt.com/', provider: 'SQLBolt', pricing: 'Free', note: 'In-browser query runner' },
      { title: 'PostgreSQL Exercises (Joins, Window Functions)', url: 'https://pgexercises.com/', provider: 'PGExercises', pricing: 'Free', note: 'Interactive problem set' },
      { title: 'Official PostgreSQL Tutorial', url: 'https://www.postgresql.org/docs/current/tutorial.html', provider: 'PostgreSQL', pricing: 'Free', note: 'Official docs' },
    ],
    paidLinks: [
      { title: 'DataCamp — Associate Data Engineer in SQL Track', url: 'https://www.datacamp.com/tracks/sql-fundamentals', provider: 'DataCamp', pricing: 'Paid', note: 'Subscription · Interactive workspace' },
      { title: 'Coursera — Learn SQL Basics for Data Science (UC Davis)', url: 'https://www.coursera.org/specializations/learn-sql-basics-data-science', provider: 'Coursera', pricing: 'Paid', note: 'Subscription · Certificate' },
      { title: 'Udemy — The Complete SQL Bootcamp', url: 'https://www.udemy.com/topic/sql/', provider: 'Udemy', pricing: 'Paid', note: 'One-time · PostgreSQL hands-on' },
    ],
  },
  {
    keywords: ['git', 'github', 'version control'],
    guidance:
      'Learn branching and rebasing interactively for free with Learn Git Branching and Pro Git, or get team workflow certifications through Pluralsight and Udemy.',
    freeLinks: [
      { title: 'Learn Git Branching (Interactive Visual Sandbox)', url: 'https://learngitbranching.js.org/', provider: 'Open Source', pricing: 'Free', note: 'Visual sandbox' },
      { title: 'Pro Git Book (Free Official Edition)', url: 'https://git-scm.com/book/en/v2', provider: 'Git SCM', pricing: 'Free', note: 'Complete reference book' },
      { title: 'GitHub Skills — Interactive Courses', url: 'https://skills.github.com/', provider: 'GitHub', pricing: 'Free', note: 'Hands-on repos' },
    ],
    paidLinks: [
      { title: 'Coursera — Introduction to Git and GitHub (Google)', url: 'https://www.coursera.org/learn/introduction-git-github', provider: 'Coursera (Google)', pricing: 'Paid', note: 'Subscription · Verified certificate' },
      { title: 'Pluralsight — Git & GitHub Workflow Paths', url: 'https://www.pluralsight.com/search?q=git', provider: 'Pluralsight', pricing: 'Paid', note: 'Subscription · Team workflows' },
    ],
  },
  {
    keywords: ['python', 'pandas', 'fastapi'],
    guidance:
      'Pair free Harvard CS50P and official Python docs with accredited Coursera Python Specializations or Codecademy Pro for graded portfolio milestones.',
    freeLinks: [
      { title: 'Official Python 3 Tutorial', url: 'https://docs.python.org/3/tutorial/', provider: 'Python.org', pricing: 'Free', note: 'Official tutorial' },
      { title: 'Harvard CS50P — Introduction to Programming with Python', url: 'https://cs50.harvard.edu/python/', provider: 'Harvard CS50', pricing: 'Free', note: 'Free university course' },
      { title: 'FastAPI Official Tutorial & User Guide', url: 'https://fastapi.tiangolo.com/tutorial/', provider: 'FastAPI', pricing: 'Free', note: 'API framework guide' },
    ],
    paidLinks: [
      { title: 'Coursera — Python for Everybody Specialization (UMich)', url: 'https://www.coursera.org/specializations/python', provider: 'Coursera', pricing: 'Paid', note: 'Subscription · Flagship certificate' },
      { title: 'Boot.dev — Backend Engineering with Python', url: 'https://www.boot.dev/', provider: 'Boot.dev', pricing: 'Paid', note: 'Subscription · Gamified backend labs' },
      { title: 'Udemy — 100 Days of Code: Python Pro Bootcamp', url: 'https://www.udemy.com/topic/python/', provider: 'Udemy', pricing: 'Paid', note: 'One-time · 100 projects' },
    ],
  },
  {
    keywords: ['pytorch', 'ml', 'machine learning', 'deep learning', 'llm', 'rag', 'ai', 'scikit'],
    guidance:
      'Use Google ML Crash Course, PyTorch Tutorials, and Hugging Face Learn free, or invest in DeepLearning.AI’s industry-recognized Machine Learning & Generative AI specializations.',
    freeLinks: [
      { title: 'Google Machine Learning Crash Course', url: 'https://developers.google.com/machine-learning/crash-course', provider: 'Google Developers', pricing: 'Free', note: 'Interactive labs' },
      { title: 'Official PyTorch Tutorials', url: 'https://pytorch.org/tutorials/', provider: 'PyTorch', pricing: 'Free', note: 'Official notebooks' },
      { title: 'Hugging Face LLM & Agents Free Course', url: 'https://huggingface.co/learn', provider: 'Hugging Face', pricing: 'Free', note: 'Open source LLM/RAG track' },
    ],
    paidLinks: [
      { title: 'Coursera — DeepLearning.AI Machine Learning Specialization', url: 'https://www.coursera.org/specializations/machine-learning-introduction', provider: 'DeepLearning.AI', pricing: 'Paid', note: 'Subscription · Andrew Ng flagship' },
      { title: 'Coursera — Generative AI with Large Language Models', url: 'https://www.coursera.org/learn/generative-ai-with-llms', provider: 'DeepLearning.AI & AWS', pricing: 'Paid', note: 'Subscription · Fine-tuning & RAG' },
      { title: 'Udacity — AI Programming with Python Nanodegree', url: 'https://www.udacity.com/course/ai-programming-python-nanodegree--nd089', provider: 'Udacity', pricing: 'Paid', note: 'Cohort · Mentor code reviews' },
    ],
  },
  {
    keywords: ['docker', 'kubernetes', 'k8s', 'devops', 'ci/cd', 'terraform', 'iac', 'linux', 'cloud'],
    guidance:
      'Start with official Docker, Kubernetes, and HashiCorp free docs, or prepare for industry certifications with KodeKloud interactive labs and Linux Foundation training.',
    freeLinks: [
      { title: 'Docker Official Getting Started Guide', url: 'https://docs.docker.com/get-started/', provider: 'Docker', pricing: 'Free', note: 'Official container guide' },
      { title: 'Kubernetes Official Interactive Basics', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', provider: 'Kubernetes', pricing: 'Free', note: 'Official docs' },
      { title: 'HashiCorp Terraform Official Tutorials', url: 'https://developer.hashicorp.com/terraform/tutorials', provider: 'HashiCorp', pricing: 'Free', note: 'IaC hands-on guides' },
    ],
    paidLinks: [
      { title: 'KodeKloud — Docker, Kubernetes (CKA) & Terraform Hands-On Labs', url: 'https://kodekloud.com/', provider: 'KodeKloud', pricing: 'Paid', note: 'Subscription · Live cloud sandboxes' },
      { title: 'A Cloud Guru / Pluralsight DevOps Certification Paths', url: 'https://www.pluralsight.com/cloud-guru', provider: 'Pluralsight', pricing: 'Paid', note: 'Subscription · Cloud exam prep' },
      { title: 'Linux Foundation — Kubernetes Fundamentals (LFS258)', url: 'https://training.linuxfoundation.org/', provider: 'Linux Foundation', pricing: 'Paid', note: 'Certification bundle' },
    ],
  },
  {
    keywords: ['math', 'linear algebra', 'statistics', 'a/b', 'data visualization', 'data science'],
    guidance:
      'Build intuition free via 3Blue1Brown and Kaggle Learn, or complete DeepLearning.AI’s Mathematics for Machine Learning & Data Science Specialization on Coursera.',
    freeLinks: [
      { title: '3Blue1Brown — Essence of Linear Algebra', url: 'https://www.3blue1brown.com/topics/linear-algebra', provider: '3Blue1Brown', pricing: 'Free', note: 'Visual video series' },
      { title: 'Seeing Theory — Visual Probability & Statistics', url: 'https://seeing-theory.brown.edu/', provider: 'Brown University', pricing: 'Free', note: 'Interactive visualizations' },
      { title: 'Kaggle Learn — Data Visualization & Intro to ML', url: 'https://www.kaggle.com/learn', provider: 'Kaggle', pricing: 'Free', note: 'Free micro-courses' },
    ],
    paidLinks: [
      { title: 'Coursera — Mathematics for Machine Learning & Data Science', url: 'https://www.coursera.org/specializations/mathematics-for-machine-learning-and-data-science', provider: 'DeepLearning.AI', pricing: 'Paid', note: 'Subscription · Linear algebra & stats' },
      { title: 'DataCamp — Data Scientist Career Track', url: 'https://www.datacamp.com/tracks/data-scientist-with-python', provider: 'DataCamp', pricing: 'Paid', note: 'Subscription · Guided projects' },
    ],
  },
];

const PAID_DOMAIN_PATTERNS = [
  'udemy.com',
  'coursera.org',
  'frontendmasters.com',
  'pluralsight.com',
  'educative.io',
  'codecademy.com',
  'udacity.com',
  'edx.org',
  'oreilly.com',
  'datacamp.com',
  'kodekloud.com',
  'epicreact.dev',
  'boot.dev',
  'linkedin.com/learning',
];

function inferPricingFromUrl(url: string): 'Free' | 'Paid' {
  const lower = url.toLowerCase();
  return PAID_DOMAIN_PATTERNS.some((domain) => lower.includes(domain)) ? 'Paid' : 'Free';
}

function filterLinksByPricing(
  links: GroundedResourceLink[],
  pricing: 'all' | 'free' | 'paid'
): GroundedResourceLink[] {
  if (pricing === 'free') return links.filter((l) => (l.pricing || 'Free') === 'Free');
  if (pricing === 'paid') return links.filter((l) => l.pricing === 'Paid');
  return links;
}

function getCuratedLearningResources(
  skill: string,
  pricing: 'all' | 'free' | 'paid' = 'all'
): GroundedSearchResult {
  const normalized = skill.toLowerCase();
  const matched = CURATED_RESOURCE_CATALOG.find((entry) =>
    entry.keywords.some((kw) => normalized.includes(kw))
  );

  if (matched) {
    const combined =
      pricing === 'free'
        ? matched.freeLinks
        : pricing === 'paid'
          ? matched.paidLinks
          : [...matched.freeLinks, ...matched.paidLinks];
    return {
      skill,
      guidance: matched.guidance,
      links: combined,
      pricingFilter: pricing,
      sourceMode: 'verified-directory',
    };
  }

  const genericFree: GroundedResourceLink[] = [
    {
      title: `Roadmap.sh — Interactive Career & Skill Guides`,
      url: 'https://roadmap.sh/',
      provider: 'roadmap.sh',
      pricing: 'Free',
      note: 'Open skill trees',
    },
    {
      title: `freeCodeCamp — Free Full Curriculum & Labs`,
      url: 'https://www.freecodecamp.org/learn/',
      provider: 'freeCodeCamp',
      pricing: 'Free',
      note: 'Hands-on certifications',
    },
    {
      title: `MIT OpenCourseWare — Free University Lectures`,
      url: 'https://ocw.mit.edu/',
      provider: 'MIT OCW',
      pricing: 'Free',
      note: 'Open courseware',
    },
  ];

  const genericPaid: GroundedResourceLink[] = [
    {
      title: `Coursera — ${skill} Specializations & Certificates`,
      url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`,
      provider: 'Coursera',
      pricing: 'Paid',
      note: 'University certificates & graded projects',
    },
    {
      title: `Udemy — Top-Rated ${skill} Courses`,
      url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}`,
      provider: 'Udemy',
      pricing: 'Paid',
      note: 'One-time purchase bootcamps',
    },
    {
      title: `Educative.io — Interactive ${skill} Tracks`,
      url: `https://www.educative.io/explore?search=${encodeURIComponent(skill)}`,
      provider: 'Educative',
      pricing: 'Paid',
      note: 'Subscription · Browser-based coding paths',
    },
  ];

  const combined =
    pricing === 'free'
      ? genericFree
      : pricing === 'paid'
        ? genericPaid
        : [...genericFree, ...genericPaid];

  return {
    skill,
    guidance: `Explore both free open-access documentation/courses and accredited paid tracks for ${skill} across trusted learning platforms.`,
    links: combined,
    pricingFilter: pricing,
    sourceMode: 'verified-directory',
  };
}

export async function findLiveFreeResources(params: {
  skill: string;
  targetRoleTitle: string;
  pricing?: 'all' | 'free' | 'paid';
}): Promise<GroundedSearchResult> {
  const ai = getClient();
  const pricing = params.pricing || 'all';

  // Attempt 1: Live Google Search Grounding
  try {
    const searchDirective =
      pricing === 'free'
        ? `Find the best 100% free official documentation, interactive tutorials, and reputable free courses right now for learning "${params.skill}" (goal: ${params.targetRoleTitle}).`
        : pricing === 'paid'
          ? `Find the top-rated paid online courses, specializations, and bootcamps (such as Coursera, Udemy, Frontend Masters, Pluralsight, Educative, KodeKloud) right now for learning "${params.skill}" (goal: ${params.targetRoleTitle}).`
          : `Find both the best free official documentation/tutorials AND top-rated paid courses (Coursera, Udemy, Frontend Masters, etc.) right now for learning "${params.skill}" (goal: ${params.targetRoleTitle}).`;

    const response = await generateWithFallback(ai, {
      contents: `${searchDirective} Summarize the top recommendations clearly in 3-4 concise sentences.`,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingLevel: ThinkingLevel.LOW,
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links: GroundedResourceLink[] = [];
    const seen = new Set<string>();

    for (const chunk of chunks) {
      const uri = (chunk as { web?: { uri?: string; title?: string } }).web?.uri;
      const title = (chunk as { web?: { uri?: string; title?: string } }).web?.title;
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        links.push({
          title: title || uri,
          url: uri,
          pricing: inferPricingFromUrl(uri),
        });
      }
    }

    let finalLinks = filterLinksByPricing(links, pricing);

    // If 'all' was requested and live search skewed purely free or purely paid, supplement from curated catalog
    if (pricing === 'all' && finalLinks.length > 0) {
      const curated = getCuratedLearningResources(params.skill, 'all');
      const hasPaid = finalLinks.some((l) => l.pricing === 'Paid');
      const hasFree = finalLinks.some((l) => l.pricing === 'Free');
      if (!hasPaid) {
        for (const p of curated.links.filter((l) => l.pricing === 'Paid').slice(0, 3)) {
          if (!seen.has(p.url)) finalLinks.push(p);
        }
      }
      if (!hasFree) {
        for (const f of curated.links.filter((l) => l.pricing === 'Free').slice(0, 3)) {
          if (!seen.has(f.url)) finalLinks.push(f);
        }
      }
    }

    if (finalLinks.length > 0) {
      return {
        skill: params.skill,
        guidance: (response.text || 'Verified free and paid learning resources found via Google Search.').trim(),
        links: finalLinks.slice(0, 8),
        pricingFilter: pricing,
        sourceMode: 'live-search',
      };
    }
  } catch (searchErr) {
    console.warn('Live Google Search grounding unavailable, using AI/curated fallback:', searchErr);
  }

  // Attempt 2: Structured Gemini Free & Paid Course Recommendation (no search tool quota needed)
  try {
    const promptScope =
      pricing === 'free'
        ? '4 reputable 100% free official docs or free courses (pricing: "Free")'
        : pricing === 'paid'
          ? '4 top-rated paid courses or specializations on platforms like Coursera, Udemy, Frontend Masters, Pluralsight, Educative, KodeKloud, or DataCamp (pricing: "Paid")'
          : '3 reputable free official resources (pricing: "Free") AND 3 top-rated paid courses on platforms like Coursera, Udemy, Frontend Masters, Educative, or DataCamp (pricing: "Paid")';

    const response = await generateWithFallback(
      ai,
      {
        contents: `Recommend ${promptScope} for learning "${params.skill}" (career goal: ${params.targetRoleTitle}).
Only output real, canonical platform URLs starting with https:// (do not invent obscure broken paths; use official docs roots or official course/track search URLs). Include provider name, pricing ('Free' or 'Paid'), and a short 2-5 word note.
Also write a concise 2-3 sentence study guidance.`,
        config: {
          systemInstruction:
            'You recommend verified free technical documentation and reputable paid online courses.',
          thinkingLevel: ThinkingLevel.MINIMAL,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              guidance: { type: Type.STRING },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                    provider: { type: Type.STRING },
                    pricing: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['title', 'url', 'pricing'],
                },
              },
            },
            required: ['guidance', 'links'],
          },
        },
      },
      [FALLBACK_MODEL, PRIMARY_MODEL]
    );

    const parsed = safeParseJson<{
      guidance: string;
      links: { title: string; url: string; provider?: string; pricing?: string; note?: string }[];
    }>(response.text, 'Failed to parse curated links');

    const validLinks: GroundedResourceLink[] = (parsed.links || [])
      .filter((l) => typeof l.url === 'string' && l.url.startsWith('https://'))
      .map((l) => ({
        title: l.title,
        url: l.url,
        provider: l.provider,
        pricing: (l.pricing === 'Paid' ? 'Paid' : 'Free') as 'Free' | 'Paid',
        note: l.note,
      }));

    const filtered = filterLinksByPricing(validLinks, pricing);
    if (filtered.length > 0) {
      return {
        skill: params.skill,
        guidance: parsed.guidance,
        links: filtered.slice(0, 8),
        pricingFilter: pricing,
        sourceMode: 'ai-curated',
      };
    }
  } catch (aiErr) {
    console.warn('Gemini resource fallback quota reached, serving verified directory:', aiErr);
  }

  // Attempt 3: Verified Curated Free & Paid Directory (never fails)
  return getCuratedLearningResources(params.skill, pricing);
}

export async function reviewPracticalExercise(params: {
  exerciseTitle: string;
  exercisePrompt: string;
  targetSkill: string;
  submission: string;
}): Promise<LabReviewResult> {
  const ai = getClient();
  const response = await generateWithFallback(ai, {
    contents: `Review a learner's practical exercise submission.
Exercise Title: ${params.exerciseTitle}
Target Skill: ${params.targetSkill}
Exercise Brief: ${params.exercisePrompt}

Learner's Code / Architecture Submission:
"""
${params.submission}
"""

Grade fairly (0-100). If score >= 70, set passed = true. Provide a concise 1-2 sentence summary, 2 strengths, 2 concrete improvements/edge cases, and 1 actionable refactoredTip.`,
    config: {
      systemInstruction:
        'You are a senior software engineering lab reviewer. Give specific, constructive technical feedback on code and system design submissions.',
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          passed: { type: Type.BOOLEAN },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          refactoredTip: { type: Type.STRING },
        },
        required: ['score', 'passed', 'summary', 'strengths', 'improvements', 'refactoredTip'],
      },
    },
  });

  const parsed = safeParseJson<LabReviewResult>(response.text, 'Failed to review lab submission');
  return {
    ...parsed,
    score: Math.max(0, Math.min(100, parsed.score)),
    passed: parsed.score >= 70,
  };
}

export async function generateInterviewQuestion(params: {
  profile: LearnerProfile;
  targetRoleTitle: string;
  focusSkill: string;
}): Promise<InterviewQuestion> {
  const ai = getClient();
  const response = await generateWithFallback(ai, {
    contents: `Generate 1 realistic technical interview question for ${params.profile.name} preparing for "${params.targetRoleTitle}".
Focus Skill: ${params.focusSkill}
Learner Projects: ${JSON.stringify(params.profile.projects)}
Learner Existing Skills: ${JSON.stringify(params.profile.existingSkills.map((s) => s.name))}

Make it practical and conversational (e.g., scenario-based or bridging their existing project experience into ${params.focusSkill}). Include a 1-sentence contextNote explaining what interviewers look for, and 3 concise evaluationCriteria.`,
    config: {
      systemInstruction: 'You are a senior technical interviewer at a modern product engineering company.',
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          focusSkill: { type: Type.STRING },
          question: { type: Type.STRING },
          contextNote: { type: Type.STRING },
          evaluationCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['focusSkill', 'question', 'contextNote', 'evaluationCriteria'],
      },
    },
  });

  const parsed = safeParseJson<Omit<InterviewQuestion, 'id'>>(
    response.text,
    'Failed to generate interview question'
  );
  return {
    id: `int-${Date.now()}`,
    ...parsed,
  };
}

export async function evaluateInterviewAnswer(params: {
  question: InterviewQuestion;
  answer: string;
  targetRoleTitle: string;
}): Promise<InterviewFeedback> {
  const ai = getClient();
  const response = await generateWithFallback(ai, {
    contents: `Evaluate this candidate's interview answer for a ${params.targetRoleTitle} role.
Question (${params.question.focusSkill}): ${params.question.question}
Criteria: ${JSON.stringify(params.question.evaluationCriteria)}
Candidate Answer:
"""
${params.answer}
"""

Provide a realistic score (0-100), a short verdict (e.g., 'Strong Hire Signal', 'Developing — Needs Concrete Examples', 'Needs Foundational Review'), 2 strengths, 2 specific technical gaps, and a concise 3-4 sentence sampleStrongAnswer.`,
    config: {
      systemInstruction:
        'You are a calibrating technical interviewer. Give honest, encouraging, high-signal feedback.',
      thinkingLevel: ThinkingLevel.LOW,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          verdict: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
          sampleStrongAnswer: { type: Type.STRING },
        },
        required: ['score', 'verdict', 'strengths', 'gaps', 'sampleStrongAnswer'],
      },
    },
  });

  const parsed = safeParseJson<InterviewFeedback>(
    response.text,
    'Failed to evaluate interview answer'
  );
  return {
    ...parsed,
    score: Math.max(0, Math.min(100, parsed.score)),
  };
}

export async function synthesizeMentorSpeech(text: string): Promise<{
  audioBase64: string;
  mimeType: string;
}> {
  const ai = getClient();
  try {
    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 900),
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      })
    );

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      throw new Error('Speech synthesis returned no audio data.');
    }

    return {
      audioBase64,
      mimeType: 'audio/wav',
    };
  } catch (err: unknown) {
    throw new Error(formatGeminiError(err));
  }
}
