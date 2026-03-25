import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, GripVertical } from 'lucide-react';

export function TodoItem({ todo, onToggle, onDelete }) {
    const [isHovered, setIsHovered] = useState(false);

    const priorityColors = {
        high: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', dot: '#ef4444' },
        medium: { bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.3)', dot: '#fb923c' },
        low: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', dot: '#34d399' },
    };
    const colors = priorityColors[todo.priority] || priorityColors.low;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.9, transition: { duration: 0.25 } }}
            whileHover={{ scale: 1.01 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px',
                background: todo.completed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${todo.completed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                ...(isHovered && !todo.completed ? {
                    background: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(79,140,255,0.2)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
                } : {})
            }}
        >
            {/* Priority dot */}
            <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: todo.completed ? 'var(--text-muted)' : colors.dot,
                flexShrink: 0,
                boxShadow: todo.completed ? 'none' : `0 0 8px ${colors.dot}40`
            }} />

            {/* Checkbox */}
            <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onToggle(todo.id)}
                style={{
                    width: 24, height: 24, borderRadius: 8, border: 'none',
                    background: todo.completed
                        ? 'linear-gradient(135deg, #4f8cff, #6366f1)'
                        : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                    outline: todo.completed ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                    boxShadow: todo.completed ? '0 2px 12px rgba(79,140,255,0.3)' : 'none',
                    transition: 'all 0.3s ease'
                }}
            >
                <AnimatePresence>
                    {todo.completed && (
                        <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                            <Check style={{ width: 14, height: 14, color: 'white' }} strokeWidth={3} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Text */}
            <div style={{ flexGrow: 1 }}>
                <span style={{
                    fontSize: 15, fontWeight: 500,
                    color: todo.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    transition: 'all 0.3s ease'
                }}>
                    {todo.text}
                </span>
                {todo.category && (
                    <span style={{
                        marginLeft: 8, padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(79,140,255,0.1)',
                        color: '#4f8cff', fontSize: 11, fontWeight: 600
                    }}>
                        {todo.category}
                    </span>
                )}
            </div>

            {/* Delete */}
            <AnimatePresence>
                {isHovered && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
                        style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0
                        }}
                    >
                        <Trash2 style={{ width: 14, height: 14, color: '#ef4444' }} />
                    </motion.button>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
