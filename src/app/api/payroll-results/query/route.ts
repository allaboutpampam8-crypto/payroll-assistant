import { NextResponse } from 'next/server';
import {
  getPayrollResultByNik,
  getPayrollResultsByName,
  getPayrollDepartments,
  getPayrollResultsByDepartment,
} from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nik = searchParams.get('nik');
    const name = searchParams.get('name');
    const department = searchParams.get('department');
    const getDepartments = searchParams.get('departments');
    const period = searchParams.get('period') || undefined;

    const q = searchParams.get('q') || searchParams.get('search') || undefined;

    if (getDepartments === 'true') {
      const departments = await getPayrollDepartments(q, period);
      return NextResponse.json({ success: true, data: departments });
    }

    if (department) {
      const results = await getPayrollResultsByDepartment(department, period);
      return NextResponse.json({ success: true, data: results });
    }

    if (nik) {
      const result = await getPayrollResultByNik(nik, period);
      return NextResponse.json({ success: true, data: result ? [result] : [] });
    }

    if (name) {
      const results = await getPayrollResultsByName(name, period);
      return NextResponse.json({ success: true, data: results });
    }

    return NextResponse.json(
      { success: false, message: 'Parameter query tidak valid.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('Failed to query payroll results:', err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
