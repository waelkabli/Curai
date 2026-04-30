import { NextRequest, NextResponse } from 'next/server';
import { executeQueries } from '@/lib/db';
import { getCached, setCached, makeCacheKey } from '@/lib/cache';
import { DBConfig, FilterState } from '@/types';

export type ChartGranularity = 'daily' | 'monthly' | 'quarterly' | 'yearly';

// ─── SQL fragments ────────────────────────────────────────────────────────────

/** Minimal joins needed only for FinalPrice + basic grouping (chart & KPIs) */
const JOINS_MINIMAL = `
FROM orderitems
INNER JOIN orders ON orders.Id = orderitems.OrderId
LEFT JOIN promotions ON orders.PromoId = promotions.id
LEFT JOIN insurance_eligiblity_requests
       ON orders.InsuranceEligibilityRequestId = insurance_eligiblity_requests.id
`;

/** Full joins needed for BusinessLine CASE expression */
const JOINS_FULL = `
FROM orderitems
INNER JOIN orders ON orders.Id = orderitems.OrderId
LEFT JOIN promotions ON orders.PromoId = promotions.id
LEFT JOIN insurance_eligiblity_requests
       ON orders.InsuranceEligibilityRequestId = insurance_eligiblity_requests.id
LEFT JOIN followups        ON followups.OrderItemId        = orderitems.id
LEFT JOIN subscriptions    ON subscriptions.OrderItemId    = orderitems.id
LEFT JOIN bundles          ON bundles.id                   = orderitems.BundleID
LEFT JOIN wellness_programs ON wellness_programs.id        = orderitems.WellnessProgramId
LEFT JOIN consultations    ON consultations.OrderItemId    = orderitems.id
LEFT JOIN doctors          ON consultations.SubscriberDocId = doctors.DocId
LEFT JOIN categories_specialties ON doctors.PrimarySpecialtyId = categories_specialties.SpecialtyId
LEFT JOIN medicalcategories ON categories_specialties.CategoryId = medicalcategories.Id
`;

/** Joins needed for filter-option lookups (organizations, currencies) */
const JOINS_OPTIONS = `
FROM orderitems
INNER JOIN orders ON orders.Id = orderitems.OrderId
LEFT JOIN organizations ON orders.CustomerOrganizationId = organizations.Id
LEFT JOIN currencies    ON currencies.id = orders.CurrencyId
`;

const FINAL_PRICE = `(
  CASE
    WHEN promotions.code = 'anood' THEN 122.83
    WHEN insurance_eligiblity_requests.InsuranceProviderId IS NOT NULL
         THEN (orders.TotalOriginalPrice * 1.15)
    WHEN promotions.code IS NOT NULL
         AND orderitems.ProductId = 147
         AND orders.Refunded = FALSE THEN 34.5
    ELSE orderitems.FinalPrice
  END
)`;

const BUSINESS_LINE = `(CASE
  WHEN followups.Id > 0 THEN 'Followups'
  WHEN subscriptions.Id > 0 THEN 'Subscriptions'
  WHEN bundles.Id > 0 AND bundles.BundleCategoryId = 9  THEN 'HomeLabs'
  WHEN bundles.Id > 0 AND bundles.BundleCategoryId != 9 THEN 'Bundles'
  WHEN wellness_programs.Id > 0 THEN 'Wellness'
  WHEN orderitems.ProductId = 147 THEN 'DawaaUrgentCare'
  WHEN orderitems.ProductId = 149 THEN 'UrgentCare'
  WHEN consultations.Id > 0 AND medicalcategories.Id = 15
       AND orderitems.ProductId NOT IN (144,145,150,173) THEN 'MentalCare'
  WHEN consultations.Id > 0 AND medicalcategories.Id != 15
       AND orderitems.ProductId NOT IN (144,145,150,173) THEN 'SpecialityCare'
  WHEN consultations.Id > 0 AND medicalcategories.Id = 15
       AND orderitems.ProductId IN (144,145,150,173) THEN 'InsuranceMentalCare'
  WHEN consultations.Id > 0 AND medicalcategories.Id != 15
       AND orderitems.ProductId IN (144,145,150,173) THEN 'InsuranceSpecialityCare'
  WHEN orderitems.ProductId IN (151,152,174,175) THEN 'InsuranceInstant'
END)`;

