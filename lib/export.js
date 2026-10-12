import ExcelJS from 'exceljs';
import { formatTrainingDate } from './format';

// Builds the 3-column LMS sheet: Employee ID | Employee Name | <date> (Present/Absent)
export async function buildAttendanceWorkbook(training, attendance, roster) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance');
  const dateLabel = formatTrainingDate(training.date);

  sheet.columns = [
    { header: 'Employee ID', key: 'id', width: 18 },
    { header: 'Employee Name', key: 'name', width: 34 },
    { header: dateLabel, key: 'status', width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  const attended = new Map(attendance.map((a) => [a.employeeId, a]));

  if (roster.length > 0) {
    const rosterIds = new Set();
    for (const r of roster) {
      rosterIds.add(r.employeeId);
      sheet.addRow({
        id: r.employeeId,
        name: r.employeeName || attended.get(r.employeeId)?.employeeName || '',
        status: attended.has(r.employeeId) ? 'Present' : 'Absent',
      });
    }
    // People who attended but were not on the roster are still marked present.
    for (const a of attendance) {
      if (!rosterIds.has(a.employeeId)) {
        sheet.addRow({ id: a.employeeId, name: a.employeeName, status: 'Present' });
      }
    }
  } else {
    for (const a of attendance) {
      sheet.addRow({ id: a.employeeId, name: a.employeeName, status: 'Present' });
    }
  }

  // Keep Employee IDs as text so Excel does not drop leading zeros.
  sheet.getColumn('id').numFmt = '@';

  return workbook.xlsx.writeBuffer();
}

export function exportFileName(training) {
  const base = `${training.name}_${formatTrainingDate(training.date)}`
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '_')
    .slice(0, 120);
  return `${base || 'attendance'}.xlsx`;
}
