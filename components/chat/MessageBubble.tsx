'use client';

import { useState } from 'react';
import { ChatMessage } from '@/types';
import { ChevronDown, ChevronRight, Copy, Check, Bot, User, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (message.loading) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-cura-blue flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-white rounded-xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-cura-blue rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">Thinking...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-3', isUser ? 'flex-row-reverse' : '')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isUser ? 'bg-cura-navy' : 'bg-cura-blue'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'flex flex-col gap-2 max-w-[80%]',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Main message bubble */}
        <div className={cn(
          'px-4 py-3 rounded-xl shadow-sm text-sm leading-relaxed',
          isUser
            ? 'bg-cura-navy text-white rounded-tr-none'
            : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
        )}>
          {message.error ? (
            <div className="flex items-start gap-2 text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{message.error}</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* SQL expandable section */}
        {message.sql && (
          <div className="w-full bg-gray-900 rounded-xl overflow-hidden">
            <button
              onClick={() => setSqlExpanded(!sqlExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {sqlExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>SQL Query</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(message.sql!);
                }}
                className="p-1 hover:bg-gray-700 rounded"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </button>
            {sqlExpanded && (
              <div className="px-4 pb-4 overflow-x-auto">
                <pre className="text-xs text-green-400 font-mono leading-relaxed">
                  {message.sql}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Results table */}
        {message.results && message.results.length > 0 && (
          <div className="w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                Results ({message.results.length} rows)
              </span>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="text-xs w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(message.results[0]).slice(0, 8).map((key) => (
                      <th key={key} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                    {Object.keys(message.results[0]).length > 8 && (
                      <th className="text-left px-3 py-2 font-medium text-gray-400">
                        +{Object.keys(message.results[0]).length - 8} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {message.results.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).slice(0, 8).map((val, cidx) => (
                        <td key={cidx} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                          {val === null ? <span className="text-gray-400 italic">null</span> : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {message.results.length > 20 && (
                <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
                  Showing 20 of {message.results.length} rows
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insights */}
        {message.insights && !message.error && (
          <div className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              AI Insights
            </div>
            <div className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">
              {message.insights}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-gray-400">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
