import { copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { addDays, format, startOfDay } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const RECITATION_HEADERS = [
  'id',
  'content',
  'meaning',
  'mastery_level',
  'due_date',
  'last_review_date',
  'review_count',
  'category',
  'notes',
];

export const DEFAULT_MASTERY_THRESHOLD = 8;
export const MAX_MASTERY_LEVEL = 10;

const RECITATION_PATH = join(__dirname, 'database', 'daily_recitation_database.csv');
const RECITATION_BACKUP_PATH = join(__dirname, 'database', 'daily_recitation_database.legacy.csv');
const REVIEW_LOG_PATH = join(__dirname, 'database', 'daily_recitation_history.csv');

function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function serializeCsv(rows) {
  return rows
    .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
    .join('\n');
}

export function toDateKey(value, fallback = '') {
  if (!value) return fallback;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return format(date, 'yyyy-MM-dd');
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function localDateKey(date) {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

function normalizeCategory(row) {
  const category = row.category || row.Category || '';
  const subCategory = row.SubCategory || '';
  if (!category && !subCategory) return '';
  if (!category) return subCategory;
  if (!subCategory) return category;
  return `${category} / ${subCategory}`;
}

function normalizeRecord(row, fallbackId, todayKey) {
  const dueCandidate = row.due_date || row.Date || todayKey;
  const dueDate = toDateKey(dueCandidate, todayKey);
  const masteryLevel = clamp(normalizeInteger(row.mastery_level, 0), 0, MAX_MASTERY_LEVEL);
  const reviewCount = Math.max(0, normalizeInteger(row.review_count, 0));

  return {
    id: normalizeInteger(row.id, fallbackId),
    content: row.content || row.Question_Or_Word || '',
    meaning: row.meaning || row.Answer_Or_Definition || '',
    mastery_level: masteryLevel,
    due_date: dueDate,
    last_review_date: toDateKey(row.last_review_date || row.Date || '', ''),
    review_count: reviewCount,
    category: row.category || normalizeCategory(row),
    notes: row.notes || row.Extra_Tags_Or_Notes || '',
  };
}

function rowsToRecords(rows) {
  const todayKey = localDateKey(new Date());
  const header = rows[0] || [];
  const headerSet = new Set(header);
  const hasNewSchema = RECITATION_HEADERS.every((key) => headerSet.has(key));

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim() !== ''));
  return dataRows.map((row, index) => {
    const record = {};
    if (hasNewSchema) {
      for (let i = 0; i < header.length; i += 1) {
        record[header[i]] = row[i] ?? '';
      }
      return normalizeRecord(record, index + 1, todayKey);
    }

    for (let i = 0; i < header.length; i += 1) {
      record[header[i]] = row[i] ?? '';
    }
    return normalizeRecord(record, index + 1, todayKey);
  });
}

function recordsToRows(records) {
  return [
    RECITATION_HEADERS,
    ...records.map((record) => RECITATION_HEADERS.map((key) => record[key] ?? '')),
  ];
}

function sortByDueThenMastery(records) {
  return [...records].sort((a, b) => {
    if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.mastery_level !== b.mastery_level) return a.mastery_level - b.mastery_level;
    if (a.review_count !== b.review_count) return a.review_count - b.review_count;
    return a.content.localeCompare(b.content, 'zh-CN');
  });
}

async function ensureDirectories() {
  await mkdir(dirname(RECITATION_PATH), { recursive: true });
}

export async function loadRecitationRecords() {
  await ensureDirectories();

  if (!existsSync(RECITATION_PATH)) {
    await writeFile(RECITATION_PATH, `\uFEFF${serializeCsv([RECITATION_HEADERS])}`, 'utf8');
    return [];
  }

  const raw = await readFile(RECITATION_PATH, 'utf8');
  const cleaned = stripBom(raw).trim();
  if (!cleaned) return [];

  const rows = parseCsv(cleaned);
  if (!rows.length) return [];

  const records = rowsToRecords(rows);
  const header = rows[0] || [];
  const hasNewSchema = RECITATION_HEADERS.every((key) => header.includes(key));

  if (!hasNewSchema) {
    if (!existsSync(RECITATION_BACKUP_PATH)) {
      await copyFile(RECITATION_PATH, RECITATION_BACKUP_PATH);
    }
    await saveRecitationRecords(records);
  }

  return sortByDueThenMastery(records);
}

