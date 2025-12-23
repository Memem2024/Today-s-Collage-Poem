
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

const QueueOverlay = ({ queueCount }: { queueCount: number }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/5 backdrop-blur-[2px] transition-all duration-500">
    <div
      className="relative bg-white p-8 shadow-2xl border border-gray-100 max-w-[280px] w-full text-center transform rotate-[-1deg]"
      style={{ boxShadow: '20px 20px 60px rgba(0,0,0,0.05), -20px -20px 60px rgba(255,255,255,0.8)' }}
    >
      {/* 装饰性胶带 */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/60 backdrop-blur-sm border border-gray-200/50 rotate-1 opacity-80 shadow-sm"></div>

      <div className="relative mb-8 h-12">
        <WaggingCat scale={0.4} />
      </div>

      <h3 className="font-serif-sc font-black text-gray-800 text-lg mb-2 tracking-tight">正在研磨思绪</h3>

      <div className="space-y-4 font-serif-sc">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-[0.3em] mb-1">Queue Status</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-black">{queueCount}</span>
            <span className="text-[10px] text-gray-500 font-bold">位诗人在排队</span>
          </div>
        </div>

        <div className="w-full bg-gray-50 h-1 rounded-full overflow-hidden">
          <div className="h-full bg-black animate-[progress_10s_ease-in-out_infinite]"></div>
        </div>

        <p className="text-[10px] text-gray-400 leading-relaxed italic">
          “好诗需要时间，<br/>就像雨水落在干燥的纸上。”
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}} />
    </div>
  </div>
);

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
  const [queueCount, setQueueCount] = useState(0);
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

  // 模拟排队人数变化的计时器
  useEffect(() => {
    if (loading) {
      setQueueCount(Math.floor(Math.random() * 5) + 2); // 初始排队 2-6 人
      const interval = setInterval(() => {
        setQueueCount(prev => Math.max(1, prev - (Math.random() > 0.7 ? 1 : 0)));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading]);

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
      // 稍微多停留一下，让排队感更真实
      setTimeout(() => setLoading(false), 500);
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
      {loading && <QueueOverlay queueCount={queueCount} />}

      <header className="mb-4 text-center relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-sm border border-gray-100 w-full flex items-center justify-center overflow-hidden h-[280px]">
          <ArtisticHeader />
        </div>
      </header>

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-start justify-center relative z-10">
        {/* 左侧控制区 */}
        <div className="w-full max-w-sm mx-auto lg:mx-0 space-y-4">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xs font-serif-sc font-black mb-4 flex justify-between tracking-widest text-gray-400">
              <span>DAILY NOTES</span><span>{selectedDate}</span>
            </h2>
            <textarea className="w-full h-40 p-4 bg-[#fafaf9]/80 rounded-xl focus:ring-1 focus:ring-black outline-none transition-all resize-none border-none text-sm text-gray-700 leading-relaxed font-serif-sc" placeholder="书写此刻的思绪..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
            <button onClick={handleGenerateToday} disabled={loading || !inputText.trim()} className="mt-4 w-full py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:bg-gray-200 shadow-lg min-h-[50px] flex items-center justify-center">
              {loading ? '正在拼贴...' : '开始拼贴'}
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

        {/* 右侧预览区 */}
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
