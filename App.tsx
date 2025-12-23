
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { extractPoeticFragments, generatePoemImage } from './services/geminiService';
import { CollagePoem, PoeticFragment, FragmentStyle, DailyEntry, PoemVariant } from './types';
import { CollageCanvas } from './components/CollageCanvas';

const COLORS = [
  { bg: '#fef3c7', text: '#1e293b' },
  { bg: '#f1f5f9', text: '#334155' },
  { bg: '#fee2e2', text: '#991b1b' },
  { bg: '#ecfdf5', text: '#065f46' },
  { bg: '#ffffff', text: '#1e293b' },
  { bg: '#fafaf9', text: '#44403c' },
];

const FONTS = ["'Noto Serif SC', serif"];
const SUBJECTS = ['我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们'];

const WaggingCat = ({ scale = 1 }: { scale?: number }) => (
  <div className="cat-container" style={{ transform: `translate(-50%, -55%) scale(${scale})` }}>
    <div className="cat-body">
      <div className="cat-head">
        <div className="cat-ear left"></div>
        <div className="cat-ear right"></div>
      </div>
      <div className="cat-tail"></div>
    </div>
  </div>
);

// 定义生成的阶段文案
const GENERATION_STAGES = [
  "正在研磨文字片段...",
  "正在捕捉思绪意象...",
  "正在调配莫兰迪色...",
  "纸张纹理铺设中...",
  "等待墨水完全晾晒..."
];