export async function saveRecitationRecords(records) {
  await ensureDirectories();
  const normalized = records.map((record, index) => ({
    id: normalizeInteger(record.id, index + 1),
    content: String(record.content ?? ''),
    meaning: String(record.meaning ?? ''),
    mastery_level: clamp(normalizeInteger(record.mastery_level, 0), 0, MAX_MASTERY_LEVEL),
    due_date: toDateKey(record.due_date, localDateKey(new Date())),
    last_review_date: toDateKey(record.last_review_date, ''),
    review_count: Math.max(0, normalizeInteger(record.review_count, 0)),
    category: String(record.category ?? ''),
    notes: String(record.notes ?? ''),
  }));

  await writeFile(RECITATION_PATH, `\uFEFF${serializeCsv(recordsToRows(normalized))}`, 'utf8');
  return normalized;
}

export function buildRecitationPlan(records, today = new Date()) {
  const todayKey = localDateKey(today);
  const dueItems = sortByDueThenMastery(records.filter((record) => record.due_date <= todayKey));
  const upcomingItems = sortByDueThenMastery(records.filter((record) => record.due_date > todayKey)).slice(0, 5);
  const masteredItems = records.filter((record) => record.mastery_level >= DEFAULT_MASTERY_THRESHOLD);
  const newItems = dueItems.filter((record) => record.review_count === 0);

  return {
    todayKey,
    dueItems,
    upcomingItems,
    summary: {
      total: records.length,
      dueCount: dueItems.length,
      newCount: newItems.length,
      reviewCount: dueItems.length - newItems.length,
      masteredCount: masteredItems.length,
      suggestedCount: Math.min(dueItems.length, Math.max(5, Math.ceil(dueItems.length * 0.6))),
    },
  };
}

export function calculateNextDueDate(record, action, today = new Date()) {
  const todayKey = localDateKey(today);
  const mastery = clamp(record.mastery_level, 0, MAX_MASTERY_LEVEL);

  if (action === 'later') {
    return format(addDays(today, 1), 'yyyy-MM-dd');
  }

  if (action === 'skip') {
    return format(addDays(today, 1), 'yyyy-MM-dd');
  }

  const intervals = [1, 2, 4, 7, 14, 21, 30, 45, 60, 90, 120];
  const interval = intervals[mastery] ?? intervals[intervals.length - 1];

  if (action === 'again') return format(addDays(today, 1), 'yyyy-MM-dd');
  if (action === 'hard') return format(addDays(today, Math.max(1, Math.floor(interval / 2))), 'yyyy-MM-dd');
  if (action === 'good') return format(addDays(today, interval), 'yyyy-MM-dd');
  if (action === 'easy') return format(addDays(today, interval + Math.max(2, Math.floor(interval / 2))), 'yyyy-MM-dd');

  return todayKey;
}

