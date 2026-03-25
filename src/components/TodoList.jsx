import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, ListTodo, Flame, Target } from 'lucide-react';
import { TodoItem } from './TodoItem';

const API_BASE = '/api';

export function TodoList() {
    const [todos, setTodos] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetch(`${API_BASE}/todos`)
            .then(r => r.json())
            .then(data => setTodos(data))
            .catch(console.error);
    }, []);

    const addTodo = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const priorities = ['low', 'medium', 'high'];
        const newTodo = {
            text: inputValue.trim(),
            priority: priorities[Math.floor(Math.random() * 3)],
            category: '日常'
        };

        try {
            const res = await fetch(`${API_BASE}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTodo)
            });
            const data = await res.json();
            setTodos([data, ...todos]);
            setInputValue('');
        } catch (err) { console.error(err); }
    };

    const toggleTodo = async (id) => {
        const todo = todos.find(t => t.id === id);
        try {
            await fetch(`${API_BASE}/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !todo.completed })
            });
            setTodos(todos.map(t =>
                t.id === id ? { ...t, completed: !t.completed } : t
            ));
        } catch (err) { console.error(err); }
    };

    const deleteTodo = async (id) => {
        try {
            await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
            setTodos(todos.filter(todo => todo.id !== id));
        } catch (err) { console.error(err); }
    };

    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);
    const progress = todos.length > 0 ? Math.round((completedTodos.length / todos.length) * 100) : 0;

    const filteredActive = filter === 'completed' ? [] : activeTodos;
    const filteredCompleted = filter === 'active' ? [] : completedTodos;

    const filters = [
        { key: 'all', label: '全部' },
        { key: 'active', label: '进行中' },
        { key: 'completed', label: '已完成' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Progress Header */}
            <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 12,
                            background: 'linear-gradient(135deg, #4f8cff, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(79,140,255,0.25)'
                        }}>
                            <Target style={{ width: 18, height: 18, color: 'white' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>今日进度</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{completedTodos.length}/{todos.length} 任务已完成</p>
                        </div>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#4f8cff' }}>{progress}%</div>
                </div>

                {/* Progress bar */}
                <div style={{
                    width: '100%', height: 8, background: 'rgba(255,255,255,0.06)',
                    borderRadius: 4, overflow: 'hidden'
                }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{
                            height: '100%', borderRadius: 4,
                            background: 'linear-gradient(90deg, #4f8cff, #6366f1, #a855f7)',
                            boxShadow: '0 0 12px rgba(79,140,255,0.4)'
                        }}
                    />
                </div>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8 }}>
                {filters.map(f => (
                    <motion.button
                        key={f.key}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setFilter(f.key)}
                        style={{
                            padding: '8px 16px', borderRadius: 12, border: 'none',
                            background: filter === f.key ? 'rgba(79,140,255,0.15)' : 'rgba(255,255,255,0.04)',
                            color: filter === f.key ? '#4f8cff' : 'var(--text-muted)',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${filter === f.key ? 'rgba(79,140,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {f.label}
                    </motion.button>
                ))}
            </div>

            {/* Inline input */}
            <form onSubmit={addTodo} style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="✏️ 添加新任务，回车提交..."
                    className="input-glass"
                />
                <motion.button
                    type="submit"
                    disabled={!inputValue.trim()}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        width: 40, height: 40, borderRadius: 12, border: 'none',
                        background: inputValue.trim() ? 'linear-gradient(135deg, #4f8cff, #6366f1)' : 'rgba(255,255,255,0.06)',
                        color: 'white', cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: inputValue.trim() ? '0 4px 16px rgba(79,140,255,0.3)' : 'none',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <Plus style={{ width: 18, height: 18 }} />
                </motion.button>
            </form>

            {/* Active list */}
            {filteredActive.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <AnimatePresence mode="popLayout">
                        {filteredActive.map(todo => (
                            <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Completed */}
            {filteredCompleted.length > 0 && (
                <div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 12, paddingBottom: 8,
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                        <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                            已完成 ({filteredCompleted.length})
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.6 }}>
                        <AnimatePresence mode="popLayout">
                            {filteredCompleted.map(todo => (
                                <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {todos.length === 0 && (
                <div className="glass-card" style={{
                    padding: '60px 20px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', textAlign: 'center'
                }}>
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            width: 64, height: 64, borderRadius: 20,
                            background: 'rgba(79,140,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 16
                        }}
                    >
                        <ListTodo style={{ width: 32, height: 32, color: '#4f8cff' }} />
                    </motion.div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        暂无任务
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        在上方输入框中添加你的第一个任务
                    </p>
                </div>
            )}
        </div>
    );
}
