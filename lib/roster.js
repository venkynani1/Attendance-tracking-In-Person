import ExcelJS from 'exceljs';
import { normalizeEmployeeId, normalizeName } from './format';

export class RosterError extends Error {}

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;

export async function parseRosterFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new RosterError('Choose a file to upload.');
  if (file.size > MAX_BYTES) throw new RosterError('File is larger than 2 MB.');

  const name = String(file.name || '').toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let rows;
  if (name.endsWith('.csv')) {
    rows = parseCsv(buffer.toString('utf8'));
  } else if (name.endsWith('.xlsx')) {
    rows = await readXlsx(buffer);
  } else {
    throw new RosterError('Upload an Excel (.xlsx) or CSV (.csv) file.');
  }

  const entries = rowsToEntries(rows);
  if (entries.length === 0) {
    throw new RosterError('No employees found. Put Employee ID in the first column and Employee Name in the second.');
  }
  if (entries.length > MAX_ROWS) throw new RosterError(`Roster has more than ${MAX_ROWS} rows.`);
  return entries;
}

async function readXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new RosterError('Could not read that Excel file. Save it as .xlsx and try again.');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = [];
    const count = Math.max(row.cellCount, 2);
    for (let c = 1; c <= count; c++) values.push(cellText(row.getCell(c)));
    rows.push(values);
  });
  return rows;
}

function cellText(cell) {
  try {
    const text = cell.text;
    if (text != null) return String(text);
  } catch {
    /* fall through */
  }
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
    if (v.result != null) return String(v.result);
    if (v.text != null) return String(v.text);
  }
  return String(v);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

const ID_HEADER = /(emp(loyee)?[\s_.-]*(id|no|number|code))|^id$|^emp$|^associate[\s_-]*id$/i;
const NAME_HEADER = /name/i;

function rowsToEntries(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => String(h).trim());
  let idCol = header.findIndex((h) => ID_HEADER.test(h));
  let nameCol = header.findIndex((h, i) => i !== idCol && NAME_HEADER.test(h));
  let start = 1;
  if (idCol === -1 || nameCol === -1) {
    // No recognisable header: assume column A = ID, column B = Name.
    const looksLikeHeader = header.some((h) => /id|name|employee/i.test(h));
    idCol = 0;
    nameCol = 1;
    start = looksLikeHeader ? 1 : 0;
  }

  const seen = new Set();
  const entries = [];
  for (let r = start; r < rows.length; r++) {
    const employeeId = normalizeEmployeeId(rows[r][idCol]).slice(0, 40);
    if (!employeeId || seen.has(employeeId)) continue;
    seen.add(employeeId);
    entries.push({ employeeId, employeeName: normalizeName(rows[r][nameCol]).slice(0, 120), position: entries.length });
  }
  return entries;
}
