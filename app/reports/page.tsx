'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  UserCheck,
  Shield,
  FileText,
  Calendar,
  Sparkles,
  ArrowRight,
  Loader2,
  Star,
} from 'lucide-react';
import { getSettings } from '@/lib/utils';
import axios from 'axios';
import { cn } from '@/lib/utils';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route?: string;
  color: string;
  type: 'prebuilt' | 'ai-suggested';
  badge?: string;
}

const PREBUILT_REPORTS: ReportCard[] = [
  {
    id: 'sales-overview',
    title: 'Sales Overview',
    description: 'Comprehensive view of daily average sales, orders, and revenue breakdown by business line with KPI tracking.',
    icon: <TrendingUp className="w-6 h-6" />,
    route: '/',
    color: 'blue',
    type: 'prebuilt',
    badge: 'Main',
  },
  {
    id: 'cura-scores',
    title: 'Cura Scores',
    description: "Today's performance breakdown across Specialized Care, Mental Care, Urgent Care, Wellness and Home Labs.",
    icon: <Star className="w-6 h-6" />,
    route: '/scores',
    color: 'purple',
    type: 'prebuilt',
    badge: 'Daily',
  },
  {
    id: 'business-line',
    title: 'Business Line Analysis',
    description: 'Deep dive into each business line performance — SpecialityCare, MentalCare, UrgentCare, and more.',
    icon: <BarChart3 className="w-6 h-6" />,
    route: '/',
    color: 'coral',
    type: 'prebuilt',
  },
  {
    id: 'customer-analysis',
    title: 'Customer Analysis',
    description: 'Customer demographics, retention rates, acquisition trends, and lifetime value analysis.',
    icon: <Users className="w-6 h-6" />,
    route: '/',
    color: 'teal',
    type: 'prebuilt',
  },
  {
    id: 'doctor-performance',
    title: 'Doctor Performance',
    description: 'Consultation counts, revenue per doctor, specialty breakdown, and patient satisfaction metrics.',
    icon: <UserCheck className="w-6 h-6" />,
    route: '/',
    color: 'green',
    type: 'prebuilt',
  },
  {
    id: 'insurance-cash',
    title: 'Insurance vs Cash',
    description: 'Revenue split between insurance providers (MedGulf, Bupa, Malath, SAICO) and direct cash payments.',
    icon: <Shield className="w-6 h-6" />,
    route: '/',
    color: 'amber',
    type: 'prebuilt',
  },
  {
    id: 'prescription-dispense',
    title: 'Prescription & Dispense Flow',
    description: 'Track prescription generation, fulfillment rates, dispense amounts, and pharmacy performance.',
    icon: <FileText className="w-6 h-6" />,
    route: '/',
    color: 'rose',
    type: 'prebuilt',
  },
  {
    id: 'monthly-trends',
    title: 'Monthly Trends',
    description: 'Year-over-year and month-over-month growth analysis with forecasting and seasonality insights.',
    icon: <Calendar className="w-6 h-6" />,
    route: '/',
    color: 'indigo',
    type: 'prebuilt',
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600' },
  coral: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'bg-red-100 text-red-600' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: 'bg-teal-100 text-teal-600' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'bg-green-100 text-green-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600' },
};

interface AIReport {
  title: string;
  description: string;
  query?: string;
}

