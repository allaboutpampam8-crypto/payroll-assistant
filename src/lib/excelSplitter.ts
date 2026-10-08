import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export interface SplitOptions {
  chunkSize: number; // default 1000
  filePrefix?: string;
  onProgress?: (progress: {
    stage: 'reading' | 'splitting' | 'zipping' | 'done';
    currentChunk?: number;
    totalChunks?: number;
    percent: number;
    message: string;
  }) => void;
}

export interface SplitPartInfo {
  index: number;
  fileName: string;
  startRow: number;
  endRow: number;
  rowCount: number;
  blob: Blob;
}

export interface SplitResult {
  totalRows: number;
  totalChunks: number;
  chunkSize: number;
  parts: SplitPartInfo[];
  zipBlob: Blob;
  zipFileName: string;
  durationMs: number;
}

/**
 * Memecah file Excel (.xlsx) menjadi beberapa file per N baris (default 1000)
 * dengan 100% mempertahankan format sel asli (tanggal, teks, angka, lebar kolom).
 */
export async function splitExcelFile(
  file: File,
  options: SplitOptions
): Promise<SplitResult> {
  const startTime = performance.now();
  const chunkSize = options.chunkSize || 1000;
  const onProgress = options.onProgress || (() => {});

  onProgress({
    stage: 'reading',
    percent: 5,
    message: 'Membaca file master Excel...',
  });

  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: false, // Jaga tanggal sebagai serial number dengan format asli
    cellNF: true,     // Simpan number format string (seperti dd/mm/yyyy, #,##0)
    cellStyles: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki sheet yang valid.');
  }

  const sourceSheet = workbook.Sheets[firstSheetName];
  if (!sourceSheet || !sourceSheet['!ref']) {
    throw new Error('Sheet pertama kosong atau tidak memiliki data.');
  }

  const range = XLSX.utils.decode_range(sourceSheet['!ref']);
  const totalRowsInSheet = range.e.r - range.s.r + 1; // Termasuk header
  const totalDataRows = totalRowsInSheet - 1; // Baris data murni (tanpa header baris 0)

  if (totalDataRows <= 0) {
    throw new Error('File tidak memiliki baris data setelah header (baris 1).');
  }

  const totalChunks = Math.ceil(totalDataRows / chunkSize);
  const baseName = (options.filePrefix || file.name.replace(/\.[^/.]+$/, '')).trim();

  onProgress({
    stage: 'splitting',
    percent: 15,
    currentChunk: 0,
    totalChunks,
    message: `Menyiapkan pemecahan ${totalDataRows.toLocaleString('id-ID')} baris data menjadi ${totalChunks} file...`,
  });

  // Salin header (baris 0)
  const headerCells: { col: number; cell: XLSX.CellObject }[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c });
    const cell = sourceSheet[addr];
    if (cell) {
      headerCells.push({ col: c, cell: { ...cell } });
    }
  }

  const parts: SplitPartInfo[] = [];
  const zip = new JSZip();

  // Simpan lebar kolom jika tersedia
  const colWidths = sourceSheet['!cols'] ? [...sourceSheet['!cols']] : undefined;

  for (let i = 0; i < totalChunks; i++) {
    const chunkStartDataRow = range.s.r + 1 + i * chunkSize;
    const chunkEndDataRow = Math.min(range.s.r + 1 + (i + 1) * chunkSize - 1, range.e.r);
    const chunkRowCount = chunkEndDataRow - chunkStartDataRow + 1;

    // Buat worksheet baru untuk pecahan ini
    const chunkSheet: XLSX.WorkSheet = {};

    // 1. Tulis header ke baris 0
    for (const h of headerCells) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: h.col });
      chunkSheet[addr] = { ...h.cell };
    }

    // 2. Salin baris data dengan format aslinya
    for (let r = chunkStartDataRow; r <= chunkEndDataRow; r++) {
      const targetR = r - chunkStartDataRow + 1; // Baris data mulai dari indeks 1
      for (let c = range.s.c; c <= range.e.c; c++) {
        const sourceAddr = XLSX.utils.encode_cell({ r, c });
        const sourceCell = sourceSheet[sourceAddr];
        if (sourceCell) {
          const targetAddr = XLSX.utils.encode_cell({ r: targetR, c });
          chunkSheet[targetAddr] = { ...sourceCell };
        }
      }
    }

    // Tentukan range batas tabel baru
    chunkSheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: range.s.c },
      e: { r: chunkRowCount, c: range.e.c },
    });

    if (colWidths) {
      chunkSheet['!cols'] = colWidths;
    }

    const chunkWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(chunkWb, chunkSheet, firstSheetName);

    const chunkArrayBuffer = XLSX.write(chunkWb, {
      type: 'array',
      bookType: 'xlsx',
    });

    const chunkBlob = new Blob([chunkArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const partNumStr = String(i + 1).padStart(3, '0');
    const displayStartRow = i * chunkSize + 1;
    const displayEndRow = displayStartRow + chunkRowCount - 1;
    const chunkFileName = `${baseName}_Part_${partNumStr}_Row_${displayStartRow}-${displayEndRow}.xlsx`;

    parts.push({
      index: i + 1,
      fileName: chunkFileName,
      startRow: displayStartRow,
      endRow: displayEndRow,
      rowCount: chunkRowCount,
      blob: chunkBlob,
    });

    // Tambahkan file pecahan ke ZIP
    zip.file(chunkFileName, chunkArrayBuffer);

    const percent = Math.round(15 + ((i + 1) / totalChunks) * 65);
    onProgress({
      stage: 'splitting',
      currentChunk: i + 1,
      totalChunks,
      percent,
      message: `Memecah Part ${i + 1} dari ${totalChunks} (Baris ${displayStartRow.toLocaleString('id-ID')} - ${displayEndRow.toLocaleString('id-ID')})...`,
    });

    // Yield kontrol ke browser loop setiap 5 chunk agar UI tidak freeze
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress({
    stage: 'zipping',
    percent: 85,
    message: 'Mengompresi seluruh file ke format ZIP...',
  });

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      const zPercent = Math.round(85 + (metadata.percent / 100) * 14);
      onProgress({
        stage: 'zipping',
        percent: zPercent,
        message: `Mengompresi ke ZIP: ${Math.round(metadata.percent)}%...`,
      });
    }
  );

  const durationMs = Math.round(performance.now() - startTime);
  const zipFileName = `${baseName}_Split_${totalChunks}_Parts.zip`;

  onProgress({
    stage: 'done',
    percent: 100,
    message: `Selesai! Berhasil memecah menjadi ${totalChunks} file dalam ${(durationMs / 1000).toFixed(1)} detik.`,
  });

  return {
    totalRows: totalDataRows,
    totalChunks,
    chunkSize,
    parts,
    zipBlob,
    zipFileName,
    durationMs,
  };
}
