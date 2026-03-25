import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { addDays, isSameDay, startOfWeek } from 'date-fns';
import { BarChart3, TrendingUp, Brain, Flame, Target, Star } from 'lucide-react';

const Motion = motion;
const API_BASE = '/api';

function ProgressRing({ progress, size = 80, strokeWidth = 6, color = '#4f8cff' }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="progress-ring-bg" />
            <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                stroke={color}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
            />
        </svg>
    );
}

function buildFallbackWeek(currentDate) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

    return Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return {
            date: date.toISOString(),
            label: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date),
            tasks: 0,
            reviews: 0,
            isToday: isSameDay(date, currentDate),
        };
    });
}

const EMPTY_STATS = {
    streakDays: 0,
    todoStats: { total: 0, completed: 0, active: 0, createdThisWeek: 0, completedThisWeek: 0 },
    memoryStats: { total: 0, due: 0, upcoming: 0, mastered: 0, createdThisWeek: 0, reviewedThisWeek: 0 },
    completion: { tasks: 0, reviews: 0 },
    weeklyActivity: [],
};

export function StatsPanel({ currentDate = new Date() }) {
    const [stats, setStats] = useState(EMPTY_STATS);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadStats() {
            try {
                const response = await fetch(
                    `${API_BASE}/stats?date=${encodeURIComponent(currentDate.toISOString())}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                setStats({
                    ...EMPTY_STATS,
                    ...data,
                    todoStats: { ...EMPTY_STATS.todoStats, ...(data.todoStats || {}) },
                    memoryStats: { ...EMPTY_STATS.memoryStats, ...(data.memoryStats || {}) },
                    completion: { ...EMPTY_STATS.completion, ...(data.completion || {}) },
                    weeklyActivity: Array.isArray(data.weeklyActivity) ? data.weeklyActivity : [],
                });
                setError('');
            } catch (err) {
                if (err.name === 'AbortError') return;
                setStats(EMPTY_STATS);
                setError('统计数据加载失败');
            }
        }

        loadStats();
        return () => controller.abort();
    }, [currentDate]);

    const weeklyData = useMemo(() => {
        if (stats.weeklyActivity.length > 0) {
            return stats.weeklyActivity;
        }
        return buildFallbackWeek(currentDate);
    }, [stats.weeklyActivity, currentDate]);

    const maxVal = Math.max(0, ...weeklyData.map((d) => Math.max(d.tasks || 0, d.reviews || 0)));
    const taskCompletion = stats.completion?.tasks || 0;
    const reviewCompletion = stats.completion?.reviews || 0;

    const statCards = [
        { label: '连续天数', value: stats.streakDays, icon: Flame, color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
        { label: '本周任务', value: stats.todoStats.createdThisWeek, icon: Target, color: '#4f8cff', bg: 'rgba(79,140,255,0.12)' },
        { label: '本周复习', value: stats.memoryStats.reviewedThisWeek, icon: Brain, color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
        { label: '已掌握', value: stats.memoryStats.mastered, icon: Star, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="stat-grid">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="stat-card"
                            style={{ alignItems: 'center', textAlign: 'center', padding: 20 }}
                        >
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: stat.bg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 8,
                                }}
                            >
                                <Icon style={{ width: 20, height: 20, color: stat.color }} />
                            </div>
                            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</span>
                        </Motion.div>
                    );
                })}
            </div>

            <Motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card"
                style={{ padding: 24 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                background: 'rgba(79,140,255,0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <BarChart3 style={{ width: 18, height: 18, color: '#4f8cff' }} />
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>本周活动</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#4f8cff' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>任务</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#a855f7' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>复习</span>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        height: 160,
                        padding: '0 8px',
                        gap: 8,
                    }}
                >
                    {weeklyData.map((d, i) => (
                        <div
                            key={`${d.label}-${i}`}
                            style={{
                                display: 'flex',
                                flex: 1,
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                                height: '100%',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: '100%' }}>
                                <Motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: maxVal > 0 ? `${((d.tasks || 0) / maxVal) * 120}px` : 0 }}
                                    transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                                    style={{
                                        width: 14,
                                        borderRadius: '6px 6px 2px 2px',
                                        background: 'linear-gradient(180deg, #4f8cff, #6366f1)',
                                        minHeight: (d.tasks || 0) > 0 ? 6 : 0,
                                        boxShadow: '0 2px 8px rgba(79,140,255,0.2)',
                                    }}
                                />
                                <Motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: maxVal > 0 ? `${((d.reviews || 0) / maxVal) * 120}px` : 0 }}
                                    transition={{ duration: 0.8, delay: i * 0.08 + 0.1, ease: 'easeOut' }}
                                    style={{
                                        width: 14,
                                        borderRadius: '6px 6px 2px 2px',
                                        background: 'linear-gradient(180deg, #a855f7, #6366f1)',
                                        minHeight: (d.reviews || 0) > 0 ? 6 : 0,
                                        boxShadow: '0 2px 8px rgba(168,85,247,0.2)',
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: 11,
                                    color: d.isToday ? '#4f8cff' : 'var(--text-muted)',
                                    fontWeight: d.isToday ? 700 : 500,
                                }}
                            >
                                {d.label}
                            </span>
                        </div>
                    ))}
                </div>
                {error && (
                    <p style={{ marginTop: 12, fontSize: 12, color: '#fca5a5' }}>{error}</p>
                )}
            </Motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <Motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card"
                    style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}
                >
                    <div style={{ position: 'relative' }}>
                        <ProgressRing progress={taskCompletion} color="#4f8cff" />
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                                fontWeight: 800,
                                color: '#4f8cff',
                            }}
                        >
                            {taskCompletion}%
                        </div>
                    </div>
                    <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>任务完成率</h4>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            共 {stats.todoStats.total} 项，已完成 {stats.todoStats.completed} 项
                        </p>
                    </div>
                </Motion.div>

                <Motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass-card"
                    style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}
                >
                    <div style={{ position: 'relative' }}>
                        <ProgressRing progress={reviewCompletion} color="#a855f7" />
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                                fontWeight: 800,
                                color: '#a855f7',
                            }}
                        >
                            {reviewCompletion}%
                        </div>
                    </div>
                    <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>复习完成率</h4>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            共 {stats.memoryStats.total} 项，已复习 {stats.reviewedItems || 0} 项
                        </p>
                    </div>
                </Motion.div>
            </div>

            <Motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-card"
                style={{ padding: 24 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            background: 'rgba(168,85,247,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <TrendingUp style={{ width: 18, height: 18, color: '#a855f7' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>艾宾浩斯记忆曲线</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>复习间隔：1 → 2 → 4 → 7 → 15 → 30 天</p>
                    </div>
                </div>

                <div style={{ position: 'relative', height: 120, marginBottom: 8 }}>
                    <svg width="100%" height="120" viewBox="0 0 700 120" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="30%" stopColor="#fb923c" />
                                <stop offset="60%" stopColor="#a855f7" />
                                <stop offset="100%" stopColor="#34d399" />
                            </linearGradient>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <motion.path
                            d="M 0 100 Q 50 90 100 70 Q 200 35 300 25 Q 400 15 500 10 Q 600 8 700 5"
                            fill="none"
                            stroke="url(#curveGrad)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, ease: 'easeOut' }}
                        />
                        <path
                            d="M 0 100 Q 50 90 100 70 Q 200 35 300 25 Q 400 15 500 10 Q 600 8 700 5 L 700 120 L 0 120 Z"
                            fill="url(#areaGrad)"
                        />
                    </svg>

                    {[
                        { x: '0%', label: '学习' },
                        { x: '14%', label: '1天' },
                        { x: '28%', label: '2天' },
                        { x: '43%', label: '4天' },
                        { x: '57%', label: '7天' },
                        { x: '78%', label: '15天' },
                        { x: '96%', label: '30天' },
                    ].map((p, i) => (
                        <Motion.div
                            key={p.label}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 + i * 0.1 }}
                            style={{
                                position: 'absolute',
                                bottom: -4,
                                left: p.x,
                                transform: 'translateX(-50%)',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{p.label}</div>
                        </Motion.div>
                    ))}
                </div>
            </Motion.div>
        </div>
    );
}
