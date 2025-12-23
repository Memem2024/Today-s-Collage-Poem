
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { extractPoeticFragments } from './services/geminiService';
import { CollagePoem, PoeticFragment, DailyEntry, PoemVariant } from './types';
import { CollageCanvas } from './components/CollageCanvas';

const COLORS = [
  { bg: '#fdfcf0', text: '#1e293b' },
  { bg: '#f1f5f9', text: '#334155' },
  { bg: '#fff1f2', text: '#991b1b' },
  { bg: '#f0fdf4', text: '#065f46' },
  { bg: '#ffffff', text: '#1e293b' },
  { bg: '#fafaf9', text: '#44403c' },
];

const FONTS = ["'Noto Serif SC', serif"];

const WaggingCat = ({ scale = 1 }: { scale?: number }) => (
  <div className="cat-container" style={{ transform: `translate(-50%, -55%) scale(${scale})` }}>
    <div className="cat-body">
      <div className="cat-head"><div className="cat-ear left"></div><div className="cat-ear right"></div></div>
      <div className="cat-tail"></div>
    </div>
  </div>
);

const QueueOverlay = ({ isVisible }: { isVisible: boolean }) => {
  const [stageIndex, setStageIndex] = useState(0);
  const stages = ["正在解构语料库...", "平衡长短节奏...", "执行重构拼贴...", "纸片降落中..."];
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => setStageIndex(s => (s + 1) % stages.length), 800);
    return () => clearInterval(interval);
  }, [isVisible]);
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#f4f1ea]/80 backdrop-blur-sm">
      <div className="text-center space-y-6 transform -rotate-1">
        <div className="relative h-20 mb-8"><WaggingCat scale={0.6} /></div>
        <p className="font-serif-sc font-black text-sm tracking-[0.5em] text-gray-800 animate-pulse uppercase">
          {stages[stageIndex]}
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPoem, setCurrentPoem] = useState<CollagePoem | null>(null);
  const [activeVariant, setActiveVariant] = useState<PoemVariant>('4-lines');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualLines, setManualLines] = useState<string[][]>([[]]);
  const [currentActiveLine, setCurrentActiveLine] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mosaic_muse_entries');
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  const createFrag = (text: string): PoeticFragment => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      id: Math.random().toString(36).substr(2, 9),
      text,
      style: {
        backgroundColor: color.bg,
        textColor: color.text,
        rotation: (Math.random() - 0.5) * 12,
        fontSize: '1rem',
        padding: '4px 8px'
      }
    };
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const response = await extractPoeticFragments(inputText);
      const pool = Array.from(new Set([...response.fourLines.flat(), ...response.eightLines.flat()]));
      const poem: CollagePoem = {
        id: Date.now().toString(),
        title: "拼贴诗",
        variantLines: {
          '4-lines': response.fourLines.map(line => line.map(createFrag)),
          '8-lines': response.eightLines.map(line => line.map(createFrag)),
        },
        timestamp: new Date(selectedDate).getTime(),
        background: '#ffffff',
        fontFamily: FONTS[0],
        rawPool: pool
      };
      setCurrentPoem(poem);
      setActiveVariant('4-lines');
      setIsManualMode(false);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, { pixelRatio: 3, quality: 1 });
      const link = document.createElement('a');
      link.download = `mosaic-${selectedDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error('Download failed', err); }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-gray-800 font-serif-sc pb-32 pt-16">
      <QueueOverlay isVisible={loading} />
      
      <div className="max-w-xl mx-auto px-6 space-y-16">
        {/* Header - 还原第一版的艺术感 */}
        <header className="relative w-full h-32 flex flex-col items-center justify-center">
          <WaggingCat />
          <h1 className="text-6xl font-black tracking-tighter opacity-[0.05] absolute pointer-events-none uppercase italic">MOSAIC MUSE</h1>
          <span className="text-xl font-light text-black tracking-[0.5em] z-10">今天的拼贴诗</span>
        </header>

        {/* Input Area */}
        {!currentPoem && (
          <div className="space-y-8 animate-in fade-in duration-1000">
            <div className="bg-white/40 p-10 rounded-sm border-l border-black/5 shadow-sm backdrop-blur-md">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="在此刻的河流中，打捞一些碎小的语义..."
                className="w-full h-64 bg-transparent border-none focus:ring-0 text-xl leading-relaxed resize-none placeholder:text-gray-300 font-light"
              />
            </div>
            <div className="flex flex-col items-center gap-6">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-bold tracking-widest uppercase focus:ring-0 cursor-pointer text-black/40" />
              <button onClick={handleGenerate} disabled={loading || !inputText.trim()}
                className="bg-black text-white px-16 py-5 text-xs font-black tracking-[0.3em] hover:bg-gray-800 transition-all shadow-2xl active:scale-95">
                开始拼贴
              </button>
            </div>
          </div>
        )}

        {/* Result Area */}
        {currentPoem && (
          <div className="space-y-12 animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
            {/* Mode Switcher */}
            {!isManualMode && (
              <div className="bg-gray-200/30 p-1 rounded-full flex gap-1 shadow-inner backdrop-blur-sm">
                {(['4-lines', '8-lines', 'image-only', 'manual'] as PoemVariant[]).map((v) => {
                  if (v === 'manual' && !currentPoem?.variantLines.manual) return null;
                  return (
                    <button key={v} onClick={() => setActiveVariant(v)}
                      className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${activeVariant === v ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
                      {v === '4-lines' ? '四行' : v === '8-lines' ? '八行' : v === 'image-only' ? '无字' : '我的'}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Canvas Container */}
            <div className="relative w-full max-w-sm">
              {!isManualMode ? (
                <>
                  <CollageCanvas poem={currentPoem} variant={activeVariant} innerRef={canvasRef} />
                  {activeVariant === 'image-only' && (
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                      <button 
                        onClick={() => { setIsManualMode(true); setManualLines([[]]); }}
                        className="px-8 py-4 bg-black text-white text-[10px] font-black tracking-[0.3em] uppercase rounded-full hover:scale-110 transition-all shadow-2xl animate-bounce"
                      >
                        亲手拼贴这一刻？
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full aspect-[3/4.5] bg-white shadow-2xl rounded-sm border-[16px] border-white p-6 flex flex-col gap-8 overflow-y-auto">
                   <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-gray-300 text-center">创作画布</h3>
                   {manualLines.map((line, lIdx) => (
                     <div key={lIdx} onClick={() => setCurrentActiveLine(lIdx)}
                       className={`min-h-[40px] p-2 flex flex-wrap gap-2 border-b border-dashed transition-all ${currentActiveLine === lIdx ? 'border-black bg-gray-50' : 'border-gray-100'}`}>
                       {line.map((frag, fIdx) => (
                         <span key={fIdx} className="bg-black text-white px-3 py-1 text-xs rounded-sm cursor-crosshair" onClick={() => { const n = [...manualLines]; n[lIdx].splice(fIdx, 1); setManualLines(n); }}>{frag}</span>
                       ))}
                       {line.length === 0 && <span className="text-[10px] text-gray-300 italic">点击此行添加碎片</span>}
                     </div>
                   ))}
                   <button onClick={() => setManualLines([...manualLines, []])} className="text-[9px] uppercase font-black text-gray-400 py-3 border border-dashed border-gray-200">+ 新增一行</button>
                </div>
              )}
            </div>

            {/* Manual Mode Selection Pool */}
            {isManualMode && (
              <div className="w-full bg-white/40 p-6 rounded-sm space-y-4">
                <p className="text-[9px] font-black tracking-widest text-gray-400 uppercase text-center">语料库抽取自你的文字</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentPoem.rawPool?.map((text, idx) => (
                    <button key={idx} onClick={() => { const n = [...manualLines]; n[currentActiveLine] = [...n[currentActiveLine], text]; setManualLines(n); }}
                      className="bg-white px-3 py-2 text-xs border border-gray-100 hover:border-black transition-all shadow-sm">{text}</button>
                  ))}
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={() => setIsManualMode(false)} className="flex-1 py-4 text-[10px] font-black tracking-widest uppercase border border-black">取消</button>
                  <button onClick={() => {
                    const final = manualLines.filter(l => l.length > 0).map(line => line.map(createFrag));
                    setCurrentPoem({...currentPoem, variantLines: {...currentPoem.variantLines, manual: final}});
                    setActiveVariant('manual');
                    setIsManualMode(false);
                  }} className="flex-1 py-4 text-[10px] font-black tracking-widest uppercase bg-black text-white shadow-xl">完成</button>
                </div>
              </div>
            )}

            {/* Actions */}
            {!isManualMode && (
              <div className="flex flex-col items-center gap-8 w-full">
                <button onClick={downloadImage} className="w-full py-5 bg-black text-white font-black text-xs tracking-[0.4em] uppercase shadow-2xl hover:bg-gray-900 transition-all flex items-center justify-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  保存这份拼贴
                </button>
                <button onClick={() => { setCurrentPoem(null); setInputText(''); }} className="text-[10px] font-black tracking-widest uppercase text-black/30 hover:text-black transition-colors underline decoration-black/10 underline-offset-8">
                  重写一段今日文字
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="fixed bottom-8 left-0 right-0 text-center pointer-events-none opacity-20">
        <p className="text-[9px] font-black tracking-[0.5em] uppercase">Built with Poetic Deconstruction</p>
      </footer>
    </div>
  );
};

export default App;
