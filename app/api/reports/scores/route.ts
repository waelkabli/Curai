import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { DBConfig } from '@/types';

const SCORES_QUERY = `
SELECT
  orderitems.id,
  orderitems.Created,
  orders.UserAuthId AS CustomerUserauthid,
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
  (CASE
    WHEN insurance_eligiblity_requests.InsuranceProviderId IS NOT NULL THEN 'Insurance'
    WHEN promotions.code IS NOT NULL THEN 'Promo'
    ELSE 'Cash'
  END) AS PaymentType,
  DATE(orderitems.Created) AS OrderDate
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
WHERE DATE(orderitems.Created) = CURDATE()
GROUP BY orderitems.id
ORDER BY orderitems.Created DESC
`;

function calcMetrics(rows: Record<string, unknown>[]) {
  return {
    customers: new Set(rows.map((r) => r.CustomerUserauthid)).size,
    totalSales: Math.round(
      rows.reduce((sum, r) => sum + (parseFloat(String(r.FinalPrice)) || 0), 0) * 100
    ) / 100,
    totalOrders: rows.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbConfig } = body as { dbConfig: DBConfig };

    if (!dbConfig || !dbConfig.host || !dbConfig.database) {
      return NextResponse.json(
        { error: 'Database configuration is required.' },
        { status: 400 }
      );
    }

    const result = await executeQuery(dbConfig, SCORES_QUERY);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const rows = result.rows;

    // Today's overall metrics
    const today = calcMetrics(rows);

    // Specialized & Mental (SpecialityCare, MentalCare, InsuranceSpecialityCare, InsuranceMentalCare)
    const specMentalBLs = ['SpecialityCare', 'MentalCare', 'InsuranceSpecialityCare', 'InsuranceMentalCare'];
    const specMentalRows = rows.filter((r) => specMentalBLs.includes(r.BusinessLine as string));

    const specMentalInsurance = calcMetrics(
      specMentalRows.filter((r) => r.PaymentType === 'Insurance')
    );
    const specMentalPharmacy = calcMetrics(
      specMentalRows.filter(
        (r) => (r.BusinessLine as string)?.includes('Insurance')
      )
    );
    const specMentalCash = calcMetrics(
      specMentalRows.filter((r) => r.PaymentType === 'Cash')
    );

    // Urgent Care
    const urgentRows = rows.filter((r) =>
      ['UrgentCare', 'DawaaUrgentCare', 'InsuranceInstant'].includes(r.BusinessLine as string)
    );
    const urgentInsurance = calcMetrics(urgentRows.filter((r) => r.PaymentType === 'Insurance'));
    const urgentPharmacy = calcMetrics(
      urgentRows.filter((r) => (r.BusinessLine as string) === 'DawaaUrgentCare')
    );
    const urgentCash = calcMetrics(urgentRows.filter((r) => r.PaymentType === 'Cash'));

    // Wellness, Bundles, HomeLabs
    const wellnessRows = rows.filter((r) => r.BusinessLine === 'Wellness');
    const bundlesRows = rows.filter((r) => r.BusinessLine === 'Bundles');
    const homeLabsRows = rows.filter((r) => r.BusinessLine === 'HomeLabs');

    const wellnessInsurance = calcMetrics(wellnessRows.filter((r) => r.PaymentType === 'Insurance'));
    const wellnessCash = calcMetrics(wellnessRows.filter((r) => r.PaymentType === 'Cash'));

    return NextResponse.json({
      today,
      specializedMental: {
        insurance: specMentalInsurance,
        pharmacy: specMentalPharmacy,
        cash: specMentalCash,
      },
      urgentCare: {
        insurance: urgentInsurance,
        pharmacy: urgentPharmacy,
        cash: urgentCash,
      },
      wellnessBundlesHomeLabs: {
        insurance: wellnessInsurance,
        bundle: calcMetrics(bundlesRows),
        homeLabs: calcMetrics(homeLabsRows),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch scores data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
