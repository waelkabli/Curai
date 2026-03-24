'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Database } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { ChatMessage } from '@/types';
import { getSettings } from '@/lib/utils';
import { generateId } from '@/lib/utils';
import axios from 'axios';
import { cn } from '@/lib/utils';

const SUGGESTED_QUESTIONS = [
  'What are total sales this month?',
  'Which business line has the most customers?',
  'Show top 10 orders by value',
  'How many orders were placed today?',
  'What is the revenue breakdown by insurance provider?',
  'Show monthly sales trend for this year',
];

type AIProvider = 'openai' | 'anthropic' | 'perplexity';

const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'anthropic', label: 'Claude' },
  { value: 'openai', label: 'GPT-4' },
  { value: 'perplexity', label: 'Perplexity' },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('anthropic');
  const [schema, setSchema] = useState<unknown>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Try to load cached schema
    const settings = getSettings();
    if (settings?.ai?.defaultProvider) {
      setSelectedProvider(settings.ai.defaultProvider);
    }
    const cachedSchema = localStorage.getItem('curadb-schema');
    if (cachedSchema) {
      try {
        setSchema(JSON.parse(cachedSchema));
      } catch {
        // ignore
      }
    }
  }, []);

  const getAIConfig = () => {
    const settings = getSettings();
    if (!settings?.ai) return { apiKey: '', model: '' };
    const providerConfig = settings.ai[selectedProvider];
    return {
      apiKey: providerConfig?.apiKey || '',
      model: providerConfig?.model || '',
    };
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const settings = getSettings();
    const dbConfig = settings?.db;
    const { apiKey, model } = getAIConfig();

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const loadingMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    const historyForAPI = messages
      .filter((m) => !m.loading)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await axios.post('/api/chat', {
        message: text,
        history: historyForAPI,
        aiProvider: selectedProvider,
        apiKey,
        model,
        dbConfig,
        schema,
      });

      const data = response.data;

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.conversational
          ? data.insights
          : `I found ${data.rowCount || 0} result${data.rowCount !== 1 ? 's' : ''} for your question.`,
        sql: data.sql,
        results: data.results,
        insights: data.conversational ? undefined : data.insights,
        chartSuggestion: data.chartSuggestion,
        timestamp: new Date(),
      };

      setMessages((prev) => prev.slice(0, -1).concat(assistantMsg));
    } catch (error) {
      let errorMsg = 'Failed to get a response. ';
      if (axios.isAxiosError(error)) {
        errorMsg += error.response?.data?.error || error.message;
      }

      const errMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date(),
        error: errorMsg,
      };

      setMessages((prev) => prev.slice(0, -1).concat(errMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (q: string) => {
    setInput(q);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Provider selector */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
        <Sparkles className="w-4 h-4 text-cura-blue flex-shrink-0" />
        <span className="text-sm text-gray-600 font-medium">AI Provider:</span>
        <div className="flex gap-1.5">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelectedProvider(p.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                selectedProvider === p.value
                  ? 'bg-cura-blue text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {schema ? (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600">
            <Database className="w-3.5 h-3.5" />
            <span>Schema loaded</span>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-500">
            <Database className="w-3.5 h-3.5" />
            <span>No schema - run Schema Explorer first</span>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cura-blue to-cura-navy rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-cura-navy mb-2">CuraDB AI Chat</h2>
              <p className="text-gray-500 text-sm max-w-sm">
                Ask questions about your healthcare data in plain English. The AI will generate SQL and provide insights.
              </p>
            </div>

            <div className="w-full max-w-xl">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
                Suggested Questions
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestion(q)}
                    className="px-3 py-2 bg-white text-gray-600 text-xs rounded-full border border-gray-200 hover:border-cura-blue hover:text-cura-blue hover:shadow-sm transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-100 bg-white">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => handleSuggestion(q)}
                className="px-2.5 py-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-cura-blue focus-within:ring-2 focus-within:ring-cura-blue/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your data... (Press Enter to send)"
              className="w-full bg-transparent px-4 py-3 text-sm text-gray-700 resize-none outline-none max-h-32 min-h-[48px]"
              rows={1}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={cn(
              'p-3 rounded-xl transition-all flex-shrink-0',
              input.trim() && !loading
                ? 'bg-cura-blue text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          AI-generated SQL is shown for transparency. Always verify before using in production.
        </p>
      </div>
    </div>
  );
}