const QueueOverlay = ({ isVisible }: { isVisible: boolean }) => {
  const [queueCount, setQueueCount] = useState(Math.floor(Math.random() * 8) + 3);
  const [waitTime, setWaitTime] = useState(queueCount * 2 + 5);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setQueueCount(prev => Math.max(1, prev - (Math.random() > 0.6 ? 1 : 0)));
      setWaitTime(prev => Math.max(1, prev - 1));
    }, 1000);

    const stageTimer = setInterval(() => {
      setStageIndex(prev => (prev + 1) % GENERATION_STAGES.length);
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10 backdrop-blur-[3px] transition-all duration-500 animate-in fade-in">
      <div
        className="relative bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 max-w-[300px] w-full text-center transform rotate-[-1deg] animate-in zoom-in-95 duration-300"
      >
        {/* 装饰性胶带 */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-white/70 backdrop-blur-sm border border-gray-200/50 rotate-2 opacity-90 shadow-sm"></div>

        <div className="relative mb-10 h-10">
          <WaggingCat scale={0.45} />
        </div>

        <div className="space-y-5 font-serif-sc">
          <div>
            <h3 className="font-black text-gray-800 text-lg mb-1 tracking-tighter">拼贴工坊进行中</h3>
            <p className="text-[10px] text-gray-400 animate-pulse">{GENERATION_STAGES[stageIndex]}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
            <div className="flex flex-col border-r border-gray-50">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">正在排队</span>
              <span className="text-xl font-black text-black">{queueCount} <span className="text-[10px] font-normal text-gray-400">位</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">预计等待</span>
              <span className="text-xl font-black text-black">{waitTime} <span className="text-[10px] font-normal text-gray-400">秒</span></span>
            </div>
          </div>

          <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden relative">
            <div className="h-full bg-black/80 transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (30 - waitTime) * 4)}%` }}></div>
          </div>

          <p className="text-[10px] text-gray-400 italic leading-loose opacity-60">
            “慢一点，<br/>让每一个字都有落下的声音。”
          </p>
        </div>
      </div>
    </div>
  );
};

const ArtisticHeader = () => (
  <div className="relative w-full h-[240px] flex items-center justify-center">
    <WaggingCat />
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-[0.03] flex items-center justify-center">
      <span className="text-[200px] font-extralight font-serif-sc transform -rotate-12 translate-x-8">詩</span>
    </div>
    <div className="relative w-[280px] h-full font-serif-sc">
      <div className="absolute top-2 left-4 text-6xl font-extralight text-black opacity-80 leading-none">今</div>
      <div className="absolute top-10 left-16 text-5xl font-light text-gray-800 opacity-90 leading-none">天</div>
      <div className="absolute top-16 left-12 text-2xl font-normal text-gray-400 opacity-60 leading-none z-0 text-blur">的</div>
      <div className="absolute bottom-12 left-2 text-7xl font-extralight text-black opacity-95 leading-none">拼</div>
      <div className="absolute bottom-4 left-24 text-6xl font-extralight text-gray-700 opacity-80 leading-none transform -rotate-3">贴</div>
      <div className="absolute top-2 right-4 flex flex-col items-center">
        <div className="w-0.5 h-10 bg-black/10 mb-2"></div>
        <span className="text-7xl font-medium text-black tracking-tighter leading-tight drop-shadow-sm">诗</span>
      </div>
    </div>
  </div>
);

const GlobalRaindrops = () => {
  const [drops, setDrops] = useState<{ id: number; left: number; top: number; duration: number }[]>([]);
  const dropIdRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(() => {
      const newDrop = {
        id: dropIdRef.current++,
        left: Math.random() * 100,
        top: Math.random() * 95 + 2,
        duration: Math.random() * 0.5 + 0.8,
      };
      setDrops(prev => [...prev.slice(-65), newDrop]);
    }, 200);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[100]">
      {drops.map(drop => (
        <React.Fragment key={drop.id}>
          <div className="raindrop" style={{ left: `${drop.left}%`, animationDuration: `${drop.duration}s`, '--fall-dist': '100vh' } as any} />
        </React.Fragment>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPoem, setCurrentPoem] = useState<CollagePoem | null>(null);
  const [activeVariant, setActiveVariant] = useState<PoemVariant>('4-lines');
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const saved = localStorage.getItem('mosaic_muse_entries');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntries(parsed);
      const today = new Date().toISOString().split('T')[0];
      const entry = parsed.find((e: DailyEntry) => e.date === today);
      if (entry) setInputText(entry.content);
    }
  }, []);

  useEffect(() => {
    const entry = entries.find(e => e.date === selectedDate);
    setInputText(entry ? entry.content : '');
  }, [selectedDate, entries]);

  const saveCurrentEntry = () => {
    if (!inputText.trim()) return;
    const newEntries = [...entries.filter(e => e.date !== selectedDate), { date: selectedDate, content: inputText }];
    const sorted = newEntries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
    setEntries(sorted);
    localStorage.setItem('mosaic_muse_entries', JSON.stringify(sorted));
  };

  const generateFragmentStyle = (isLonger: boolean): FragmentStyle => {
    const colorPair = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      backgroundColor: colorPair.bg,
      textColor: colorPair.text,
      rotation: (Math.random() - 0.5) * 6,
      fontSize: isLonger ? '0.85rem' : '1rem',
      padding: '4px 8px',
    };
  };

  const hasDuplicateSubject = (line: PoeticFragment[], newFrag: PoeticFragment): boolean => {
    return SUBJECTS.some(sub => newFrag.text.includes(sub) && line.some(f => f.text.includes(sub)));
  };

  const groupFragmentsStrictly = (fragments: PoeticFragment[], maxLines: number): PoeticFragment[][] => {
    const lines: PoeticFragment[][] = Array.from({ length: maxLines }, () => []);
    const temp = [...fragments];
    const shuffledIndices = Array.from({ length: maxLines }, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < maxLines && temp.length > 0; i++) lines[shuffledIndices[i]].push(temp.shift()!);
    while (temp.length > 0) {
      const frag = temp.shift()!;
      let targetIdx = -1;
      const roundIndices = Array.from({ length: maxLines }, (_, i) => i).sort(() => Math.random() - 0.5);
      for (const idx of roundIndices) {
        const curLen = lines[idx].reduce((acc, f) => acc + f.text.length, 0);
        if (curLen + frag.text.length < 12 && !hasDuplicateSubject(lines[idx], frag)) { targetIdx = idx; break; }
      }
      if (targetIdx === -1) {
        targetIdx = roundIndices.reduce((idx, i) => lines[i].length < lines[idx].length ? i : idx, roundIndices[0]);
      }
      lines[targetIdx].push(frag);
    }
    return lines;
  };

  const generatePoemFromText = async (text: string, title: string) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { fourLines, eightLines } = await extractPoeticFragments(text);
      const imageUrl = await generatePoemImage(fourLines.join(' '));
      const createFrags = (arr: string[], prefix: string) => arr.map((t, idx) => ({
        id: `${prefix}-${idx}-${Date.now()}`,
        text: t,
        style: generateFragmentStyle(t.length > 4),
      }));
      setCurrentPoem({
        id: `poem-${Date.now()}`,
        title,
        variantLines: { '4-lines': groupFragmentsStrictly(createFrags(fourLines, 'f4'), 4), '8-lines': groupFragmentsStrictly(createFrags(eightLines, 'f8'), 8) },
        timestamp: Date.now(),
        background: '#ffffff',
        fontFamily: FONTS[0],
        imageUrl: imageUrl,
      });
      setActiveVariant('4-lines');
    } catch (err) {
      console.error("Silent recovery engaged.", err);
    } finally {
      // 完成生成后延迟关闭，确保 UI 体验连贯
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleGenerateToday = () => { saveCurrentEntry(); generatePoemFromText(inputText, "本日切片"); };
  const handleGenerateRange = (days: number) => {
    const combined = entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, days).map(e => e.content).join('\n\n');
    generatePoemFromText(combined, days === 7 ? "周刊碎片" : "月度剪报");
  };

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `mosaic-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error('Export failed', err); }
  }, []);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days.reverse();
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f1ea] flex flex-col items-center p-4 md:p-8 relative">
      <GlobalRaindrops />

      {/* 排队窗口，仅在 loading 为 true 时显示 */}
      <QueueOverlay isVisible={loading} />

      <header className="mb-4 text-center relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-sm border border-gray-100 w-full flex items-center justify-center overflow-hidden h-[280px]">
          <ArtisticHeader />
        </div>
      </header>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-start justify-center relative z-10">
        <div className="w-full max-w-sm mx-auto lg:mx-0 space-y-4">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xs font-serif-sc font-black mb-4 flex justify-between tracking-widest text-gray-400">
              <span>DAILY NOTES</span><span>{selectedDate}</span>
            </h2>
            <textarea className="w-full h-40 p-4 bg-[#fafaf9]/80 rounded-xl focus:ring-1 focus:ring-black outline-none transition-all resize-none border-none text-sm text-gray-700 leading-relaxed font-serif-sc" placeholder="书写此刻的思绪..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
            <button onClick={handleGenerateToday} disabled={loading || !inputText.trim()} className="mt-4 w-full py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:bg-gray-200 shadow-lg min-h-[50px] flex items-center justify-center">
              {loading ? '正在研磨...' : '开始拼贴'}
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => (
                <button key={date} onClick={() => setSelectedDate(date)} className={`aspect-square rounded flex items-center justify-center text-[9px] transition-all font-bold ${selectedDate === date ? 'bg-black text-white shadow-md scale-105' : entries.some(e => e.date === date) ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-200 hover:bg-gray-100'}`}>
                  {new Date(date).getDate()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0 space-y-4">
          {currentPoem && (
            <div className="flex bg-white/60 p-1 rounded-xl gap-1 border border-white/40 shadow-sm">
              {(['4-lines', '8-lines', 'image-only'] as PoemVariant[]).map(v => (
                <button key={v} onClick={() => setActiveVariant(v)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeVariant === v ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  {v === '4-lines' ? '四行版本' : v === '8-lines' ? '八行版本' : '无字模式'}
                </button>
              ))}
            </div>
          )}

          {currentPoem ? (
            <div className="space-y-4">
              <CollageCanvas poem={currentPoem} variant={activeVariant} innerRef={canvasRef} />
              <button onClick={handleExport} className="w-full py-3 bg-black text-white rounded-xl text-xs font-black shadow-xl hover:bg-gray-900 transition-transform active:scale-95 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                保存此版本
              </button>
            </div>
          ) : (
            <div className="w-full aspect-[3/4] bg-white/40 backdrop-blur-sm border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center group">
              <div className="mb-4 transition-transform group-hover:-translate-y-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <p className="font-serif-sc italic text-[11px] text-gray-300 tracking-widest leading-loose">拾起岁月的碎片，<br/>拼凑成此时此刻。</p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 text-gray-300 text-[9px] font-serif-sc uppercase tracking-[0.4em] relative z-10 font-bold">Mosaic Muse • Living Poetry</footer>
    </div>
  );
};

export default App;
