import React, { useRef, useState } from 'react';
import { ArrowRight, Bot, Loader2, Send, Square, User, Volume2 } from 'lucide-react';
import {
  CareerRole,
  LearnerProfile,
  MentorActionSuggestion,
  MentorMessage,
  OrchestrationState,
} from '../types';

interface MentorViewProps {
  profile: LearnerProfile;
  targetRole: CareerRole;
  orchestration: OrchestrationState;
  messages: MentorMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onExecuteSuggestedAction: (action: MentorActionSuggestion) => void;
  isSending: boolean;
}

const STARTER_PROMPTS = [
  'Why did the agents schedule JavaScript before React for me?',
  'How does my Python and SQL project help me become a Full Stack Developer?',
  'I only have 6 hours this week — what should I prioritize first?',
  'Quiz me conceptually on what I missed in my latest diagnostic.',
];

export const MentorView: React.FC<MentorViewProps> = ({
  profile,
  targetRole,
  orchestration,
  messages,
  onSendMessage,
  onExecuteSuggestedAction,
  isSending,
}) => {
  const [input, setInput] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const text = input.trim();
    setInput('');
    await onSendMessage(text);
  };

  const handleSpeakMessage = async (msg: MentorMessage) => {
    if (speakingMsgId === msg.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSpeakingMsgId(null);
      return;
    }

    setLoadingAudioId(msg.id);
    try {
      const resp = await fetch('/api/mentor/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Speech error');
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setSpeakingMsgId(null);
      audio.onerror = () => setSpeakingMsgId(null);
      await audio.play();
      setSpeakingMsgId(msg.id);
    } catch {
      setSpeakingMsgId(null);
    } finally {
      setLoadingAudioId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Left Context Panel */}
      <aside className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-4 space-y-4">
        <div className="rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] p-4 text-white">
          <div className="text-[11px] font-medium text-blue-200">Live Mentor Context</div>
          <h2 className="mt-1 text-base font-semibold">
            {profile.name} → {targetRole.title}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
            <div>
              <div className="text-[11px] text-blue-200">Role Readiness</div>
              <div className="font-mono text-lg font-semibold text-white tabular-nums">
                {orchestration.readinessScore}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-blue-200">Study Budget</div>
              <div className="font-mono text-lg font-semibold text-white tabular-nums">
                {profile.weeklyHoursBudget}h/wk
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-800">Active Skill Gaps</div>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            {orchestration.missingSkills.join(' · ') || 'No critical skill gaps'}
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-800">Suggested Questions</div>
          <div className="mt-2 space-y-1.5">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isSending}
                onClick={() => onSendMessage(prompt)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:border-[#2563EB] hover:bg-blue-50/40 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Chat Workspace */}
      <section className="flex h-[620px] flex-col rounded-xl border border-slate-200 bg-white lg:col-span-8">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Adaptive AI Mentor</h1>
              <p className="text-xs text-slate-500">
                Synchronized with Skill Analyst, Career Matcher & Curriculum Architect
              </p>
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFC] p-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'mentor' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0F172A] text-white mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`max-w-[82%] space-y-2 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#2563EB] text-white'
                    : 'border border-slate-200 bg-white text-slate-800'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {msg.suggestedAction && (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-slate-900">
                    <div className="text-xs font-semibold text-[#1D4ED8]">{msg.suggestedAction.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-600">
                      {msg.suggestedAction.description}
                    </div>
                    <button
                      onClick={() => onExecuteSuggestedAction(msg.suggestedAction!)}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Apply Action <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span
                    className={`text-[10px] ${
                      msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>

                  {msg.sender === 'mentor' && (
                    <button
                      onClick={() => handleSpeakMessage(msg)}
                      disabled={loadingAudioId === msg.id}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#2563EB] disabled:opacity-50"
                    >
                      {loadingAudioId === msg.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : speakingMsgId === msg.id ? (
                        <Square className="h-3 w-3 text-red-600" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                      {speakingMsgId === msg.id ? 'Stop' : 'Listen'}
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-200 text-slate-700 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
              Mentor is reviewing your skill graph and roadmap...
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 bg-white p-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI Mentor about skill gaps, projects, or roadmap pacing..."
            className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </section>
    </div>
  );
};