// Known BusinessLine values (derived, not stored — safe to hardcode)
const KNOWN_BUSINESS_LINES = [
  'SpecialityCare', 'MentalCare', 'InsuranceSpecialityCare', 'UrgentCare',
  'DawaaUrgentCare', 'Wellness', 'InsuranceMentalCare', 'HomeLabs',
  'InsuranceInstant', 'Followups', 'Subscriptions', 'Bundles',
];

// ─── WHERE builder ────────────────────────────────────────────────────────────

function buildWhere(filters: FilterState): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];

  if (filters.dateFrom) {
    conds.push('orderitems.Created >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conds.push('orderitems.Created <= ?');
    params.push(filters.dateTo + ' 23:59:59');
  }
  if (filters.organization) {
    conds.push('organizations.Name_en = ?');
    params.push(filters.organization);
  }
  if (filters.currency) {
    conds.push('currencies.Code_en = ?');
    params.push(filters.currency);
  }

  return {
    where: conds.length ? 'WHERE ' + conds.join(' AND ') : '',
    params,
  };
}

/** Same WHERE but using minimal joins (no organizations/currencies tables) */
function buildWhereMinimal(filters: FilterState): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];

  if (filters.dateFrom) {
    conds.push('orderitems.Created >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conds.push('orderitems.Created <= ?');
    params.push(filters.dateTo + ' 23:59:59');
  }
  // businessLine filter applied via HAVING on computed column in BL query only

  return {
    where: conds.length ? 'WHERE ' + conds.join(' AND ') : '',
    params,
  };
}

// ─── Period expression ────────────────────────────────────────────────────────

function periodExpr(g: ChartGranularity): string {
  switch (g) {
    case 'daily':     return `DATE(orderitems.Created)`;
    case 'quarterly': return `CONCAT(YEAR(orderitems.Created), '-Q', QUARTER(orderitems.Created))`;
    case 'yearly':    return `CAST(YEAR(orderitems.Created) AS CHAR)`;
    default:          return `DATE_FORMAT(orderitems.Created, '%Y-%m')`;
  }
}

