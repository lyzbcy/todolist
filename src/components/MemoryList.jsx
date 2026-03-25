import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Clock, Check, ChevronRight, Brain, Zap, Star, RotateCw, Sparkles } from 'lucide-react';
import { addDays, isToday, isBefore, startOfToday } from 'date-fns';

const EBBINGHAUS_CURVE = [1, 2, 4, 7, 15, 30];
const API_BASE = '/api';

const REVIEW_STAGES = [
    { label: '1st', color: '#ef4444', emoji: '🔴' },
    { label: '2nd', color: '#fb923c', emoji: '🟠' },
    { label: '3rd', color: '#facc15', emoji: '🟡' },
    { label: '4th', color: '#34d399', emoji: '🟢' },
    { label: '5th', color: '#06b6d4', emoji: '🔵' },
    { label: '6th', color: '#a855f7', emoji: '🟣' },
];

export function MemoryList() {
    const [items, setItems] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [showFlashcard, setShowFlashcard] = useState(null);

    const today = startOfToday();

    useEffect(() => {
        fetch(`${API_BASE}/memory`)
            .then(r => r.json())
            .then(data => {
                setItems(data.map(item => ({
                    ...item,
                    createdAt: new Date(item.createdAt),
                    nextReviewDate: new Date(item.nextReviewDate)
                })));
            })
            .catch(console.error);
    }, []);

    const itemsToReview = useMemo(() => {
        return items.filter(item =>
            isToday(item.nextReviewDate) || isBefore(item.nextReviewDate, today)
        );
    }, [items, today]);

    const upcomingItems = useMemo(() => {
        return items.filter(item =>
            !isToday(item.nextReviewDate) && !isBefore(item.nextReviewDate, today)
        );
    }, [items, today]);

    const addMemoryItem = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newItemPayload = {
            text: inputValue.trim(),
            createdAt: new Date().toISOString(),
            reviewCount: 0,
            nextReviewDate: addDays(today, EBBINGHAUS_CURVE[0]).toISOString(),
            category: '学习'
        };

        try {
            const res = await fetch(`${API_BASE}/memory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItemPayload)
            });
            const data = await res.json();
            setItems([{
                ...data,
                createdAt: new Date(data.createdAt),
                nextReviewDate: new Date(data.nextReviewDate)
            }, ...items]);
            setInputValue('');
        } catch (err) { console.error(err); }
    };

    const markReviewed = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const nextReviewCount = item.reviewCount + 1;
        const nextInterval = EBBINGHAUS_CURVE[Math.min(nextReviewCount, EBBINGHAUS_CURVE.length - 1)];
        const nextDate = addDays(today, nextInterval);

        try {
            await fetch(`${API_BASE}/memory/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewCount: nextReviewCount, nextReviewDate: nextDate.toISOString() })
            });

            setItems(items.map(i =>
                i.id === id ? { ...i, reviewCount: nextReviewCount, nextReviewDate: nextDate } : i
            ));
            setShowFlashcard(null);
        } catch (err) { console.error(err); }
    };

    const stageInfo = (reviewCount) => REVIEW_STAGES[Math.min(reviewCount, REVIEW_STAGES.length - 1)];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Memory Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                    className="stat-card"
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'rgba(168,85,247,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Brain style={{ width: 16, height: 16, color: '#a855f7' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>记忆池</span>
                    </div>
                    <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{items.length}</span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="stat-card"
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'rgba(239,68,68,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Zap style={{ width: 16, height: 16, color: '#ef4444' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>待复习</span>
                    </div>
                    <span style={{ fontSize: 28, fontWeight: 800, color: itemsToReview.length > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                        {itemsToReview.length}
                    </span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="stat-card"
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'rgba(52,211,153,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Star style={{ width: 16, height: 16, color: '#34d399' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>已掌握</span>
                    </div>
                    <span style={{ fontSize: 28, fontWeight: 800, color: '#34d399' }}>
                        {items.filter(i => i.reviewCount >= 5).length}
                    </span>
                </motion.div>
            </div>

            {/* Input */}
            <form onSubmit={addMemoryItem} style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="📝 录入新考点或单词..."
                    className="input-glass purple"
                />
                <motion.button
                    type="submit"
                    disabled={!inputValue.trim()}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        width: 40, height: 40, borderRadius: 12, border: 'none',
                        background: inputValue.trim() ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(255,255,255,0.06)',
                        color: 'white', cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: inputValue.trim() ? '0 4px 16px rgba(168,85,247,0.3)' : 'none',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <Plus style={{ width: 18, height: 18 }} />
                </motion.button>
            </form>

            {/* Active Flashcard Overlay */}
            <AnimatePresence>
                {showFlashcard !== null && (() => {
                    const item = items.find(i => i.id === showFlashcard);
                    if (!item) return null;
                    const stage = stageInfo(item.reviewCount);
                    return (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowFlashcard(null)}
                            style={{
                                position: 'fixed', inset: 0, zIndex: 100,
                                background: 'rgba(0,0,0,0.7)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 20
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.8, y: 40 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.8, y: 40 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '100%', maxWidth: 480, padding: 40,
                                    background: 'rgba(20,20,40,0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 24, textAlign: 'center',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                                }}
                            >
                                <div style={{
                                    display: 'inline-flex', padding: '6px 14px', borderRadius: 100,
                                    background: `${stage.color}20`, color: stage.color,
                                    fontSize: 13, fontWeight: 700, marginBottom: 24
                                }}>
                                    {stage.emoji} 第 {item.reviewCount + 1} 次复习
                                </div>
                                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
                                    {item.text}
                                </h2>
                                {item.category && (
                                    <span style={{
                                        display: 'inline-block', padding: '4px 12px', borderRadius: 8,
                                        background: 'rgba(168,85,247,0.1)', color: '#a855f7',
                                        fontSize: 12, fontWeight: 600, marginBottom: 32
                                    }}>{item.category}</span>
                                )}

                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                                    <motion.button
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => setShowFlashcard(null)}
                                        style={{
                                            padding: '12px 24px', borderRadius: 14, border: 'none',
                                            background: 'rgba(255,255,255,0.06)',
                                            color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                            border: '1px solid rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        <RotateCw style={{ width: 15, height: 15 }} /> 还没记住
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => markReviewed(item.id)}
                                        style={{
                                            padding: '12px 28px', borderRadius: 14, border: 'none',
                                            background: 'linear-gradient(135deg, #34d399, #06b6d4)',
                                            color: 'white', fontSize: 14, fontWeight: 700,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                            boxShadow: '0 4px 20px rgba(52,211,153,0.3)'
                                        }}
                                    >
                                        <Check style={{ width: 16, height: 16 }} strokeWidth={3} /> 记住了！
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Review Items */}
            {itemsToReview.length > 0 && (
                <div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16
                    }}>
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Zap style={{ width: 16, height: 16, color: '#fb923c' }} />
                        </motion.div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                            今日待复习
                        </span>
                        <span style={{
                            padding: '3px 10px', borderRadius: 100,
                            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                            fontSize: 12, fontWeight: 700
                        }}>
                            {itemsToReview.length}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <AnimatePresence mode="popLayout">
                            {itemsToReview.map((item, i) => {
                                const stage = stageInfo(item.reviewCount);
                                return (
                                    <motion.div
                                        layout
                                        key={item.id}
                                        initial={{ opacity: 0, y: 15, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.3 } }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => setShowFlashcard(item.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 14,
                                            padding: '16px 18px',
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 16, cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}
                                        whileHover={{
                                            background: 'rgba(168,85,247,0.06)',
                                            borderColor: 'rgba(168,85,247,0.2)',
                                            boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
                                        }}
                                    >
                                        {/* Stage badge */}
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 12,
                                            background: `${stage.color}15`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, fontSize: 18
                                        }}>
                                            {stage.emoji}
                                        </div>

                                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 15, fontWeight: 500, color: 'var(--text-primary)',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                {item.text}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                {item.category && (
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 6,
                                                        background: 'rgba(168,85,247,0.1)', color: '#a855f7',
                                                        fontSize: 11, fontWeight: 600
                                                    }}>{item.category}</span>
                                                )}
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <Clock style={{ width: 10, height: 10 }} /> 第 {item.reviewCount + 1} 轮
                                                </span>
                                            </div>
                                        </div>

                                        <motion.div
                                            whileHover={{ x: 3 }}
                                            style={{
                                                width: 32, height: 32, borderRadius: 10,
                                                background: 'rgba(168,85,247,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0
                                            }}
                                        >
                                            <ChevronRight style={{ width: 16, height: 16, color: '#a855f7' }} />
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Upcoming items */}
            {upcomingItems.length > 0 && (
                <div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                        paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                        <Clock style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                        <span style={{
                            fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: 1
                        }}>
                            即将复习 ({upcomingItems.length})
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.5 }}>
                        {upcomingItems.map(item => {
                            const stage = stageInfo(item.reviewCount);
                            return (
                                <div key={item.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                                    background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                                    border: '1px solid rgba(255,255,255,0.04)'
                                }}>
                                    <span style={{ fontSize: 14 }}>{stage.emoji}</span>
                                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', flexGrow: 1 }}>{item.text}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {item.nextReviewDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All done */}
            {itemsToReview.length === 0 && items.length > 0 && (
                <div className="glass-card" style={{
                    padding: '48px 20px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', textAlign: 'center'
                }}>
                    <motion.div
                        animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ fontSize: 48, marginBottom: 16 }}
                    >
                        🎉
                    </motion.div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                        太棒了！
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                        今天的复习已全部完成，继续保持！
                    </p>
                </div>
            )}

            {/* Empty state */}
            {items.length === 0 && (
                <div className="glass-card" style={{
                    padding: '60px 20px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', textAlign: 'center'
                }}>
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            width: 64, height: 64, borderRadius: 20,
                            background: 'rgba(168,85,247,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 16
                        }}
                    >
                        <Brain style={{ width: 32, height: 32, color: '#a855f7' }} />
                    </motion.div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        记忆池为空
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        录入你的第一个考点，让艾宾浩斯帮你安排复习
                    </p>
                </div>
            )}
        </div>
    );
}
