import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number, currency = 'SAR'): string {
  if (isNaN(value)) return `${currency} 0.00`;
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: currency === 'SAR' ? 'SAR' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDate(date: string | Date, format = 'MMM dd, yyyy'): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  switch (format) {
    case 'MMM dd, yyyy':
      return `${month} ${day}, ${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${day}`;
    case 'dd/MM/yyyy':
      return `${day}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${year}`;
    default:
      return `${month} ${day}, ${year}`;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getColorForBusinessLine(businessLine: string): string {
  const colors: Record<string, string> = {
    SpecialityCare: '#1565C0',
    MentalCare: '#7B1FA2',
    InsuranceSpecialityCare: '#0288D1',
    UrgentCare: '#E85D4A',
    DawaaUrgentCare: '#F57C00',
    Wellness: '#2E7D32',
    InsuranceMentalCare: '#6A1B9A',
    HomeLabs: '#00838F',
    InsuranceInstant: '#1976D2',
    Followups: '#558B2F',
  };
  return colors[businessLine] || '#9E9E9E';
}

export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function safeLocalStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getSettings() {
  const storage = safeLocalStorage();
  if (!storage) return null;
  try {
    const settings = storage.getItem('curadb-settings');
    return settings ? JSON.parse(settings) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: unknown) {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem('curadb-settings', JSON.stringify(settings));
  } catch {
    console.error('Failed to save settings');
  }
}
