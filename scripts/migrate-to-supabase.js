const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local manually
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

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  const jsonPath = path.join(__dirname, '..', 'data', 'payroll_db.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('payroll_db.json not found');
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // 1. Settings
  if (rawData.settings) {
    const { error: setErr } = await supabase.from('payroll_settings').upsert({
      id: 'default_settings',
      active_period: rawData.settings.activePeriod,
      cutoff_date: rawData.settings.cutoffDate,
      assistant_name: rawData.settings.assistantName,
      company_name: rawData.settings.companyName,
      updated_at: new Date().toISOString(),
    });
    if (setErr) console.error('Error migrating settings:', setErr);
    else console.log('✓ Settings migrated');
  }

  // 2. Reports
  if (rawData.reports && rawData.reports.length > 0) {
    const reportsToInsert = rawData.reports.map((r) => ({
      id: r.id,
      ticket_number: r.ticketNumber,
      employee_name: r.employeeName,
      employee_nik: r.employeeNik,
      department: r.department,
      category: r.category,
      discrepancy_amount: r.discrepancyAmount || 0,
      description: r.description || '',
      phone_number: r.phoneNumber || '',
      action_status: r.actionStatus || 'OPEN',
      priority: r.priority || 'NORMAL',
      period: r.period || 'Oktober 2026',
      source: r.source || 'MANUAL_PIC',
      resolution_notes: r.resolutionNotes || '',
      due_date: r.dueDate || '',
      attachment_url: r.attachmentUrl || null,
      attachment_name: r.attachmentName || null,
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: r.updatedAt || new Date().toISOString(),
    }));

    const { error: repErr } = await supabase
      .from('payroll_reports')
      .upsert(reportsToInsert);
    if (repErr) console.error('Error migrating reports:', repErr);
    else console.log(`✓ ${reportsToInsert.length} Reports migrated`);
  }

  // 3. Todos
  if (rawData.todos && rawData.todos.length > 0) {
    const todosToInsert = rawData.todos.map((t) => ({
      id: t.id,
      title: t.title,
      is_completed: Boolean(t.isCompleted),
      due_date: t.dueDate || '',
      priority: t.priority || 'NORMAL',
      related_ticket_number: t.relatedTicketNumber || '',
      created_at: t.createdAt || new Date().toISOString(),
      completed_at: t.completedAt || null,
    }));

    const { error: todoErr } = await supabase
      .from('payroll_todos')
      .upsert(todosToInsert);
    if (todoErr) console.error('Error migrating todos:', todoErr);
    else console.log(`✓ ${todosToInsert.length} Todos migrated`);
  }

  console.log('Migration finished successfully!');
}

migrate();