function periodLimit(g: ChartGranularity): number {
  switch (g) {
    case 'daily':     return 90;
    case 'quarterly': return 12;
    case 'yearly':    return 7;
    default:          return 18;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbConfig, filters = {}, granularity = 'monthly' } = body as {
      dbConfig: DBConfig;
      filters: FilterState;
      granularity: ChartGranularity;
    };

    if (!dbConfig?.host || !dbConfig?.database) {
      return NextResponse.json({ error: 'Database configuration is required.' }, { status: 400 });
    }

    // Cache lookup
    const cacheKey = makeCacheKey(dbConfig.host, dbConfig.database, filters, granularity);
    const cached = getCached<object>(cacheKey);
    if (cached) return NextResponse.json({ ...cached, cached: true });

    // Build WHERE variants
    const minimal = buildWhereMinimal(filters);
    const full    = buildWhere(filters);

    const period = periodExpr(granularity);
    const limit  = periodLimit(granularity);

    // BusinessLine HAVING filter (applied after GROUP BY)
    const blHaving = filters.businessLine
      ? `HAVING businessLine = ${JSON.stringify(filters.businessLine)}`
      : '';

    // ── 4 parallel queries on the same pool ──────────────────────────────────
    const [kpiRes, chartRes, blRes, optRes] = await executeQueries(dbConfig, [

      // 1. KPIs — minimal joins, aggregated
      {
        sql: `
          SELECT
            COUNT(DISTINCT DATE(orderitems.Created)) AS uniqueDays,
            COALESCE(SUM(${FINAL_PRICE}), 0)         AS totalSales,
            COUNT(DISTINCT orderitems.id)            AS totalOrders
          ${JOINS_MINIMAL}
          ${minimal.where}
        `,
        params: minimal.params,
      },

      // 2. Chart — minimal joins, grouped by period
      {
        sql: `
          SELECT
            ${period}                                    AS period,
            COUNT(DISTINCT orders.UserAuthId)            AS customers,
            COUNT(DISTINCT orderitems.id)                AS orders_count,
            COALESCE(SUM(${FINAL_PRICE}), 0)             AS sales
          ${JOINS_MINIMAL}
          ${minimal.where}
          GROUP BY period
          ORDER BY period DESC
          LIMIT ${limit}
        `,
        params: minimal.params,
      },

      // 3. BusinessLine breakdown — full joins required
      {
        sql: `
          SELECT
            ${BUSINESS_LINE}                             AS businessLine,
            COALESCE(SUM(${FINAL_PRICE}), 0)             AS sales,
            COUNT(DISTINCT orderitems.id)                AS orders_count,
            COUNT(DISTINCT orders.UserAuthId)            AS customers
          ${JOINS_FULL}
          ${minimal.where}
          GROUP BY businessLine
          ${blHaving}
          ORDER BY sales DESC
        `,
        params: minimal.params,
      },

      // 4. Filter options — distinct org + currency
      {
        sql: `
          SELECT DISTINCT
            organizations.Name_en AS org,
            currencies.Code_en    AS currency
          ${JOINS_OPTIONS}
          ${full.where}
          LIMIT 300
        `,
        params: full.params,
      },
    ]);

    // Surface first error
    const firstError = kpiRes.error || chartRes.error || blRes.error;
    if (firstError) return NextResponse.json({ error: firstError }, { status: 500 });

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const kr          = kpiRes.rows[0] || {};
    const totalSales  = parseFloat(String(kr.totalSales)) || 0;
    const totalOrders = parseInt(String(kr.totalOrders))  || 0;
    const uniqueDays  = parseInt(String(kr.uniqueDays))   || 1;

    // ── Chart (reverse so oldest → newest) ───────────────────────────────────
    const chartData = chartRes.rows
      .slice()
      .reverse()
      .map((r) => ({
        period:    String(r.period),
        customers: parseInt(String(r.customers))    || 0,
        orders:    parseInt(String(r.orders_count)) || 0,
        sales:     Math.round((parseFloat(String(r.sales)) || 0) * 100) / 100,
      }));

    // ── Business lines ────────────────────────────────────────────────────────
    const tableData = blRes.rows
      .filter((r) => r.businessLine)
      .map((r) => ({
        businessLine: String(r.businessLine),
        sales:     Math.round((parseFloat(String(r.sales))   || 0) * 100) / 100,
        orders:    parseInt(String(r.orders_count)) || 0,
        customers: parseInt(String(r.customers))    || 0,
      }));

    // ── Filter options ────────────────────────────────────────────────────────
    const organizations = [...new Set(optRes.rows.map((r) => r.org).filter(Boolean))];
    const currencies    = [...new Set(optRes.rows.map((r) => r.currency).filter(Boolean))];

    const payload = {
      kpis: {
        dailyAveSales:  Math.round((totalSales  / uniqueDays) * 100) / 100,
        dailyAveOrders: Math.round((totalOrders / uniqueDays) * 100) / 100,
        totalSales:     Math.round(totalSales   * 100) / 100,
        totalOrders,
      },
      chartData,
      tableData,
      filterOptions: {
        organizations,
        currencies,
        businessLines: KNOWN_BUSINESS_LINES,
      },
    };

    setCached(cacheKey, payload, 5 * 60 * 1000);
    return NextResponse.json(payload);

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}
