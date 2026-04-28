import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getCached, setCached, makeCacheKey } from '@/lib/cache';
import { DBConfig, FilterState } from '@/types';

export type ChartGranularity = 'daily' | 'monthly' | 'quarterly' | 'yearly';

// ─── Shared SQL fragments ────────────────────────────────────────────────────

const JOINS = `
FROM orderitems
INNER JOIN orders ON orders.Id = orderitems.OrderId
LEFT JOIN promotions ON orders.PromoId = promotions.id
LEFT JOIN insurance_eligiblity_requests ON orders.InsuranceEligibilityRequestId = insurance_eligiblity_requests.id
LEFT JOIN followups ON followups.OrderItemId = orderitems.id
LEFT JOIN subscriptions ON subscriptions.OrderItemId = orderitems.id
LEFT JOIN bundles ON bundles.id = orderitems.BundleID
LEFT JOIN wellness_programs ON wellness_programs.id = orderitems.WellnessProgramId
LEFT JOIN consultations ON consultations.OrderItemId = orderitems.id
LEFT JOIN doctors ON consultations.SubscriberDocId = doctors.DocId
LEFT JOIN categories_specialties ON doctors.PrimarySpecialtyId = categories_specialties.SpecialtyId
LEFT JOIN medicalcategories ON categories_specialties.CategoryId = medicalcategories.Id
LEFT JOIN organizations ON orders.CustomerOrganizationId = organizations.Id
LEFT JOIN currencies ON currencies.id = orders.CurrencyId
`;

const FINAL_PRICE = `(
  CASE
    WHEN promotions.code = 'anood' THEN 122.83
    WHEN insurance_eligiblity_requests.InsuranceProviderId IS NOT NULL THEN (orders.TotalOriginalPrice * 1.15)
    WHEN promotions.code IS NOT NULL AND orderitems.ProductId = 147 AND orders.Refunded = FALSE THEN 34.5
    ELSE orderitems.FinalPrice
  END
)`;

const BUSINESS_LINE = `(CASE
  WHEN followups.Id > 0 THEN 'Followups'
  WHEN subscriptions.Id > 0 THEN 'Subscriptions'
  WHEN bundles.Id > 0 AND bundles.BundleCategoryId = 9 THEN 'HomeLabs'
  WHEN bundles.Id > 0 AND bundles.BundleCategoryId != 9 THEN 'Bundles'
  WHEN wellness_programs.Id > 0 THEN 'Wellness'
  WHEN orderitems.ProductId = 147 THEN 'DawaaUrgentCare'
  WHEN orderitems.ProductId = 149 THEN 'UrgentCare'
  WHEN consultations.Id > 0 AND medicalcategories.Id = 15 AND orderitems.ProductId NOT IN (144,145,150,173) THEN 'MentalCare'
  WHEN consultations.Id > 0 AND medicalcategories.Id != 15 AND orderitems.ProductId NOT IN (144,145,150,173) THEN 'SpecialityCare'
  WHEN consultations.Id > 0 AND medicalcategories.Id = 15 AND orderitems.ProductId IN (144,145,150,173) THEN 'InsuranceMentalCare'
  WHEN consultations.Id > 0 AND medicalcategories.Id != 15 AND orderitems.ProductId IN (144,145,150,173) THEN 'InsuranceSpecialityCare'
  WHEN orderitems.ProductId IN (151,152,174,175) THEN 'InsuranceInstant'
END)`;

// ─── WHERE clause builder ────────────────────────────────────────────────────

function buildWhere(filters: FilterState): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.year) {
    conditions.push('YEAR(orderitems.Created) = ?');
    params.push(parseInt(filters.year));
  }
  if (filters.quarter) {
    conditions.push('QUARTER(orderitems.Created) = ?');
    params.push(parseInt(filters.quarter));
  }
  if (filters.month) {
    conditions.push('MONTH(orderitems.Created) = ?');
    params.push(parseInt(filters.month));
  }
  if (filters.day) {
    conditions.push('DAY(orderitems.Created) = ?');
    params.push(parseInt(filters.day));
  }
  if (filters.organization) {
    conditions.push('organizations.Name_en = ?');
    params.push(filters.organization);
  }
  if (filters.currency) {
    conditions.push('currencies.Code_en = ?');
    params.push(filters.currency);
  }
  if (filters.businessLine) {
    conditions.push(`${BUSINESS_LINE} = ?`);
    params.push(filters.businessLine);
  }

  return {
    where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '',
    params,
  };
}

// ─── Period expression by granularity ───────────────────────────────────────

function periodExpr(granularity: ChartGranularity): string {
  switch (granularity) {
    case 'daily':     return `DATE(orderitems.Created)`;
    case 'quarterly': return `CONCAT(YEAR(orderitems.Created), '-Q', QUARTER(orderitems.Created))`;
    case 'yearly':    return `CAST(YEAR(orderitems.Created) AS CHAR)`;
    case 'monthly':
    default:          return `DATE_FORMAT(orderitems.Created, '%Y-%m')`;
  }
}

function periodLimit(granularity: ChartGranularity): number {
  switch (granularity) {
    case 'daily':     return 60;
    case 'quarterly': return 12;
    case 'yearly':    return 7;
    case 'monthly':
    default:          return 18;
  }
}

// ─── Individual queries (all return only aggregated rows) ────────────────────

