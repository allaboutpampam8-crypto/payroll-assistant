import { NextRequest, NextResponse } from 'next/server';
import {
  getPayrollResultByNik,
  getPayrollResultsByName,
  getPayrollDepartments,
  getPayrollResultsByDepartment,
} from '@/lib/db';
import { PayrollResult } from '@/lib/types';

/**
 * Filter data untuk publik (hanya mengembalikan identitas umum, tanpa rincian finansial)
 */
function sanitizePublicEmployee(r: PayrollResult) {
  return {
    id: r.id,
    period: r.period,
    employeeNik: r.employeeNik,
    employeeName: r.employeeName,
    department: r.department,
    positionTitle: r.positionTitle,
    status: r.status,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nik = searchParams.get('nik');
    const name = searchParams.get('name');
    const department = searchParams.get('department');
    const getDepartments = searchParams.get('departments');
    const period = searchParams.get('period') || undefined;
    const q = searchParams.get('q') || searchParams.get('search') || undefined;

    // Cek apakah request berasal dari sesi admin internal yang terotorisasi
    const authCookie = request.cookies.get('payroll_auth_session')?.value;
    const isAuthenticated = authCookie === 'authenticated';

    if (getDepartments === 'true') {
      const departments = await getPayrollDepartments(q, period);
      return NextResponse.json({ success: true, data: departments });
    }

    if (department) {
      const results = await getPayrollResultsByDepartment(department, period);
      const data = isAuthenticated ? results : results.map(sanitizePublicEmployee);
      return NextResponse.json({ success: true, data });
    }

    if (nik) {
      const result = await getPayrollResultByNik(nik, period);
      if (!result) {
        return NextResponse.json({ success: true, data: [] });
      }
      const data = isAuthenticated ? [result] : [sanitizePublicEmployee(result)];
      return NextResponse.json({ success: true, data });
    }

    if (name) {
      const results = await getPayrollResultsByName(name, period);
      const data = isAuthenticated ? results : results.map(sanitizePublicEmployee);
      return NextResponse.json({ success: true, data });
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
