import { NextResponse } from 'next/server';
import { getAllReports, getAllTodos, getSettings } from '@/lib/db';

export async function GET() {
  try {
    const [reports, todos, settings] = await Promise.all([
      getAllReports(),
      getAllTodos(),
      getSettings(),
    ]);

    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      company: settings.companyName,
      activePeriod: settings.activePeriod,
      summary: {
        totalReports: reports.length,
        totalTodos: todos.length,
      },
      settings,
      reports,
      todos,
    };

    const filename = `backup-lapor-payroll-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate backup:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat file backup data.' },
      { status: 500 }
    );
  }
}
