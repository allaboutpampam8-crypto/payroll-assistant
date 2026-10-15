const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function check() {
  const res = await fetch(
    `${url}/rest/v1/payroll_results?employee_nik=eq.19940405437&select=period,employee_name,basic_salary,allowances,gross_salary,take_home_pay,allowance_details&order=period.asc`,
    {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    }
  );
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

check().catch(console.error);
