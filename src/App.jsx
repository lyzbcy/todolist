import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Brain, ListTodo, Sparkles } from 'lucide-react';
import { TodoList } from './components/TodoList';
import { MemoryList } from './components/MemoryList';
import { StatsPanel } from './components/StatsPanel';

const Motion = motion;

function BackgroundOrbs() {
  return (
    <div className="bg-mesh">
      <motion.div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(79,140,255,0.08) 0%, transparent 70%)',
          top: '5%',
          left: '15%',
          borderRadius: '50%',
        }}
        animate={{ x: [0, 80, -40, 0], y: [0, 40, 80, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 350,
          height: 350,
          background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)',
          bottom: '10%',
          right: '10%',
          borderRadius: '50%',
        }}
        animate={{ x: [0, -60, 30, 0], y: [0, -50, 40, 0], scale: [1, 0.9, 1.12, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 250,
          height: 250,
          background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          borderRadius: '50%',
        }}
        animate={{ x: [0, 50, -70, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.88, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: '夜深了，注意休息', emoji: '🌙' };
  if (hour < 12) return { text: '早上好，新的一天开始了', emoji: '🌤️' };
  if (hour < 14) return { text: '中午好，记得休息一下', emoji: '🍜' };
  if (hour < 18) return { text: '下午好，继续加油', emoji: '☀️' };
  return { text: '晚上好，今天辛苦了', emoji: '🌙' };
}

function App() {
  const [activeTab, setActiveTab] = useState('todo');
  const [currentTime, setCurrentTime] = useState(new Date());
  const greeting = getGreeting();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = currentTime.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const tabs = [
    { key: 'todo', label: '任务', icon: ListTodo, color: '#4f8cff' },
    { key: 'memory', label: '记忆池', icon: Brain, color: '#a855f7' },
    { key: 'stats', label: '数据', icon: BarChart3, color: '#34d399' },
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <BackgroundOrbs />

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(10,10,26,0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            padding: '0 20px',
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.95 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #4f8cff, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(79,140,255,0.3)',
                cursor: 'pointer',
              }}
            >
              <Sparkles style={{ width: 20, height: 20, color: 'white' }} />
            </motion.div>
            <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              MindFlow
            </h1>
          </div>

          <nav
            style={{
              display: 'flex',
              gap: 4,
              padding: 4,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <motion.button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: isActive ? tab.color : 'var(--text-muted)',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 2px 12px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  <Icon style={{ width: 15, height: 15 }} />
                  {tab.label}
                </motion.button>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 120px', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
              {greeting.emoji} {greeting.text}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{dateStr}</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'todo' && (
            <motion.div
              key="todo"
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
              transition={{ duration: 0.35 }}
            >
              <TodoList />
            </motion.div>
          )}
          {activeTab === 'memory' && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
              transition={{ duration: 0.35 }}
            >
              <MemoryList />
            </motion.div>
          )}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
              transition={{ duration: 0.35 }}
            >
              <StatsPanel currentDate={currentTime} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
