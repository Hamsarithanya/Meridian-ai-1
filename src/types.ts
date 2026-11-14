export type SkillCategory = 'Frontend' | 'Backend' | 'Database' | 'AI & Data' | 'DevOps' | 'Foundations';

export interface SkillEntry {
  id: string;
  name: string;
  level: number; // 0-100
  category: SkillCategory;
  verifiedVia: string;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  year: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  summary: string;
  skillsUsed: string[];
}

export interface AssessmentResult {
  id: string;
  topic: string;
  targetSkill: string;
  score: number; // 0-100
  correctCount: number;
  totalQuestions: number;
  weakConcepts: string[];
  timestamp: string;
  triggeredAdaptation: boolean;
}

export interface LearnerProfile {
  name: string;
  headline: string;
  location: string;
  avatarUrl: string;
  targetRoleId: string;
  bio: string;
  weeklyHoursBudget: number;
  existingSkills: SkillEntry[];
  certifications: Certification[];
  projects: ProjectItem[];
  assessmentHistory: AssessmentResult[];
}

export interface RoleRequirement {
  skill: string;
  requiredLevel: number;
  priority: 'Core' | 'Important' | 'Bonus';
  category: SkillCategory;
}

export interface CareerRole {
  id: string;
  title: string;
  category: string;
  summary: string;
  medianBand: string;
  demandNote: string;
  requirements: RoleRequirement[];
}

export interface SkillAuditItem {
  skill: string;
  category: SkillCategory;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  status: 'Strength' | 'Developing' | 'Missing';
  rationale: string;
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'Course' | 'Tutorial' | 'Practical Exercise';
  provider: string;
  durationHours: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  targetSkill: string;
  description: string;
  exercisePrompt?: string;
  isRemedial?: boolean;
  completed: boolean;
}

export interface RoadmapPhase {
  id: string;
  phaseNumber: number;
  title: string;
  focusSummary: string;
  resources: LearningResource[];
}

export type AgentId = 'analyst' | 'matcher' | 'architect' | 'mentor';

export interface AgentTraceStep {
  agentId: AgentId;
  agentName: string;
  roleTitle: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  summary: string;
  handoffNote: string;
  durationMs: number;
  highlights: string[];
}

export interface OrchestrationState {
  lastTrigger: string;
  lastUpdated: string;
  readinessScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  skillAudits: SkillAuditItem[];
  roadmap: RoadmapPhase[];
  mentorBriefing: string;
  adaptationReason: string;
  quickActions: string[];
  agentTrace: AgentTraceStep[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  conceptTag: string;
}

export interface AssessmentQuiz {
  id: string;
  topic: string;
  targetSkill: string;
  difficulty: 'Diagnostic' | 'Intermediate' | 'Remedial';
  estimatedMinutes: number;
  questions: QuizQuestion[];
}

export interface MentorActionSuggestion {
  label: string;
  description: string;
  actionType: 'add_remedial' | 'launch_quiz' | 'switch_role';
  payload: string;
}

export interface MentorMessage {
  id: string;
  sender: 'user' | 'mentor';
  text: string;
  timestamp: string;
  suggestedAction?: MentorActionSuggestion;
}

export interface LearnerPreset {
  id: string;
  label: string;
  subtitle: string;
  profile: LearnerProfile;
}

export interface LabReviewResult {
  score: number;
  passed: boolean;
  summary: string;
  strengths: string[];
  improvements: string[];
  refactoredTip: string;
}

export interface GroundedResourceLink {
  title: string;
  url: string;
  provider?: string;
  pricing?: 'Free' | 'Paid';
  note?: string;
}

export interface GroundedSearchResult {
  skill: string;
  guidance: string;
  links: GroundedResourceLink[];
  pricingFilter?: 'all' | 'free' | 'paid';
  sourceMode?: 'live-search' | 'ai-curated' | 'verified-directory';
}

export interface InterviewQuestion {
  id: string;
  focusSkill: string;
  question: string;
  contextNote: string;
  evaluationCriteria: string[];
}

export interface InterviewFeedback {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  sampleStrongAnswer: string;
}

export type NavSection =
  | 'overview'
  | 'profile'
  | 'analysis'
  | 'career-match'
  | 'roadmap'
  | 'assessments'
  | 'mentor';
