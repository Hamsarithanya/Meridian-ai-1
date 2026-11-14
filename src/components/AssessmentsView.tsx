import React, { useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Play,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  AssessmentQuiz,
  AssessmentResult,
  CareerRole,
  InterviewFeedback,
  InterviewQuestion,
  LearnerProfile,
} from '../types';

interface AssessmentsViewProps {
  profile: LearnerProfile;
  quizzes: AssessmentQuiz[];
  activeQuizId: string | null;
  targetRole: CareerRole;
  missingSkills: string[];
  history: AssessmentResult[];
  isOrchestrating: boolean;
  onSelectQuiz: (quizId: string | null) => void;
  onAddCustomQuiz: (quiz: AssessmentQuiz) => void;
  onCompleteAssessment: (result: AssessmentResult) => void;
  onViewRoadmap: () => void;
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  profile,
  quizzes,
  activeQuizId,
  targetRole,
  missingSkills,
  history,
  isOrchestrating,
  onSelectQuiz,
  onAddCustomQuiz,
  onCompleteAssessment,
  onViewRoadmap,
}) => {
  const [mode, setMode] = useState<'quizzes' | 'interview'>('quizzes');
  const [customSkill, setCustomSkill] = useState(missingSkills[0] || 'REST APIs & Auth');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Quiz runner state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submittedResult, setSubmittedResult] = useState<AssessmentResult | null>(null);

  // Mock Technical Interview state
  const [interviewSkill, setInterviewSkill] = useState(
    missingSkills[0] || targetRole.requirements[0]?.skill || 'JavaScript'
  );
  const [interviewQuestion, setInterviewQuestion] = useState<InterviewQuestion | null>(null);
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [interviewFeedback, setInterviewFeedback] = useState<InterviewFeedback | null>(null);
  const [isLoadingInterview, setIsLoadingInterview] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);

  const activeQuiz = quizzes.find((q) => q.id === activeQuizId) || null;

  const handleStartQuiz = (quizId: string) => {
    setAnswers({});
    setSubmittedResult(null);
    onSelectQuiz(quizId);
  };

  const handleGenerateCustomQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSkill.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const resp = await fetch('/api/assessments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: customSkill.trim(),
          targetRoleTitle: targetRole.title,
          difficulty: 'Diagnostic',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate diagnostic quiz.');
      }
      onAddCustomQuiz(data as AssessmentQuiz);
      setAnswers({});
      setSubmittedResult(null);
      onSelectQuiz(data.id);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Unable to generate quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    let correctCount = 0;
    const weakConcepts: string[] = [];

    for (const q of activeQuiz.questions) {
      const chosen = answers[q.id];
      if (chosen === q.correctIndex) {
        correctCount++;
      } else {
        weakConcepts.push(q.conceptTag);
      }
    }

    const score = Math.round((correctCount / activeQuiz.questions.length) * 100);
    const result: AssessmentResult = {
      id: `res-${Date.now()}`,
      topic: activeQuiz.topic,
      targetSkill: activeQuiz.targetSkill,
      score,
      correctCount,
      totalQuestions: activeQuiz.questions.length,
      weakConcepts,
      timestamp: 'Just now',
      triggeredAdaptation: score < 60,
    };

    setSubmittedResult(result);
    onCompleteAssessment(result);
  };

  const handleGenerateInterviewQuestion = async () => {
    setIsLoadingInterview(true);
    setInterviewError(null);
    setInterviewFeedback(null);
    setInterviewAnswer('');
    try {
      const resp = await fetch('/api/interview/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          targetRoleTitle: targetRole.title,
          focusSkill: interviewSkill,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not generate interview question.');
      }
      setInterviewQuestion(data as InterviewQuestion);
    } catch (err: unknown) {
      setInterviewError(err instanceof Error ? err.message : 'Interview request failed.');
    } finally {
      setIsLoadingInterview(false);
    }
  };

  const handleEvaluateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewQuestion || interviewAnswer.trim().length < 5) return;
    setIsLoadingInterview(true);
    setInterviewError(null);
    try {
      const resp = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: interviewQuestion,
          answer: interviewAnswer.trim(),
          targetRoleTitle: targetRole.title,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Evaluation failed.');
      }
      setInterviewFeedback(data as InterviewFeedback);
    } catch (err: unknown) {
      setInterviewError(err instanceof Error ? err.message : 'Unable to evaluate answer.');
    } finally {
      setIsLoadingInterview(false);
    }
  };

  const interviewSkillOptions = Array.from(
    new Set([
      ...missingSkills,
      ...targetRole.requirements.map((r) => r.skill),
    ])
  );

  return (
    <div className="space-y-6">
      {/* Header + Mode Switcher */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs font-medium text-[#2563EB]">
              Evaluation Studio · {targetRole.title}
            </div>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              Skill Diagnostics & Mock Technical Interviews
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Scoring below 60% on any diagnostic triggers all 4 agents to insert remedial exercises. Practice real interview answers calibrated to your projects.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start">
            <button
              onClick={() => setMode('quizzes')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'quizzes'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Skill Quizzes (MCQ)
            </button>
            <button
              onClick={() => setMode('interview')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'interview'
                  ? 'bg-[#0D9488] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Mock Interview Simulator
            </button>
          </div>
        </div>

        {mode === 'quizzes' && (
          <form
            onSubmit={handleGenerateCustomQuiz}
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"
          >
            <span className="text-xs font-medium text-slate-600">Need another topic?</span>
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Enter any skill (e.g. Docker, TypeScript, REST APIs)"
              className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#2563EB] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isGenerating ? 'Generating Quiz...' : 'Generate AI Diagnostic'}
            </button>
          </form>
        )}

        {genError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
            {genError}
          </div>
        )}
      </section>

      {mode === 'interview' ? (
        /* MOCK TECHNICAL INTERVIEW SIMULATOR */
        <section className="rounded-xl border border-teal-200/80 bg-white p-6 space-y-5">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Role-Specific Mock Interview Coach
              </h2>
              <p className="text-xs text-slate-600">
                Generates practical scenario questions tailored to {profile.name}’s projects and evaluates your answer with a hiring rubric.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={interviewSkill}
                onChange={(e) => setInterviewSkill(e.target.value)}
                aria-label="Interview focus skill"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-[#0D9488] focus:outline-none"
              >
                {interviewSkillOptions.map((s) => (
                  <option key={s} value={s}>
                    Focus: {s}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateInterviewQuestion}
                disabled={isLoadingInterview}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-4 py-2 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50 whitespace-nowrap"
              >
                {isLoadingInterview ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {interviewQuestion ? 'New Question' : 'Start Interview Question'}
              </button>
            </div>
          </div>

          {interviewError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
              {interviewError}
            </div>
          )}

          {!interviewQuestion ? (
            <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/40 p-8 text-center space-y-2">
              <div className="text-sm font-semibold text-slate-900">
                Ready for a 2-minute technical interview check?
              </div>
              <p className="mx-auto max-w-lg text-xs leading-relaxed text-slate-600">
                Select any missing or core skill above and click <strong>Start Interview Question</strong> to practice explaining technical tradeoffs out loud or in writing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 space-y-2">
                <div className="text-xs font-semibold text-[#0D9488]">
                  Interviewer Question · {interviewQuestion.focusSkill}
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-900">
                  {interviewQuestion.question}
                </p>
                <p className="text-xs text-slate-600">{interviewQuestion.contextNote}</p>
                <div className="pt-1 text-[11px] text-slate-500">
                  Rubric focus: {interviewQuestion.evaluationCriteria.join(' · ')}
                </div>
              </div>

              <form onSubmit={handleEvaluateInterview} className="space-y-3">
                <label className="block text-xs font-medium text-slate-700">
                  Your Interview Response
                </label>
                <textarea
                  rows={5}
                  value={interviewAnswer}
                  onChange={(e) => setInterviewAnswer(e.target.value)}
                  placeholder="Explain your approach clearly, mentioning architecture choices, edge cases, and how you would test it..."
                  className="w-full rounded-lg border border-slate-200 p-3.5 text-sm leading-relaxed text-slate-900 focus:border-[#0D9488] focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoadingInterview || interviewAnswer.trim().length < 5}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isLoadingInterview ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Evaluate My Answer
                  </button>
                </div>
              </form>

              {interviewFeedback && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex flex-col justify-between gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-xs font-medium text-slate-500">Interviewer Verdict</div>
                      <div className="text-base font-semibold text-slate-900">
                        {interviewFeedback.verdict}
                      </div>
                    </div>
                    <div className="font-mono text-2xl font-semibold text-[#0D9488] tabular-nums">
                      {interviewFeedback.score}%
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-emerald-700">What Worked Well</div>
                      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-700">
                        {interviewFeedback.strengths.map((s, i) => (
                          <li key={i}>· {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-700">Missing Signals</div>
                      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-700">
                        {interviewFeedback.gaps.map((g, i) => (
                          <li key={i}>· {g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                    <div className="text-xs font-semibold text-slate-900">
                      Example Strong Answer
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-700">
                      {interviewFeedback.sampleStrongAnswer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      ) : activeQuiz ? (
        /* ACTIVE QUIZ RUNNER */
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs text-slate-500">
                {activeQuiz.targetSkill} · {activeQuiz.difficulty} ·{' '}
                <span className="font-mono tabular-nums">{activeQuiz.questions.length} questions</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{activeQuiz.topic}</h2>
            </div>

            <button
              onClick={() => onSelectQuiz(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 self-start whitespace-nowrap"
            >
              Back to Diagnostics
            </button>
          </div>

          {!submittedResult && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Answer all {activeQuiz.questions.length} questions, then submit to calibrate your roadmap</span>
                <span className="font-mono tabular-nums">
                  {Object.keys(answers).length} / {activeQuiz.questions.length} answered
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all duration-200"
                  style={{
                    width: `${(Object.keys(answers).length / Math.max(1, activeQuiz.questions.length)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {submittedResult && (
            <div
              className={`rounded-lg border p-4 ${
                submittedResult.score < 60
                  ? 'border-amber-200 bg-amber-50/70'
                  : 'border-emerald-200 bg-emerald-50/70'
              }`}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  {submittedResult.score < 60 ? (
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Diagnostic Score:{' '}
                      <span className="font-mono tabular-nums">{submittedResult.score}%</span> (
                      {submittedResult.correctCount}/{submittedResult.totalQuestions} correct)
                    </div>
                    <div className="text-xs text-slate-700">
                      {submittedResult.score < 60
                        ? `Low score detected (<60%). Multi-agent adaptation triggered for: ${
                            submittedResult.weakConcepts.join(', ') || activeQuiz.targetSkill
                          }.`
                        : 'Strong diagnostic performance logged. Agents calibrated your readiness upward.'}
                    </div>
                  </div>
                </div>
                {isOrchestrating ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] shrink-0">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Adapting roadmap...
                  </span>
                ) : (
                  <button
                    onClick={onViewRoadmap}
                    className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    View Adapted Roadmap
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {activeQuiz.questions.map((q, qIdx) => {
              const selected = answers[q.id];
              const isGraded = submittedResult !== null;

              return (
                <div key={q.id} className="space-y-3 border-b border-slate-100 pb-5 last:border-b-0">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono font-medium tabular-nums">
                      Question 0{qIdx + 1}
                    </span>
                    <span>Concept: {q.conceptTag}</span>
                  </div>

                  <p className="text-sm font-medium text-slate-900">{q.prompt}</p>

                  {q.codeSnippet && (
                    <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3.5 font-mono text-xs leading-relaxed text-slate-100">
                      <code>{q.codeSnippet}</code>
                    </pre>
                  )}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const isChosen = selected === optIdx;
                      const isCorrect = q.correctIndex === optIdx;

                      let btnStyle =
                        'border-slate-200 bg-white text-slate-800 hover:border-slate-300';
                      if (!isGraded && isChosen) {
                        btnStyle = 'border-[#2563EB] bg-blue-50/70 text-slate-900 font-medium';
                      } else if (isGraded) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                        } else if (isChosen && !isCorrect) {
                          btnStyle = 'border-red-400 bg-red-50 text-red-900';
                        } else {
                          btnStyle = 'border-slate-200 bg-slate-50 text-slate-500';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={isGraded}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-xs transition-colors ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {isGraded && isCorrect && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          )}
                          {isGraded && isChosen && !isCorrect && (
                            <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isGraded && (
                    <div className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-700">
                      <span className="font-semibold text-slate-900">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submittedResult && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {Object.keys(answers).length} / {activeQuiz.questions.length} answered
              </span>
              <button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(answers).length < activeQuiz.questions.length}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <ClipboardCheck className="h-4 w-4" />
                Submit & Evaluate with Agents
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-[#2563EB]">
                    {quiz.targetSkill} · {quiz.difficulty}
                  </span>
                  <span className="font-mono tabular-nums">~{quiz.estimatedMinutes} min</span>
                </div>
                <h2 className="mt-1.5 text-base font-semibold text-slate-900">{quiz.topic}</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Evaluates {quiz.questions.map((q) => q.conceptTag).join(', ')}.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {quiz.questions.length} questions
                </span>
                <button
                  onClick={() => handleStartQuiz(quiz.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5" /> Start Diagnostic
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Assessment History Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Assessment Performance Log</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No diagnostics completed yet. Start any assessment above to calibrate your roadmap.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2 pr-4">Topic</th>
                  <th className="py-2 px-3">Target Skill</th>
                  <th className="py-2 px-3 text-right">Score</th>
                  <th className="py-2 px-3">Weak Concepts Flagged</th>
                  <th className="py-2 pl-4">Agent Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{item.topic}</td>
                    <td className="py-3 px-3 text-xs text-slate-600">{item.targetSkill}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-semibold tabular-nums">
                      <span className={item.score < 60 ? 'text-amber-700' : 'text-emerald-700'}>
                        {item.score}% ({item.correctCount}/{item.totalQuestions})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {item.weakConcepts.length > 0 ? item.weakConcepts.join(', ') : 'None'}
                    </td>
                    <td className="py-3 pl-4 text-xs">
                      {item.triggeredAdaptation ? (
                        <span className="font-medium text-amber-700">
                          Remedial roadmap adaptation triggered
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Mastery verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
