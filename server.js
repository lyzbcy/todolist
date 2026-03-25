import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { addDays, isSameDay, startOfWeek } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });

app.use(cors());
app.use(express.json());

function toISODateTime(value = new Date()) {
    return new Date(value).toISOString();
}

function toValidDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function localDayKey(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function buildWeekRange(baseDate) {
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
    const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    return {
        weekStart,
        weekEnd: addDays(weekStart, 6),
        dates,
    };
}

function ensureColumn(table, column, definition) {
    db.all(`PRAGMA table_info(${table})`, [], (err, columns) => {
        if (err) {
            console.error(`Failed to inspect ${table}`, err);
            return;
        }

        if (!columns.some((col) => col.name === column)) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
                if (alterErr) {
                    console.error(`Failed to add ${table}.${column}`, alterErr);
                }
            });
        }
    });
}

// Initialize SQLite database
const db = new sqlite3.Database(join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database.');

        // Create tables if they don't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT 0,
                priority TEXT,
                category TEXT,
                createdAt TEXT,
                completedAt TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS memory_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                reviewCount INTEGER NOT NULL DEFAULT 0,
                nextReviewDate TEXT NOT NULL,
                category TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS review_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                memoryId INTEGER NOT NULL,
                reviewedAt TEXT NOT NULL,
                reviewCount INTEGER NOT NULL,
                FOREIGN KEY (memoryId) REFERENCES memory_items(id)
            )
        `);

        ensureColumn('todos', 'createdAt', 'TEXT');
        ensureColumn('todos', 'completedAt', 'TEXT');
    }
});

// --- TODO endpoints ---

app.get('/api/todos', (req, res) => {
    db.all('SELECT * FROM todos ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const todos = rows.map(r => ({ ...r, completed: !!r.completed }));
        res.json(todos);
    });
});

app.post('/api/todos', (req, res) => {
    const { text, priority, category } = req.body;
    const createdAt = req.body.createdAt || toISODateTime();
    db.run(
        'INSERT INTO todos (text, completed, priority, category, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [text, 0, priority || 'low', category || '', createdAt, null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, text, completed: false, priority, category, createdAt, completedAt: null });
        }
    );
});

app.put('/api/todos/:id', (req, res) => {
    const { completed } = req.body;
    const completedAt = completed ? toISODateTime() : null;
    db.run(
        'UPDATE todos SET completed = ?, completedAt = ? WHERE id = ?',
        [completed ? 1 : 0, completedAt, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes, completedAt });
        }
    );
});

app.delete('/api/todos/:id', (req, res) => {
    db.run('DELETE FROM todos WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// --- Memory Items endpoints ---

app.get('/api/memory', (req, res) => {
    db.all('SELECT * FROM memory_items ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/memory', (req, res) => {
    const { text, createdAt, reviewCount, nextReviewDate, category } = req.body;
    db.run(
        'INSERT INTO memory_items (text, createdAt, reviewCount, nextReviewDate, category) VALUES (?, ?, ?, ?, ?)',
        [text, createdAt, reviewCount || 0, nextReviewDate, category || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, text, createdAt, reviewCount, nextReviewDate, category });
        }
    );
});

app.put('/api/memory/:id', (req, res) => {
    const { reviewCount, nextReviewDate } = req.body;
    db.run(
        'UPDATE memory_items SET reviewCount = ?, nextReviewDate = ? WHERE id = ?',
        [reviewCount, nextReviewDate, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.run(
                'INSERT INTO review_logs (memoryId, reviewedAt, reviewCount) VALUES (?, ?, ?)',
                [req.params.id, toISODateTime(), reviewCount],
                function (logErr) {
                    if (logErr) return res.status(500).json({ error: logErr.message });
                    res.json({ success: true, changes: this.changes, logId: this.lastID });
                }
            );
        }
    );
});

app.get('/api/stats', (req, res) => {
    const targetDate = req.query.date ? toValidDate(req.query.date) : new Date();

    if (!targetDate) {
        return res.status(400).json({ error: 'Invalid date' });
    }

    const { weekStart, weekEnd, dates } = buildWeekRange(targetDate);
    const targetDayKey = localDayKey(targetDate);
    const weekKeys = new Map(
        dates.map((date) => [
            localDayKey(date),
            {
                date: date.toISOString(),
                label: API_DATE_FORMATTER.format(date),
                tasks: 0,
                reviews: 0,
                isToday: isSameDay(date, targetDate),
            },
        ])
    );

    db.all('SELECT * FROM todos ORDER BY id DESC', [], (todoErr, todoRows) => {
        if (todoErr) return res.status(500).json({ error: todoErr.message });

        db.all('SELECT * FROM memory_items ORDER BY id DESC', [], (memoryErr, memoryRows) => {
            if (memoryErr) return res.status(500).json({ error: memoryErr.message });

            db.all('SELECT * FROM review_logs ORDER BY id DESC', [], (logErr, reviewRows) => {
                if (logErr) return res.status(500).json({ error: logErr.message });

                const todoStats = {
                    total: todoRows.length,
                    completed: todoRows.filter((row) => !!row.completed).length,
                    active: todoRows.filter((row) => !row.completed).length,
                    createdThisWeek: 0,
                    completedThisWeek: 0,
                };

                const memoryStats = {
                    total: memoryRows.length,
                    due: 0,
                    upcoming: 0,
                    mastered: 0,
                    createdThisWeek: 0,
                    reviewedThisWeek: 0,
                };

                const activityDays = new Set();

                for (const todo of todoRows) {
                    const createdAt = toValidDate(todo.createdAt);
                    if (createdAt) {
                        activityDays.add(localDayKey(createdAt));
                        const key = localDayKey(createdAt);
                        if (weekKeys.has(key)) {
                            weekKeys.get(key).tasks += 1;
                            todoStats.createdThisWeek += 1;
                        }
                    }

                    const completedAt = toValidDate(todo.completedAt);
                    if (completedAt) {
                        activityDays.add(localDayKey(completedAt));
                        if (weekKeys.has(localDayKey(completedAt))) {
                            todoStats.completedThisWeek += 1;
                        }
                    }
                }

                for (const item of memoryRows) {
                    const createdAt = toValidDate(item.createdAt);
                    if (createdAt) {
                        activityDays.add(localDayKey(createdAt));
                        if (weekKeys.has(localDayKey(createdAt))) {
                            memoryStats.createdThisWeek += 1;
                        }
                    }

                    const nextReviewDate = toValidDate(item.nextReviewDate);
                    if (nextReviewDate) {
                        if (localDayKey(nextReviewDate) > targetDayKey) {
                            memoryStats.upcoming += 1;
                        } else {
                            memoryStats.due += 1;
                        }
                    }

                    if ((item.reviewCount || 0) >= 5) {
                        memoryStats.mastered += 1;
                    }
                }

                for (const log of reviewRows) {
                    const reviewedAt = toValidDate(log.reviewedAt);
                    if (!reviewedAt) continue;

                    const key = localDayKey(reviewedAt);
                    activityDays.add(key);
                    if (weekKeys.has(key)) {
                        weekKeys.get(key).reviews += 1;
                        memoryStats.reviewedThisWeek += 1;
                    }
                }

                let streakDays = 0;
                let cursor = new Date(targetDate);
                while (activityDays.has(localDayKey(cursor))) {
                    streakDays += 1;
                    cursor.setDate(cursor.getDate() - 1);
                }

                const taskCompletionRate = todoStats.total > 0
                    ? Math.round((todoStats.completed / todoStats.total) * 100)
                    : 0;

                const reviewCompletionCount = memoryRows.filter((item) => (item.reviewCount || 0) > 0).length;
                const reviewCompletionRate = memoryStats.total > 0
                    ? Math.round((reviewCompletionCount / memoryStats.total) * 100)
                    : 0;

                res.json({
                    generatedAt: toISODateTime(),
                    targetDate: targetDate.toISOString(),
                    weekRange: {
                        start: weekStart.toISOString(),
                        end: weekEnd.toISOString(),
                    },
                    streakDays,
                    todoStats,
                    memoryStats,
                    completion: {
                        tasks: taskCompletionRate,
                        reviews: reviewCompletionRate,
                    },
                    reviewedItems: reviewCompletionCount,
                    weeklyActivity: dates.map((date) => {
                        const key = localDayKey(date);
                        return weekKeys.get(key);
                    }),
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
