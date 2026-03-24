import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { DBConfig, FilterState } from '@/types';

const BASE_QUERY = `
SELECT
  orderitems.id,
  orderitems.Created,
  (
    CASE
      WHEN promotions.code = 'anood' THEN 122.83
      WHEN insurance_eligiblity_requests.InsuranceProviderId IS NOT NULL THEN (orders.TotalOriginalPrice * 1.15)
      WHEN promotions.code IS NOT NULL AND orderitems.ProductId = 147 AND orders.Refunded = FALSE THEN 34.5
      ELSE orderitems.FinalPrice
    END
  ) AS FinalPrice,
  (CASE
    WHEN followups.Id > 0 THEN 'Followups'
    WHEN subscriptions.Id > 0 THEN 'Subscriptions'
    WHEN bundles.BundleCategoryId = 9 THEN 'HomeLabs'
    WHEN bundles.Id > 0 THEN 'Bundles'
    WHEN wellness_programs.Id > 0 THEN 'Wellness'
    WHEN insurance_eligiblity_requests.InsuranceProviderId = 1 AND orderitems.ProductId != 151 THEN 'MedGulf'
    WHEN insurance_eligiblity_requests.InsuranceProviderId = 2 AND orderitems.ProductId != 152 THEN 'Bupa'
    WHEN insurance_eligiblity_requests.InsuranceProviderId = 3 AND orderitems.ProductId != 175 THEN 'Malath'
    WHEN insurance_eligiblity_requests.InsuranceProviderId = 5 AND orderitems.ProductId != 174 THEN 'SAICO'
    WHEN orderitems.ProductId = 149 THEN 'Pre-paid Instant'
    WHEN orderitems.ProductId = 147 THEN 'Dawaa Pre-paid Instant'
    WHEN orderitems.ProductId = 151 THEN 'MedGulf Instant'
    WHEN orderitems.ProductId = 152 THEN 'Bupa Instant'
    WHEN orderitems.ProductId = 174 THEN 'SAICO Instant'
    WHEN orderitems.ProductId = 175 THEN 'Malath Instant'
    WHEN consultations.Id > 0 THEN 'Consults'
  END) AS RevenueSource,
  (CASE
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
  END) AS BusinessLine,
  orders.UserAuthId AS CustomerUserauthid,
  orders.CustomerOrganizationId,
  organizations.Name_en AS organizations_Name_en,
  orders.CurrencyId,
  currencies.Code_en AS currencies_Code_en,
  orderitems.ProductId AS orderitems_ProductId,
  0 AS DispenseAmount
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
LEFT JOIN specialties ON doctors.PrimarySpecialtyId = specialties.Id
LEFT JOIN organizations ON orders.CustomerOrganizationId = organizations.Id
LEFT JOIN currencies ON currencies.id = orders.CurrencyId
LEFT JOIN products ON products.id = orderitems.ProductId
GROUP BY orderitems.id
ORDER BY orderitems.Created DESC
`;

function buildFilteredQuery(filters: FilterState): { query: string; params: unknown[] } {
  let whereClause = '';
  const params: unknown[] = [];
  const conditions: string[] = [];

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

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  // Inject WHERE into query before GROUP BY
  const query = BASE_QUERY.replace(
    'GROUP BY orderitems.id',
    `${whereClause}\nGROUP BY orderitems.id`
  );

  return { query, params };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbConfig, filters = {} } = body as {
      dbConfig: DBConfig;
      filters: FilterState;
    };

    if (!dbConfig || !dbConfig.host || !dbConfig.database) {
      return NextResponse.json(
        { error: 'Database configuration is required.' },
        { status: 400 }
      );
    }

    const { query, params } = buildFilteredQuery(filters);
    const result = await executeQuery(dbConfig, query, params);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const rows = result.rows;

    // Calculate KPIs
    const totalSales = rows.reduce((sum, r) => sum + (parseFloat(String(r.FinalPrice)) || 0), 0);
    const totalOrders = new Set(rows.map((r) => r.id)).size;
    const dispenseAmount = rows.reduce((sum, r) => sum + (parseFloat(String(r.DispenseAmount)) || 0), 0);

    // Get unique days for daily averages
    const uniqueDays = new Set(
      rows.map((r) => {
        const d = new Date(r.Created as string);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    ).size || 1;

    const dailyAveSales = totalSales / uniqueDays;
    const dailyAveOrders = totalOrders / uniqueDays;

    // Build chart data by month
    const chartMap: Record<string, { customers: Set<unknown>; orders: Set<unknown>; sales: number }> = {};
    for (const row of rows) {
      const d = new Date(row.Created as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!chartMap[key]) {
        chartMap[key] = { customers: new Set(), orders: new Set(), sales: 0 };
      }
      chartMap[key].customers.add(row.CustomerUserauthid);
      chartMap[key].orders.add(row.id);
      chartMap[key].sales += parseFloat(String(row.FinalPrice)) || 0;
    }

    const chartData = Object.entries(chartMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([period, data]) => ({
        period,
        customers: data.customers.size,
        orders: data.orders.size,
        sales: Math.round(data.sales * 100) / 100,
      }));

    // Build business line table
    const blMap: Record<string, { customers: Set<unknown>; orders: Set<unknown>; sales: number }> = {};
    for (const row of rows) {
      const bl = (row.BusinessLine as string) || 'Unknown';
      if (!blMap[bl]) {
        blMap[bl] = { customers: new Set(), orders: new Set(), sales: 0 };
      }
      blMap[bl].customers.add(row.CustomerUserauthid);
      blMap[bl].orders.add(row.id);
      blMap[bl].sales += parseFloat(String(row.FinalPrice)) || 0;
    }

    const tableData = Object.entries(blMap)
      .map(([businessLine, data]) => ({
        businessLine,
        sales: Math.round(data.sales * 100) / 100,
        orders: data.orders.size,
        customers: data.customers.size,
      }))
      .sort((a, b) => b.sales - a.sales);

    // Get filter options
    const organizations = [...new Set(rows.map((r) => r.organizations_Name_en).filter(Boolean))];
    const currencies = [...new Set(rows.map((r) => r.currencies_Code_en).filter(Boolean))];
    const businessLines = [...new Set(rows.map((r) => r.BusinessLine).filter(Boolean))];
    const revenueSources = [...new Set(rows.map((r) => r.RevenueSource).filter(Boolean))];

    return NextResponse.json({
      kpis: {
        dailyAveSales: Math.round(dailyAveSales * 100) / 100,
        dailyAveOrders: Math.round(dailyAveOrders * 100) / 100,
        dispenseAmount,
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
      },
      chartData,
      tableData,
      filterOptions: {
        organizations,
        currencies,
        businessLines,
        revenueSources,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch report data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
