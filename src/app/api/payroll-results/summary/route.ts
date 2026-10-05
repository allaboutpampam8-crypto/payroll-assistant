import { NextResponse } from 'next/server';
import { getPayrollPeriodSummary, getAvailablePayrollPeriods, getSettings } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let period = searchParams.get('period');

    if (!period) {
      const settings = await getSettings();
      period = settings.activePeriod;
    }

    const [summary, availablePeriods] = await Promise.all([
      getPayrollPeriodSummary(period),
      getAvailablePayrollPeriods(),
    ]);

    return NextResponse.json({
      success: true,
      period,
      summary,
      availablePeriods,
    });
  } catch (err: unknown) {
    console.error('Failed to get payroll summary:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
