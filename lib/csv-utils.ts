export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

export function parseCsv(content: string): ParsedCsv {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => parseCsvLine(line));

  return { headers, rows };
}

export function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const REQUIRED_BUSINESS_HEADERS = [
  'business_name',
  'business_phone',
  'business_industry',
  'business_contact_person',
  'business_description',
];

export function validateBusinessHeaders(headers: string[]) {
  const normalized = headers.map((header) => normalizeHeader(header));
  const requiredNormalized = REQUIRED_BUSINESS_HEADERS.map((header) => normalizeHeader(header));

  const missing = requiredNormalized.filter((req) => !normalized.includes(req));
  return {
    valid: missing.length === 0,
    missing,
  };
}

export function mapRequiredHeaderIndexes(headers: string[]) {
  const normalized = headers.map((header) => normalizeHeader(header));
  const indexMap = new Map<string, number>();

  normalized.forEach((header, index) => {
    indexMap.set(header, index);
  });

  return REQUIRED_BUSINESS_HEADERS.reduce<Record<string, number>>((acc, header) => {
    const normalizedHeader = normalizeHeader(header);
    const idx = indexMap.get(normalizedHeader);
    if (idx !== undefined) {
      acc[header] = idx;
    }
    return acc;
  }, {});
}

export function validateBusinessRows(rows: string[][], headers: string[]) {
  const indexes = mapRequiredHeaderIndexes(headers);
  const requiredKeys = REQUIRED_BUSINESS_HEADERS;
  const phoneIndex = indexes.business_phone;
  const phonePattern = /^\+1-\d{3}-\d{4}$/;

  const missingRows: number[] = [];
  const invalidPhoneRows: number[] = [];

  rows.forEach((row, i) => {
    const hasAll = requiredKeys.every((key) => {
      const idx = indexes[key];
      return idx !== undefined && row[idx] && row[idx].trim().length > 0;
    });

    if (!hasAll) {
      missingRows.push(i + 2); // +2 because rows start after header
      return;
    }

    if (phoneIndex !== undefined && !phonePattern.test(String(row[phoneIndex]).trim())) {
      invalidPhoneRows.push(i + 2);
    }
  });

  return {
    valid: missingRows.length === 0 && invalidPhoneRows.length === 0,
    missingRows,
    invalidPhoneRows,
  };
}
