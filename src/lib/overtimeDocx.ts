import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { AppUserProfile, OvertimeDocConfig, OvertimeLog } from './types';
import {
  formatIndonesianDateTitle,
  formatOvertimeDayDateUpper,
  formatOvertimeDurationUpper,
  formatPeriodUpperTitle,
} from './overtimeUtils';

const FONT_NAME = 'Arial';

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const THIN_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
};

const CELL_PADDING = { top: 80, bottom: 80, left: 100, right: 100 };

function createTextParagraph(
  text: string,
  options: {
    bold?: boolean;
    size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingBefore?: number;
    spacingAfter?: number;
  } = {}
): Paragraph {
  const lines = String(text || '').split('\n');
  const runs: TextRun[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) {
      runs.push(new TextRun({ break: 1 }));
    }
    runs.push(
      new TextRun({
        text: line,
        bold: options.bold,
        size: options.size ?? 18, // 9pt default for dense table
        font: FONT_NAME,
      })
    );
  });

  return new Paragraph({
    alignment: options.align ?? AlignmentType.LEFT,
    spacing: {
      before: options.spacingBefore ?? 0,
      after: options.spacingAfter ?? 0,
      line: 240,
    },
    children: runs,
  });
}

function createIdentityTable(
  items: { label: string; value: string }[]
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: items.map(
      (item) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 14, type: WidthType.PERCENTAGE },
              margins: { top: 20, bottom: 20, left: 0, right: 40 },
              children: [createTextParagraph(item.label, { size: 20 })],
            }),
            new TableCell({
              width: { size: 3, type: WidthType.PERCENTAGE },
              margins: { top: 20, bottom: 20, left: 0, right: 40 },
              children: [createTextParagraph(':', { size: 20 })],
            }),
            new TableCell({
              width: { size: 83, type: WidthType.PERCENTAGE },
              margins: { top: 20, bottom: 20, left: 0, right: 0 },
              children: [createTextParagraph(item.value, { size: 20 })],
            }),
          ],
        })
    ),
  });
}

export interface GenerateSpklOptions {
  logs: OvertimeLog[];
  period: string; // YYYY-MM
  userProfile: AppUserProfile;
  config: OvertimeDocConfig;
  signatureDate: string; // YYYY-MM-DD
}

