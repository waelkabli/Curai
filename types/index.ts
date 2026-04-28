export interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface AIConfig {
  openai: {
    apiKey: string;
    model: string;
    enabled: boolean;
  };
  anthropic: {
    apiKey: string;
    model: string;
    enabled: boolean;
  };
  perplexity: {
    apiKey: string;
    model: string;
    enabled: boolean;
  };
  defaultProvider: 'openai' | 'anthropic' | 'perplexity';
}

export interface DisplayConfig {
  dateFormat: string;
  currency: string;
  defaultDateRange: string;
}

export interface AppSettings {
  db: DBConfig;
  ai: AIConfig;
  display: DisplayConfig;
}

export type ChartGranularity = 'daily' | 'monthly' | 'quarterly' | 'yearly';

export interface KPIData {
  dailyAveSales: number;
  dailyAveOrders: number;
  totalSales: number;
  totalOrders: number;
}

export interface ChartDataPoint {
  period: string;
  customers: number;
  orders: number;
  sales: number;
}

export interface BusinessLineRow {
  businessLine: string;
  sales: number;
  orders: number;
  customers: number;
}

export interface MainReportData {
  kpis: KPIData;
  chartData: ChartDataPoint[];
  tableData: BusinessLineRow[];
}

export interface ScoreSection {
  customers: number;
  totalSales: number;
  totalOrders: number;
}

export interface ScoresReportData {
  today: ScoreSection;
  specializedMental: {
    insurance: ScoreSection;
    pharmacy: ScoreSection;
    cash: ScoreSection;
  };
  urgentCare: {
    insurance: ScoreSection;
    pharmacy: ScoreSection;
    cash: ScoreSection;
  };
  wellnessBundlesHomeLabs: {
    insurance: ScoreSection;
    bundle: ScoreSection;
    homeLabs: ScoreSection;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  results?: Record<string, unknown>[];
  insights?: string;
  chartSuggestion?: string;
  timestamp: Date;
  loading?: boolean;
  error?: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  key: string;
  extra: string;
}

export interface SchemaForeignKey {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

export interface SchemaTable {
  name: string;
  schema: string;
  columns: SchemaColumn[];
  foreignKeys: SchemaForeignKey[];
  rowCount?: number;
}

export interface SchemaData {
  tables: SchemaTable[];
  relationships: {
    from: string;
    to: string;
    fromColumn: string;
    toColumn: string;
  }[];
}

export interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'prebuilt' | 'ai-suggested';
  route?: string;
}

export interface FilterState {
  year?: string;
  quarter?: string;
  month?: string;
  day?: string;
  businessLine?: string;
  organization?: string;
  currency?: string;
  revenueSource?: string;
  dispenseAmount?: string;
}
