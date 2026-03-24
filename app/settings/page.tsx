'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Brain,
  Monitor,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Info,
  Save,
} from 'lucide-react';
import axios from 'axios';
import { cn, getSettings, saveSettings } from '@/lib/utils';
import { AppSettings } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  db: {
    host: '',
    port: 3306,
    database: '',
    user: '',
    password: '',
  },
  ai: {
    openai: { apiKey: '', model: 'gpt-4o', enabled: false },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6', enabled: true },
    perplexity: { apiKey: '', model: 'llama-3.1-sonar-large-128k-online', enabled: false },
    defaultProvider: 'anthropic',
  },
  display: {
    dateFormat: 'MMM dd, yyyy',
    currency: 'SAR',
    defaultDateRange: '30days',
  },
};

type Tab = 'database' | 'ai' | 'display';

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('database');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [serverIP, setServerIP] = useState<string>('Loading...');
  const [copiedIP, setCopiedIP] = useState(false);

  useEffect(() => {
    const saved = getSettings();
    if (saved) {
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
    }

    // Fetch server IP
    axios.get('/api/ip').then((res) => {
      setServerIP(res.data.ip || 'Unknown');
    }).catch(() => {
      setServerIP('Unable to detect');
    });
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await axios.post('/api/db', {
        dbConfig: settings.db,
        query: 'SELECT 1 as test',
      });
      if (response.data.rows) {
        setTestResult({ success: true, message: 'Connection successful! Database is accessible.' });
      }
    } catch (err) {
      let msg = 'Connection failed.';
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.error || err.message;
      }
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const copyIP = async () => {
    await navigator.clipboard.writeText(serverIP);
    setCopiedIP(true);
    setTimeout(() => setCopiedIP(false), 2000);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Providers', icon: <Brain className="w-4 h-4" /> },
    { id: 'display', label: 'Display', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-cura-navy">Settings</h2>
        <p className="text-gray-500 text-sm mt-1">
          Configure your database connection, AI providers, and display preferences
        </p>
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg mt-2 inline-flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Settings are stored locally in your browser. API keys and passwords are not sent to any server.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-cura-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Database Tab */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-cura-navy flex items-center gap-2">
              <Database className="w-4 h-4 text-cura-blue" />
              MySQL Connection
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <InputField
                  label="Host / IP Address"
                  value={settings.db.host}
                  onChange={(v) => setSettings({ ...settings, db: { ...settings.db, host: v } })}
                  placeholder="e.g., 192.168.1.100 or db.example.com"
                />
              </div>
              <InputField
                label="Port"
                value={settings.db.port}
                onChange={(v) => setSettings({ ...settings, db: { ...settings.db, port: parseInt(v) || 3306 } })}
                type="number"
                placeholder="3306"
              />
              <InputField
                label="Database Name"
                value={settings.db.database}
                onChange={(v) => setSettings({ ...settings, db: { ...settings.db, database: v } })}
                placeholder="your_database"
              />
              <InputField
                label="Username"
                value={settings.db.user}
                onChange={(v) => setSettings({ ...settings, db: { ...settings.db, user: v } })}
                placeholder="root"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <PasswordInput
                  value={settings.db.password}
                  onChange={(v) => setSettings({ ...settings, db: { ...settings.db, password: v } })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-lg text-sm',
                testResult.success
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              )}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {testResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 border border-cura-blue text-cura-blue rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Test Connection
              </button>
            </div>
          </div>

          {/* Server IP info */}
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800 mb-1 text-sm">Your Server IP Address</h4>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 bg-white rounded-lg px-3 py-2 border border-blue-200 font-mono text-sm text-blue-900">
                    {serverIP}
                  </div>
                  <button
                    onClick={copyIP}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    {copiedIP ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedIP ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Share this IP address with your DBA to whitelist it in your database server's firewall rules.
                  This allows CuraDB AI to connect to your MySQL database securely.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Providers Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          {/* Default provider */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Default AI Provider</label>
            <select
              value={settings.ai.defaultProvider}
              onChange={(e) => setSettings({
                ...settings,
                ai: { ...settings.ai, defaultProvider: e.target.value as 'openai' | 'anthropic' | 'perplexity' }
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
            >
              <option value="anthropic">Anthropic Claude</option>
              <option value="openai">OpenAI GPT</option>
              <option value="perplexity">Perplexity</option>
            </select>
          </div>

          {/* OpenAI */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                OpenAI
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ai.openai.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, openai: { ...settings.ai.openai, enabled: e.target.checked } }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cura-blue" />
              </label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <PasswordInput
                  value={settings.ai.openai.apiKey}
                  onChange={(v) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, openai: { ...settings.ai.openai, apiKey: v } }
                  })}
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                <select
                  value={settings.ai.openai.model}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, openai: { ...settings.ai.openai, model: e.target.value } }
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30"
                >
                  <option value="gpt-4o">GPT-4o (Recommended)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Anthropic */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                Anthropic Claude
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ai.anthropic.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, anthropic: { ...settings.ai.anthropic, enabled: e.target.checked } }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cura-blue" />
              </label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <PasswordInput
                  value={settings.ai.anthropic.apiKey}
                  onChange={(v) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, anthropic: { ...settings.ai.anthropic, apiKey: v } }
                  })}
                  placeholder="sk-ant-..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                <select
                  value={settings.ai.anthropic.model}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, anthropic: { ...settings.ai.anthropic, model: e.target.value } }
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30"
                >
                  <option value="claude-opus-4-5">Claude Opus 4.5 (Most Powerful)</option>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Recommended)</option>
                  <option value="claude-haiku-4-5">Claude Haiku 4.5 (Fast)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Perplexity */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-6 h-6 bg-teal-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">P</span>
                </div>
                Perplexity
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ai.perplexity.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, perplexity: { ...settings.ai.perplexity, enabled: e.target.checked } }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cura-blue" />
              </label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <PasswordInput
                  value={settings.ai.perplexity.apiKey}
                  onChange={(v) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, perplexity: { ...settings.ai.perplexity, apiKey: v } }
                  })}
                  placeholder="pplx-..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                <select
                  value={settings.ai.perplexity.model}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, perplexity: { ...settings.ai.perplexity, model: e.target.value } }
                  })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30"
                >
                  <option value="llama-3.1-sonar-large-128k-online">Sonar Large 128k (Online)</option>
                  <option value="llama-3.1-sonar-small-128k-online">Sonar Small 128k (Online)</option>
                  <option value="llama-3.1-sonar-large-128k-chat">Sonar Large 128k (Chat)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Display Tab */}
      {activeTab === 'display' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-cura-navy flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cura-blue" />
              Display Preferences
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Format</label>
              <select
                value={settings.display.dateFormat}
                onChange={(e) => setSettings({ ...settings, display: { ...settings.display, dateFormat: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
              >
                <option value="MMM dd, yyyy">Jan 01, 2024</option>
                <option value="dd/MM/yyyy">01/01/2024</option>
                <option value="yyyy-MM-dd">2024-01-01</option>
                <option value="MM/dd/yyyy">01/01/2024 (US)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Currency</label>
              <select
                value={settings.display.currency}
                onChange={(e) => setSettings({ ...settings, display: { ...settings.display, currency: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
              >
                <option value="SAR">SAR - Saudi Riyal</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AED">AED - UAE Dirham</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Date Range</label>
              <select
                value={settings.display.defaultDateRange}
                onChange={(e) => setSettings({ ...settings, display: { ...settings.display, defaultDateRange: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="thisYear">This Year</option>
                <option value="allTime">All Time</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="mt-6">
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm',
            saved
              ? 'bg-green-600 text-white'
              : 'bg-cura-blue text-white hover:bg-blue-700'
          )}
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