export async function generateOvertimeSpklBlob(
  options: GenerateSpklOptions
): Promise<Blob> {
  const { logs, period, userProfile, config, signatureDate } = options;

  // Muat kop surat dari public/images/kop-pelindo-pds.png
  let kopBuffer: ArrayBuffer | null = null;
  try {
    const res = await fetch('/images/kop-pelindo-pds.png');
    if (res.ok) {
      kopBuffer = await res.arrayBuffer();
    }
  } catch {
    // Abaikan jika gagal load logo
  }

  const employee = config.employees[userProfile] || {
    fullName: userProfile,
    nipp: '',
    position: 'Staff Payroll',
  };

  const sortedLogs = [...logs].sort(
    (a, b) =>
      a.workDate.localeCompare(b.workDate) ||
      a.startTime.padStart(5, '0').localeCompare(b.startTime.padStart(5, '0'))
  );

  // Header Tabel Utama (2 baris dengan merge header WAKTU LEMBUR (JAM))
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        rowSpan: 2,
        width: { size: 17, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: CELL_PADDING,
        children: [
          createTextParagraph('TANGGAL, HARI', {
            bold: true,
            size: 17,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
      new TableCell({
        rowSpan: 2,
        width: { size: 24, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: CELL_PADDING,
        children: [
          createTextParagraph('PEKERJAAN YANG DILEMBURKAN', {
            bold: true,
            size: 17,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
      new TableCell({
        rowSpan: 2,
        width: { size: 23, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: CELL_PADDING,
        children: [
          createTextParagraph('TARGET PEKERJAAN YANG DILEMBURKAN', {
            bold: true,
            size: 17,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
      new TableCell({
        columnSpan: 3,
        width: { size: 17, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: CELL_PADDING,
        children: [
          createTextParagraph('WAKTU LEMBUR (JAM)', {
            bold: true,
            size: 17,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
      new TableCell({
        rowSpan: 2,
        width: { size: 19, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: CELL_PADDING,
        children: [
          createTextParagraph('ALASAN LEMBUR', {
            bold: true,
            size: 17,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
    ],
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 5, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: CELL_PADDING,
        children: [
          createTextParagraph('MULAI', {
            bold: true,
            size: 16,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
      new TableCell({
        width: { size: 5, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: CELL_PADDING,
        children: [
          createTextParagraph('SELESAI', {
            bold: true,
            size: 16,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
      new TableCell({
        width: { size: 7, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        margins: CELL_PADDING,
        children: [
          createTextParagraph('JML', {
            bold: true,
            size: 16,
            align: AlignmentType.CENTER,
          }),
        ],
      }),
    ],
  });

  const dataRows = sortedLogs.map(
    (log) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 17, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_PADDING,
            children: [
              createTextParagraph(formatOvertimeDayDateUpper(log.workDate), {
                size: 17,
              }),
            ],
          }),
          new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_PADDING,
            children: [createTextParagraph(log.jobDescription, { size: 17 })],
          }),
          new TableCell({
            width: { size: 23, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_PADDING,
            children: [
              createTextParagraph(log.targetDescription || '-', { size: 17 }),
            ],
          }),
          new TableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_PADDING,
            children: [
              createTextParagraph(log.startTime.replace(':', '.'), {
                size: 17,
                align: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_PADDING,
            children: [
              createTextParagraph(log.endTime.replace(':', '.'), {
                size: 17,
                align: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            width: { size: 7, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_PADDING,
            children: [
              createTextParagraph(
                formatOvertimeDurationUpper(log.durationMinutes),
                {
                  size: 17,
                  align: AlignmentType.CENTER,
                }
              ),
            ],
          }),
          new TableCell({
            width: { size: 19, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: CELL_PADDING,
            children: [createTextParagraph(log.reason || '-', { size: 17 })],
          }),
        ],
      })
  );

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: THIN_BORDERS,
    rows: [headerRow1, headerRow2, ...dataRows],
  });

  // Tabel Tanda Tangan
  const sigDateToUse =
    signatureDate && signatureDate !== '-'
      ? signatureDate
      : new Date().toISOString().slice(0, 10);
  const formattedSigDate = formatIndonesianDateTitle(sigDateToUse);
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [createTextParagraph('')],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              createTextParagraph(
                `${config.city || 'Surabaya'}, ${formattedSigDate}`,
                { size: 20, align: AlignmentType.CENTER }
              ),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              createTextParagraph('Pimpinan Divisi/Regional', {
                size: 20,
                align: AlignmentType.CENTER,
                spacingBefore: 60,
              }),
            ],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              createTextParagraph('Karyawan', {
                size: 20,
                align: AlignmentType.CENTER,
                spacingBefore: 60,
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              createTextParagraph('', { spacingBefore: 700, spacingAfter: 200 }),
            ],
          }),
          new TableCell({
            children: [
              createTextParagraph('', { spacingBefore: 700, spacingAfter: 200 }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              createTextParagraph((config.leaderName || 'MAHAR BAGUS UTOMO').toUpperCase(), {
                bold: true,
                size: 20,
                align: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              createTextParagraph((employee.fullName || userProfile).toUpperCase(), {
                bold: true,
                size: 20,
                align: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const bodyChildren: (Paragraph | Table)[] = [];

  // Sertakan kop surat langsung di awal halaman agar selalu tajam & jelas
  if (kopBuffer) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
          new ImageRun({
            data: kopBuffer,
            transformation: { width: 630, height: 86 },
            type: 'png',
          }),
        ],
      })
    );
  }

  bodyChildren.push(
    createTextParagraph('SURAT PERINTAH KERJA LEMBUR', {
      bold: true,
      size: 24,
      align: AlignmentType.CENTER,
      spacingAfter: 40,
    }),
    createTextParagraph(formatPeriodUpperTitle(period), {
      bold: true,
      size: 22,
      align: AlignmentType.CENTER,
      spacingAfter: 240,
    }),
    createTextParagraph(
      'Yang bertandatangan di bawah ini (Pimpinan Divisi/Regional) :',
      { size: 20, spacingAfter: 60 }
    ),
    createIdentityTable([
      { label: 'Nama', value: config.leaderName || 'Mahar Bagus Utomo' },
      { label: 'NIPP', value: config.leaderNipp || '105975' },
      { label: 'Jabatan', value: config.leaderPosition || 'Manager Operasi & HSSE' },
    ]),
    createTextParagraph(
      'Dengan ini memerintahkan kerja lembur kepada karyawan sebagaimana daftar berikut:',
      { size: 20, spacingBefore: 160, spacingAfter: 60 }
    ),
    createIdentityTable([
      { label: 'Nama', value: employee.fullName || userProfile },
      { label: 'NIPP', value: employee.nipp || '-' },
      { label: 'Jabatan', value: employee.position || 'Staff Payroll' },
    ]),
    createTextParagraph('', { spacingAfter: 120 }),
    mainTable,
    createTextParagraph('', { spacingAfter: 240 }),
    signatureTable
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 860, // ~0.6 inch
              bottom: 720,
              left: 860,
            },
          },
        },
        children: bodyChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}