export function applyReviewAction(record, action, today = new Date(), manual = {}) {
  const deltaMap = {
    again: -3,
    hard: -1,
    good: 1,
    easy: 3,
  };

  if (action === 'later' || action === 'skip') {
    return {
      ...record,
      due_date: calculateNextDueDate(record, action, today),
    };
  }

  if (action === 'manual') {
    const updated = { ...record };
    if (manual.mastery_level !== undefined && manual.mastery_level !== null && manual.mastery_level !== '') {
      updated.mastery_level = clamp(normalizeInteger(manual.mastery_level, updated.mastery_level), 0, MAX_MASTERY_LEVEL);
    }
    if (manual.due_date) {
      updated.due_date = toDateKey(manual.due_date, updated.due_date);
    }
    if (manual.last_review_date) {
      updated.last_review_date = toDateKey(manual.last_review_date, updated.last_review_date);
    }
    if (manual.notes !== undefined) {
      updated.notes = String(manual.notes ?? '');
    }
    return updated;
  }

  const delta = deltaMap[action] ?? 0;
  const nextMastery = clamp((record.mastery_level || 0) + delta, 0, MAX_MASTERY_LEVEL);
  const updated = {
    ...record,
    mastery_level: nextMastery,
    review_count: (record.review_count || 0) + 1,
    last_review_date: localDateKey(today),
    due_date: calculateNextDueDate({ ...record, mastery_level: nextMastery }, action, today),
  };

  if (manual.mastery_level !== undefined && manual.mastery_level !== null && manual.mastery_level !== '') {
    updated.mastery_level = clamp(normalizeInteger(manual.mastery_level, updated.mastery_level), 0, MAX_MASTERY_LEVEL);
  }

  if (manual.due_date) {
    updated.due_date = toDateKey(manual.due_date, updated.due_date);
  }

  if (manual.notes !== undefined) {
    updated.notes = String(manual.notes ?? '');
  }

  return updated;
}

function readLogRows(raw) {
  const cleaned = stripBom(raw).trim();
  if (!cleaned) return [];
  const rows = parseCsv(cleaned);
  if (!rows.length) return [];
  return rows;
}

export async function appendReviewLog(entry) {
  await ensureDirectories();
  const exists = existsSync(REVIEW_LOG_PATH);
  const header = ['timestamp', 'id', 'content', 'action', 'mastery_before', 'mastery_after', 'due_before', 'due_after'];
  const row = [
    new Date().toISOString(),
    entry.id,
    entry.content,
    entry.action,
    entry.mastery_before,
    entry.mastery_after,
    entry.due_before,
    entry.due_after,
  ];

  if (!exists) {
    await writeFile(REVIEW_LOG_PATH, `\uFEFF${serializeCsv([header, row])}`, 'utf8');
    return;
  }

  const raw = await readFile(REVIEW_LOG_PATH, 'utf8');
  const rows = readLogRows(raw);
  if (!rows.length) {
    await writeFile(REVIEW_LOG_PATH, `\uFEFF${serializeCsv([header, row])}`, 'utf8');
    return;
  }

  if (rows[0].join(',') !== header.join(',')) {
    rows.unshift(header);
  }

  rows.push(row);
  await writeFile(REVIEW_LOG_PATH, `\uFEFF${serializeCsv(rows)}`, 'utf8');
}

export async function loadReviewLogs() {
  if (!existsSync(REVIEW_LOG_PATH)) return [];
  const raw = await readFile(REVIEW_LOG_PATH, 'utf8');
  const rows = readLogRows(raw);
  if (!rows.length) return [];
  const header = rows[0];
  const dataRows = rows.slice(1);
  return dataRows.map((row) => {
    const entry = {};
    header.forEach((key, index) => {
      entry[key] = row[index] ?? '';
    });
    return entry;
  });
}

export async function getRecitationStats(records, today = new Date()) {
  const plan = buildRecitationPlan(records, today);
  const logs = await loadReviewLogs();
  const todayKey = localDateKey(today);

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(startOfDay(today), -6 + index);
    return {
      date: format(date, 'yyyy-MM-dd'),
      reviews: 0,
      mastered: 0,
    };
  });

  for (const log of logs) {
    const logDateKey = toDateKey(log.timestamp, '');
    const bucket = last7Days.find((item) => item.date === logDateKey);
    if (!bucket) continue;
    bucket.reviews += 1;
    if (normalizeInteger(log.mastery_after, 0) >= DEFAULT_MASTERY_THRESHOLD) {
      bucket.mastered += 1;
    }
  }

  const masteredCount = records.filter((record) => record.mastery_level >= DEFAULT_MASTERY_THRESHOLD).length;
  const totalReviewed = records.filter((record) => record.review_count > 0).length;

  return {
    date: todayKey,
    ...plan.summary,
    masteredCount,
    totalReviewed,
    todayDueItems: plan.dueItems,
    weeklyCurve: last7Days,
  };
}
