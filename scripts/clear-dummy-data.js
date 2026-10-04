const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function clearData() {
  console.log('Clearing dummy data from Supabase & Local DB...');

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Delete all rows from payroll_reports
    const { error: repErr } = await supabase
      .from('payroll_reports')
      .delete()
      .neq('id', 'none');
    if (repErr) console.error('Error clearing payroll_reports:', repErr);
    else console.log('✓ Supabase: payroll_reports cleared');

    // 2. Delete all rows from payroll_todos
    const { error: todoErr } = await supabase
      .from('payroll_todos')
      .delete()
      .neq('id', 'none');
    if (todoErr) console.error('Error clearing payroll_todos:', todoErr);
    else console.log('✓ Supabase: payroll_todos cleared');
  }

  // 3. Clear local JSON database (preserve settings)
  const dbPath = path.join(__dirname, '..', 'data', 'payroll_db.json');
  let settings = {
    activePeriod: 'Oktober 2026',
    cutoffDate: '2026-10-25',
    assistantName: 'Asisten Payroll',
    companyName: 'PT Pelindo Daya Sejahtera',
  };

  if (fs.existsSync(dbPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (parsed.settings) settings = parsed.settings;
    } catch (e) {
      // ignore
    }
  }

  const cleanDb = {
    settings,
    reports: [],
    todos: [],
  };

  fs.writeFileSync(dbPath, JSON.stringify(cleanDb, null, 2), 'utf8');
  console.log('✓ Local DB: data/payroll_db.json cleared (settings preserved)');
  console.log('Done! All dummy reports and todos have been deleted.');
}

clearData();