async function fetchKPIs(dbConfig: DBConfig, where: string, params: unknown[]) {
  const q = `
    SELECT
      COUNT(DISTINCT DATE(orderitems.Created)) AS uniqueDays,
      COALESCE(SUM(${FINAL_PRICE}), 0)         AS totalSales,
      COUNT(DISTINCT orderitems.id)            AS totalOrders
    ${JOINS}
    ${where}
  `;
  return executeQuery(dbConfig, q, params);
}

async function fetchChartData(
  dbConfig: DBConfig,
  where: string,
  params: unknown[],
  granularity: ChartGranularity
) {
  const period = periodExpr(granularity);
  const limit  = periodLimit(granularity);
  const q = `
    SELECT
      ${period}                                    AS period,
      COUNT(DISTINCT orders.UserAuthId)            AS customers,
      COUNT(DISTINCT orderitems.id)                AS orders_count,
      COALESCE(SUM(${FINAL_PRICE}), 0)             AS sales
    ${JOINS}
    ${where}
    GROUP BY period
    ORDER BY period DESC
    LIMIT ${limit}
  `;
  return executeQuery(dbConfig, q, params);
}

async function fetchBusinessLines(dbConfig: DBConfig, where: string, params: unknown[]) {
  const q = `
    SELECT
      ${BUSINESS_LINE}                             AS businessLine,
      COALESCE(SUM(${FINAL_PRICE}), 0)             AS sales,
      COUNT(DISTINCT orderitems.id)                AS orders_count,
      COUNT(DISTINCT orders.UserAuthId)            AS customers
    ${JOINS}
    ${where}
    GROUP BY businessLine
    ORDER BY sales DESC
  `;
  return executeQuery(dbConfig, q, params);
}

async function fetchFilterOptions(dbConfig: DBConfig, where: string, params: unknown[]) {
  const q = `
    SELECT DISTINCT
      organizations.Name_en  AS org,
      currencies.Code_en     AS currency,
      ${BUSINESS_LINE}       AS businessLine
    ${JOINS}
    ${where}
    LIMIT 500
  `;
  return executeQuery(dbConfig, q, params);
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dbConfig,
      filters = {},
      granularity = 'monthly',
    } = body as {
      dbConfig: DBConfig;
      filters: FilterState;
      granularity: ChartGranularity;
    };

    if (!dbConfig?.host || !dbConfig?.database) {
      return NextResponse.json(
        { error: 'Database configuration is required.' },
        { status: 400 }
      );
    }

    // ── Cache lookup ──────────────────────────────────────────────────────────
    const cacheKey = makeCacheKey(dbConfig.host, dbConfig.database, filters, granularity);
    const cached = getCached<object>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // ── Build shared WHERE clause ─────────────────────────────────────────────
    const { where, params } = buildWhere(filters);

    // ── Run all queries in parallel ───────────────────────────────────────────
    const [kpiRes, chartRes, blRes, filterRes] = await Promise.all([
      fetchKPIs(dbConfig, where, params),
      fetchChartData(dbConfig, where, params, granularity),
      fetchBusinessLines(dbConfig, where, params),
      fetchFilterOptions(dbConfig, where, params),
    ]);

    // Surface the first error encountered
    const firstError = kpiRes.error || chartRes.error || blRes.error;
    if (firstError) {
      return NextResponse.json({ error: firstError }, { status: 500 });
    }

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const kRow = kpiRes.rows[0] || {};
    const totalSales    = parseFloat(String(kRow.totalSales))  || 0;
    const totalOrders   = parseInt(String(kRow.totalOrders))   || 0;
    const uniqueDays    = parseInt(String(kRow.uniqueDays))    || 1;
    const dailyAveSales  = totalSales  / uniqueDays;
    const dailyAveOrders = totalOrders / uniqueDays;

    // ── Chart data ────────────────────────────────────────────────────────────
    // Reverse so oldest → newest on the chart x-axis
    const chartData = chartRes.rows
      .slice()
      .reverse()
      .map((r) => ({
        period:    String(r.period),
        customers: parseInt(String(r.customers))   || 0,
        orders:    parseInt(String(r.orders_count)) || 0,
        sales:     Math.round((parseFloat(String(r.sales)) || 0) * 100) / 100,
      }));

    // ── Business line table ───────────────────────────────────────────────────
    const tableData = blRes.rows
      .filter((r) => r.businessLine)
      .map((r) => ({
        businessLine: String(r.businessLine),
        sales:        Math.round((parseFloat(String(r.sales))  || 0) * 100) / 100,
        orders:       parseInt(String(r.orders_count)) || 0,
        customers:    parseInt(String(r.customers))    || 0,
      }));

    // ── Filter options ────────────────────────────────────────────────────────
    const organizations  = [...new Set(filterRes.rows.map((r) => r.org).filter(Boolean))];
    const currencies     = [...new Set(filterRes.rows.map((r) => r.currency).filter(Boolean))];
    const businessLines  = [...new Set(filterRes.rows.map((r) => r.businessLine).filter(Boolean))];

    // ── Build response & cache ────────────────────────────────────────────────
    const payload = {
      kpis: {
        dailyAveSales:  Math.round(dailyAveSales  * 100) / 100,
        dailyAveOrders: Math.round(dailyAveOrders * 100) / 100,
        totalSales:     Math.round(totalSales     * 100) / 100,
        totalOrders,
      },
      chartData,
      tableData,
      filterOptions: { organizations, currencies, businessLines },
    };

    setCached(cacheKey, payload, 5 * 60 * 1000); // 5-minute TTL

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch report data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
