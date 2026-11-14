import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  evaluateInterviewAnswer,
  findLiveFreeResources,
  generateCustomCareerRole,
  generateDiagnosticQuiz,
  generateInterviewQuestion,
  parseLearnerProfileFromText,
  reviewPracticalExercise,
  runMentorChat,
  runMultiAgentOrchestration,
  synthesizeMentorSpeech,
} from './server/agents';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // Streaming SSE endpoint for live 4-agent collaboration
  app.post('/api/agents/orchestrate-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: unknown) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const { profile, targetRole, triggerReason, latestAssessment, completedResourceIds } =
        req.body || {};
      if (!profile || !targetRole) {
        sendEvent({ type: 'error', error: 'Missing profile or targetRole payload.' });
        res.end();
        return;
      }

      await runMultiAgentOrchestration(
        {
          profile,
          targetRole,
          triggerReason: triggerReason || 'Manual agent synchronization',
          latestAssessment,
          completedResourceIds,
        },
        (event) => {
          sendEvent(event);
        }
      );

      res.end();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Multi-agent orchestration failed.';
      console.error('Orchestration stream error:', message);
      sendEvent({ type: 'error', error: message });
      res.end();
    }
  });

  // Non-streaming fallback endpoint
  app.post('/api/agents/orchestrate', async (req, res) => {
    try {
      const { profile, targetRole, triggerReason, latestAssessment, completedResourceIds } =
        req.body || {};
      if (!profile || !targetRole) {
        res.status(400).json({ error: 'Missing profile or targetRole payload.' });
        return;
      }

      const result = await runMultiAgentOrchestration({
        profile,
        targetRole,
        triggerReason: triggerReason || 'Manual agent synchronization',
        latestAssessment,
        completedResourceIds,
      });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Orchestration failed.';
      console.error('Orchestrate error:', message);
      res.status(500).json({ error: message });
    }
  });

  // Dynamic AI quiz generator
  app.post('/api/assessments/generate', async (req, res) => {
    try {
      const { skill, targetRoleTitle, difficulty } = req.body || {};
      if (!skill) {
        res.status(400).json({ error: 'Skill parameter is required.' });
        return;
      }
      const quiz = await generateDiagnosticQuiz({
        skill,
        targetRoleTitle: targetRoleTitle || 'Full Stack Developer',
        difficulty: difficulty || 'Diagnostic',
      });
      res.json(quiz);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Quiz generation failed.';
      console.error('Quiz generation error:', message);
      res.status(500).json({ error: message });
    }
  });

  // Context-aware AI Mentor chat
  app.post('/api/mentor/chat', async (req, res) => {
    try {
      const { message, history, profile, targetRole, orchestration } = req.body || {};
      if (!message || !profile || !targetRole || !orchestration) {
        res.status(400).json({ error: 'Missing required chat context.' });
        return;
      }
      const response = await runMentorChat({
        message,
        history: Array.isArray(history) ? history : [],
        profile,
        targetRole,
        orchestration,
      });
      res.json(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Mentor response failed.';
      console.error('Mentor chat error:', message);
      res.status(500).json({ error: message });
    }
  });

  // AI Quick-Fill profile parser
  app.post('/api/profile/parse', async (req, res) => {
    try {
      const { text } = req.body || {};
      if (!text || typeof text !== 'string' || text.trim().length < 8) {
        res.status(400).json({ error: 'Please enter a short bio or resume snippet.' });
        return;
      }
      const parsed = await parseLearnerProfileFromText(text.trim());
      res.json(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Profile extraction failed.';
      console.error('Profile parse error:', message);
      res.status(500).json({ error: message });
    }
  });

  // Custom career role benchmark generator
  app.post('/api/roles/generate', async (req, res) => {
    try {
      const { roleInput } = req.body || {};
      if (!roleInput || typeof roleInput !== 'string' || roleInput.trim().length < 2) {
        res.status(400).json({ error: 'Please provide a role title or job description.' });
        return;
      }
      const role = await generateCustomCareerRole(roleInput.trim());
      res.json(role);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Custom role creation failed.';
      console.error('Role generation error:', message);
      res.status(500).json({ error: message });
    }
  });

  // Live Google Search grounded free & paid courses/tutorials
  app.post('/api/resources/search', async (req, res) => {
    try {
      const { skill, targetRoleTitle, pricing } = req.body || {};
      if (!skill) {
        res.status(400).json({ error: 'Skill parameter is required.' });
        return;
      }
      const pricingFilter =
        pricing === 'free' || pricing === 'paid' || pricing === 'all' ? pricing : 'all';
      const results = await findLiveFreeResources({
        skill,
        targetRoleTitle: targetRoleTitle || 'Software Engineering',
        pricing: pricingFilter,
      });
      res.json(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Resource search failed.';
      console.error('Resource search error:', message);
      res.status(500).json({ error: message });
    }
  });

  // AI Practical Lab solution reviewer
  app.post('/api/labs/review', async (req, res) => {
    try {
      const { exerciseTitle, exercisePrompt, targetSkill, submission } = req.body || {};
      if (!submission || typeof submission !== 'string' || submission.trim().length < 5) {
        res.status(400).json({ error: 'Please write or paste your solution before submitting.' });
        return;
      }
      const feedback = await reviewPracticalExercise({
        exerciseTitle: exerciseTitle || 'Practical Exercise',
        exercisePrompt: exercisePrompt || '',
        targetSkill: targetSkill || 'Engineering',
        submission: submission.trim(),
      });
      res.json(feedback);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lab review failed.';
      console.error('Lab review error:', message);
      res.status(500).json({ error: message });
    }
  });

  // Mock technical interview simulator
  app.post('/api/interview/question', async (req, res) => {
    try {
      const { profile, targetRoleTitle, focusSkill } = req.body || {};
      if (!profile || !focusSkill) {
        res.status(400).json({ error: 'Profile and focusSkill are required.' });
        return;
      }
      const question = await generateInterviewQuestion({
        profile,
        targetRoleTitle: targetRoleTitle || 'Full Stack Developer',
        focusSkill,
      });
      res.json(question);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Interview question generation failed.';
      console.error('Interview question error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/interview/evaluate', async (req, res) => {
    try {
      const { question, answer, targetRoleTitle } = req.body || {};
      if (!question || !answer || typeof answer !== 'string' || answer.trim().length < 5) {
        res.status(400).json({ error: 'Please provide an answer to evaluate.' });
        return;
      }
      const feedback = await evaluateInterviewAnswer({
        question,
        answer: answer.trim(),
        targetRoleTitle: targetRoleTitle || 'Full Stack Developer',
      });
      res.json(feedback);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Interview evaluation failed.';
      console.error('Interview eval error:', message);
      res.status(500).json({ error: message });
    }
  });

  // Free-tier Gemini TTS audio briefing
  app.post('/api/mentor/speak', async (req, res) => {
    try {
      const { text } = req.body || {};
      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text is required for audio briefing.' });
        return;
      }
      const audio = await synthesizeMentorSpeech(text);
      res.json(audio);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Audio synthesis failed.';
      console.error('TTS error:', message);
      res.status(500).json({ error: message });
    }
  });

  // Vite middleware in development, static serve in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
