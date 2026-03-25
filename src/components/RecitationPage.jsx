import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  RefreshCw,
  SkipForward,
  Sparkles,
  Star,
  Target,
  Volume2,
} from 'lucide-react';

const API_BASE = '/api';
const Motion = motion;

const MODE_OPTIONS = [
  { key: 'mixed', label: '混合' },
  { key: 'new', label: '今日新学' },
  { key: 'review', label: '今日复习' },
];

const RATINGS = [
  { key: 'again', label: '忘记了', color: '#ef4444' },
  { key: 'hard', label: '困难', color: '#fb923c' },
  { key: 'good', label: '一般', color: '#4f8cff' },
  { key: 'easy', label: '简单', color: '#34d399' },
];

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
  outline: 'none',
};

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  window.speechSynthesis.speak(u);
}

function dayKey(date) {
  return format(date, 'yyyy-MM-dd');
}

function ProgressBar({ done, total }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
        <span>今日已完成 {done}/{total}</span>
        <span>{percent}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <Motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #4f8cff, #a855f7, #34d399)' }}
        />
      </div>
    </div>
  );
}

export function RecitationPage({ currentDate = new Date() }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('mixed');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const [manualMastery, setManualMastery] = useState('');
  const [manualDueDate, setManualDueDate] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  const todayKey = useMemo(() => dayKey(currentDate), [currentDate]);

  const loadPlan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/recitation/plan?date=${encodeURIComponent(todayKey)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlan(data);
      setCurrentIndex(0);
      setRevealed(false);
      setManualMastery('');
      setManualDueDate('');
      setManualNotes('');
    } catch {
      setError('背诵计划加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  const queue = useMemo(() => {
    const items = plan?.dueItems || [];
    if (mode === 'new') return items.filter((item) => item.review_count === 0);
    if (mode === 'review') return items.filter((item) => item.review_count > 0);
    return items;
  }, [plan, mode]);

  const current = queue[currentIndex] || null;
  const summary = plan?.summary || {
    total: 0, dueCount: 0, newCount: 0, reviewCount: 0, masteredCount: 0, suggestedCount: 0,
  };
  const stats = plan?.stats || { weeklyCurve: [] };

  useEffect(() => {
    if (currentIndex >= queue.length) {
      setCurrentIndex(0);
      setRevealed(false);
    }
  }, [currentIndex, queue.length]);

  const commitAction = async (action, manual = null) => {
    if (!current && action !== 'manual') return;
    try {
      const res = await fetch(`${API_BASE}/recitation/items/${current.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, date: todayKey, manual }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (action !== 'later' && action !== 'skip' && action !== 'manual') setSessionDone((n) => n + 1);
      await loadPlan();
    } catch {
      setError('更新失败，请稍后重试');
    }
  };

  const saveManual = async () => {
    await commitAction('manual', {
      mastery_level: manualMastery,
      due_date: manualDueDate,
      notes: manualNotes,
      last_review_date: todayKey,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(79,140,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen style={{ width: 18, height: 18, color: '#4f8cff' }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>每日背诵</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{todayKey} 的复习计划</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setMode(opt.key); setCurrentIndex(0); setRevealed(false); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: mode === opt.key ? 'rgba(79,140,255,0.18)' : 'rgba(255,255,255,0.04)',
                  color: mode === opt.key ? '#4f8cff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {opt.label}
              </button>
            ))}
            <button onClick={loadPlan} style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
              <RefreshCw style={{ width: 14, height: 14 }} /> 刷新
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <ProgressBar done={sessionDone} total={summary.dueCount} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 18 }}>
          {[
            { label: '待复习', value: summary.dueCount, color: '#4f8cff', icon: Target },
            { label: '今日新学', value: summary.newCount, color: '#a855f7', icon: Sparkles },
            { label: '今日建议', value: summary.suggestedCount, color: '#34d399', icon: Clock3 },
            { label: '已掌握', value: summary.masteredCount, color: '#fb923c', icon: Star },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{card.label}</span>
                  <Icon style={{ width: 16, height: 16, color: card.color }} />
                </div>
                <div style={{ marginTop: 12, fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
              </div>
            );
          })}
        </div>
      </Motion.div>

      {loading && <div className="glass-card" style={{ padding: 36, textAlign: 'center' }}>加载中...</div>}
      {!loading && error && <div className="glass-card" style={{ padding: 24, color: '#fca5a5' }}>{error}</div>}

      {!loading && !error && current && (
        <Motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 24, minHeight: 420, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>第 {currentIndex + 1} / {queue.length} 条</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                掌握值 {current.mastery_level} / 10 · 复习 {current.review_count} 次
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {current.category && <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(168,85,247,0.12)', color: '#a855f7', fontSize: 12 }}>{current.category}</span>}
              <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(79,140,255,0.12)', color: '#4f8cff', fontSize: 12 }}>到期 {current.due_date}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!revealed ? (
              <Motion.div key="front" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, borderRadius: 24, padding: 28, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 220 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>问题面</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.5 }}>{current.content}</div>
                <button onClick={() => setRevealed(true)} style={{ marginTop: 24, padding: '12px 22px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #4f8cff, #6366f1)', color: 'white', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  显示答案 <ChevronRight style={{ width: 16, height: 16 }} />
                </button>
              </Motion.div>
            ) : (
              <Motion.div key="back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, borderRadius: 24, padding: 24, background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>答案面</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 6 }}>{current.content}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => speak(current.content)} style={{ padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Volume2 style={{ width: 14, height: 14 }} /> 朗读
                    </button>
                    <button onClick={() => setRevealed(false)} style={{ padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      返回题面
                    </button>
                  </div>
                </div>

                <div style={{ padding: 18, borderRadius: 18, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>含义 / 答案</div>
                  <div style={{ fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.7 }}>{current.meaning || '暂无释义'}</div>
                </div>

                {current.notes && <div style={{ padding: 18, borderRadius: 18, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>备注</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{current.notes}</div>
                </div>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {RATINGS.map((r) => (
                    <button key={r.key} onClick={() => commitAction(r.key)} style={{ padding: '14px 16px', borderRadius: 16, border: 'none', background: `${r.color}22`, color: r.color, fontWeight: 700, cursor: 'pointer' }}>
                      {r.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => commitAction('later')} style={{ padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock3 style={{ width: 14, height: 14 }} /> 稍后复习
                  </button>
                  <button onClick={() => commitAction('skip')} style={{ padding: '10px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <SkipForward style={{ width: 14, height: 14 }} /> 跳过今日
                  </button>
                </div>

                <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>手动调整</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <input value={manualMastery} onChange={(e) => setManualMastery(e.target.value)} placeholder="掌握值" type="number" min="0" max="10" style={inputStyle} />
                    <input value={manualDueDate} onChange={(e) => setManualDueDate(e.target.value)} type="date" style={inputStyle} />
                    <input value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="备注" type="text" style={inputStyle} />
                  </div>
                  <button onClick={saveManual} style={{ marginTop: 12, padding: '10px 14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #34d399, #06b6d4)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                    保存手动调整
                  </button>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </Motion.div>
      )}

      {!loading && !error && !current && (
        <div className="glass-card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>今天没有待复习内容</div>
          <div style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>你可以添加新内容，或者查看明日计划。</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(79,140,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 style={{ width: 16, height: 16, color: '#4f8cff' }} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>本周学习曲线</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'end', height: 120 }}>
            {(stats.weeklyCurve || []).map((day) => (
              <div key={day.date} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 90, display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
                  <div style={{ width: 18, height: `${Math.max(8, Math.min(80, day.reviews * 18 + day.mastered * 8))}px`, borderRadius: 8, background: 'linear-gradient(180deg, #4f8cff, #a855f7)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{day.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target style={{ width: 16, height: 16, color: '#a855f7' }} />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>今日掌握率</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#a855f7', marginBottom: 8 }}>
            {summary.total ? Math.round((summary.masteredCount / summary.total) * 100) : 0}%
          </div>
          <div style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>
            总条目 {summary.total}，今日建议 {summary.suggestedCount} 条，已掌握 {summary.masteredCount} 条。
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(79,140,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles style={{ width: 16, height: 16, color: '#4f8cff' }} />
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>今日队列</div>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {queue.slice(0, 12).map((item, index) => {
            const active = current && current.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setCurrentIndex(index); setRevealed(false); }}
                style={{
                  minWidth: 180,
                  textAlign: 'left',
                  padding: 14,
                  borderRadius: 16,
                  border: active ? '1px solid rgba(79,140,255,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  background: active ? 'rgba(79,140,255,0.10)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                  掌握 {item.mastery_level} · 复习 {item.review_count}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>{item.content}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