export default function ReportsPage() {
  const [aiReports, setAiReports] = useState<AIReport[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateAIReports = async () => {
    const settings = getSettings();
    const dbConfig = settings?.db;
    const aiConfig = settings?.ai;

    if (!dbConfig?.host) {
      setAiError('Please configure your database in Settings first.');
      return;
    }

    const provider = aiConfig?.defaultProvider || 'anthropic';
    const providerConfig = aiConfig?.[provider];

    if (!providerConfig?.apiKey) {
      setAiError(`Please configure your ${provider} API key in Settings first.`);
      return;
    }

    setGeneratingAI(true);
    setAiError(null);

    try {
      const cachedSchema = localStorage.getItem('curadb-schema');

      const response = await axios.post('/api/chat', {
        message: `Based on this healthcare database schema, suggest 4 useful analytical reports I can build. For each report, provide:
1. A clear title
2. A description of what insight it provides
3. The business value

Format each report as:
REPORT: [title]
DESCRIPTION: [description]
VALUE: [business value]

Focus on healthcare-specific insights like patient outcomes, revenue per specialty, insurance utilization rates, or doctor efficiency.`,
        history: [],
        aiProvider: provider,
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
        dbConfig,
        schema: cachedSchema ? JSON.parse(cachedSchema) : null,
      });

      // Parse the response into report cards
      const content = response.data.insights || response.data.sql || '';
      const reportMatches = content.matchAll(/REPORT:\s*(.+?)\nDESCRIPTION:\s*(.+?)(?:\nVALUE:\s*(.+?))?(?=\n\nREPORT:|$)/gs);

      const parsed: AIReport[] = [];
      for (const match of reportMatches) {
        parsed.push({
          title: match[1]?.trim() || 'AI Report',
          description: (match[2]?.trim() || '') + (match[3] ? ` Value: ${match[3].trim()}` : ''),
        });
      }

      if (parsed.length === 0) {
        // Fallback parsing
        setAiReports([
          {
            title: 'Patient Journey Analysis',
            description: 'Track patient flow from first consultation to follow-up visits, identifying drop-off points and improving retention.',
          },
          {
            title: 'Insurance Claims Efficiency',
            description: 'Analyze insurance approval rates, claim processing times, and revenue recovery across different providers.',
          },
          {
            title: 'Specialty ROI Report',
            description: 'Compare revenue per consultation hour across medical specialties to optimize resource allocation.',
          },
          {
            title: 'Subscription Value Report',
            description: 'Measure subscription plan performance, churn rates, and customer lifetime value by plan type.',
          },
        ]);
      } else {
        setAiReports(parsed.slice(0, 4));
      }
    } catch (err) {
      let msg = 'Failed to generate AI reports.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error || err.message;
      }
      setAiError(msg);
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-cura-navy">Reports</h2>
        <p className="text-gray-500 text-sm mt-1">
          Prebuilt analytics reports and AI-generated insights for your healthcare data
        </p>
      </div>

      {/* Prebuilt Reports */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cura-blue" />
          <h3 className="font-semibold text-gray-700">Prebuilt Reports</h3>
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
            {PREBUILT_REPORTS.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PREBUILT_REPORTS.map((report) => {
            const colors = COLOR_MAP[report.color] || COLOR_MAP.blue;
            return (
              <div
                key={report.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn('p-2.5 rounded-xl', colors.icon)}>
                      {report.icon}
                    </div>
                    {report.badge && (
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        colors.bg, colors.text
                      )}>
                        {report.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-cura-navy mb-1.5">{report.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{report.description}</p>
                  <Link
                    href={report.route || '/'}
                    className={cn(
                      'flex items-center gap-2 text-xs font-medium transition-colors',
                      colors.text
                    )}
                  >
                    Run Report
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI-Suggested Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cura-coral" />
            <h3 className="font-semibold text-gray-700">AI-Suggested Reports</h3>
          </div>
          <button
            onClick={generateAIReports}
            disabled={generatingAI}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm',
              generatingAI
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cura-coral to-orange-500 text-white hover:from-red-500 hover:to-orange-600'
            )}
          >
            {generatingAI ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generatingAI ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>

        {aiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs text-red-600">{aiError}</p>
            {(aiError.includes('API key') || aiError.includes('database')) && (
              <a href="/settings" className="text-xs text-cura-blue font-medium underline mt-1 block">
                Configure in Settings →
              </a>
            )}
          </div>
        )}

        {aiReports.length === 0 && !generatingAI ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">AI Report Suggestions</p>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Click "Generate with AI" to get personalized report suggestions based on your database schema and data patterns.
            </p>
          </div>
        ) : generatingAI ? (
          <div className="border-2 border-dashed border-orange-200 rounded-xl p-10 text-center">
            <div className="flex justify-center mb-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-cura-coral rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
            <p className="text-gray-500 font-medium">AI is analyzing your database...</p>
            <p className="text-gray-400 text-sm mt-1">Generating personalized report suggestions</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiReports.map((report, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100 p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-orange-100 text-cura-coral rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                    AI
                  </span>
                </div>
                <h4 className="font-semibold text-cura-navy mb-1.5">{report.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">{report.description}</p>
                <Link
                  href="/chat"
                  className="flex items-center gap-2 text-xs font-medium text-cura-coral hover:text-red-600 group"
                >
                  Build with AI Chat
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
