
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { extractPoeticFragments, fallbackExtract } from './services/geminiService';
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

const GENERATION_STAGES = ["解构语料库...", "平衡长短节奏...", "执行重构拼贴...", "纸片降落中..."];

const QueueOverlay = ({ isVisible }: { isVisible: boolean }) => {
  const [stageIndex, setStageIndex] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => setStageIndex(s => (s + 1) % GENERATION_STAGES.length), 800);
    return () => clearInterval(interval);
  }, [isVisible]);
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
      <div className="bg-white p-10 shadow-2xl border border-gray-50 text-center space-y-4 transform -rotate-1">
        <div className="relative h-8 mb-6"><WaggingCat scale={0.4} /></div>
        <p className="font-serif-sc font-black text-xs tracking-widest text-gray-800 animate-pulse uppercase">
          {GENERATION_STAGES[stageIndex]}
        </p>
        <div className="flex justify-center gap-1">
           {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-black rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
        </div>
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

  const mapToFragments = (rawLines: string[][]): PoeticFragment[][] => {
    return rawLines.map(line => line.map(text => createFrag(text)));
  };

  const createFrag = (text: string) => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      id: Math.random().toString(36).substr(2, 9),
      text,
      style: {
        backgroundColor: color.bg,
        textColor: color.text,
        rotation: (Math.random() - 0.5) * 10,
        fontSize: '1rem',
        padding: '4px 8px'
      }
    };
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    const minWait = new Promise(r => setTimeout(r, 1600));

    try {
      const [response] = await Promise.all([extractPoeticFragments(inputText), minWait]);
      
      // 合并所有提取的词作为语料池
      const pool = Array.from(new Set([
        ...response.fourLines.flat(),
        ...response.eightLines.flat()
      ]));

      const poem: CollagePoem = {
        id: Date.now().toString(),
        title: "拼贴诗",
        variantLines: {
          '4-lines': mapToFragments(response.fourLines),
          '8-lines': mapToFragments(response.eightLines),
        },
        timestamp: new Date(selectedDate).getTime(),
        background: '#ffffff',
        fontFamily: FONTS[0],
        rawPool: pool
      };
      setCurrentPoem(poem);
      setIsManualMode(false);
    } catch (err) {
      const fallback = fallbackExtract(inputText);
      setCurrentPoem({
        id: Date.now().toString(),
        title: "此时此刻",
        variantLines: {
          '4-lines': mapToFragments(fallback.fourLines),
          '8-lines': mapToFragments(fallback.eightLines),
        },
        timestamp: new Date(selectedDate).getTime(),
        background: '#ffffff',
        fontFamily: FONTS[0],
        rawPool: fallback.eightLines.flat()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = () => {
    if (!currentPoem) return;
    const finalLines = manualLines.filter(line => line.length > 0);
    if (finalLines.length === 0) return;

    const manualFragments = finalLines.map(line => line.map(text => createFrag(text)));
    
    setCurrentPoem({
      ...currentPoem,
      variantLines: {
        ...currentPoem.variantLines,
        manual: manualFragments
      }
    });
    setActiveVariant('manual');
    setIsManualMode(false);
  };

  const addFragmentToManual = (text: string) => {
    const newLines = [...manualLines];
    newLines[currentActiveLine] = [...newLines[currentActiveLine], text];
    setManualLines(newLines);
  };

  const removeFragmentFromManual = (lineIdx: number, fragIdx: number) => {
    const newLines = [...manualLines];
    newLines[lineIdx].splice(fragIdx, 1);
    setManualLines(newLines);
  };

  const addNewLine = () => {
    if (manualLines.length < 8) {
      setManualLines([...manualLines, []]);
      setCurrentActiveLine(manualLines.length);
    }
  };

  const downloadImage = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, { pixelRatio: 3, quality: 1 });
      const link = document.createElement('a');
      link.download = `collage-${selectedDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error('Download failed', err); }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-gray-800 font-serif-sc pb-20 overflow-x-hidden pt-[30px]">
      <QueueOverlay isVisible={loading} />
      <div className="max-w-4xl mx-auto px-6">
        <header className="relative w-full h-[100px] flex flex-col items-center justify-center mb-8">
          <WaggingCat />
          <h1 className="text-5xl font-black tracking-tighter opacity-[0.1] absolute pointer-events-none uppercase select-none">MOSAIC MUSE</h1>
          <span className="text-lg font-light text-black tracking-[0.4em] z-10">今天的拼贴诗</span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div className="bg-white/40 p-7 rounded-sm border-l border-black/5 shadow-sm backdrop-blur-md">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="在此刻的河流中，打捞一些碎小的语义..."
                className="w-full h-80 bg-transparent border-none focus:ring-0 text-lg leading-relaxed resize-none placeholder:text-gray-300 font-light"
              />
            </div>
            <div className="flex gap-6 items-center">
              <button onClick={handleGenerate} disabled={loading || !inputText.trim()}
                className="bg-black text-white px-12 py-4 text-xs font-black tracking-[0.25em] hover:bg-gray-800 transition-all shadow-xl active:scale-95">
                执行拼贴
              </button>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-[10px] font-bold tracking-widest uppercase focus:ring-0 cursor-pointer text-black/40" />
            </div>
          </div>

          <div className="flex flex-col items-center space-y-8">
            <div className="bg-gray-100/50 p-1.5 rounded-2xl flex gap-1 shadow-inner backdrop-blur-sm">
              {(['4-lines', '8-lines', 'image-only', 'manual'] as PoemVariant[]).map((v) => {
                if (v === 'manual' && !currentPoem?.variantLines.manual) return null;
                return (
                  <button 
                    key={v} 
                    onClick={() => { setActiveVariant(v); setIsManualMode(false); }}
                    className={`px-6 py-2 rounded-xl text-[11px] font-black tracking-widest transition-all duration-300 ${
                      activeVariant === v && !isManualMode ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {v === '4-lines' ? '四行版本' : v === '8-lines' ? '八行版本' : v === 'image-only' ? '无字模式' : '我的创作'}
                  </button>
                )
              })}
            </div>

            {currentPoem ? (
              <div className="w-full flex flex-col items-center gap-10">
                {isManualMode ? (
                  /* 手动拼贴界面 */
                  <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-full aspect-[3/4.5] max-w-sm bg-white shadow-xl rounded-sm border-[16px] border-white overflow-y-auto p-4 flex flex-col gap-6">
                       <h3 className="text-[10px] uppercase tracking-widest font-black text-gray-300 text-center mb-4">拼贴画布</h3>
                       {manualLines.map((line, lIdx) => (
                         <div 
                           key={lIdx} 
                           onClick={() => setCurrentActiveLine(lIdx)}
                           className={`min-h-[40px] p-2 flex flex-wrap gap-2 border-b border-dashed transition-colors ${currentActiveLine === lIdx ? 'border-black bg-gray-50' : 'border-gray-100'}`}
                         >
                           {line.map((frag, fIdx) => (
                             <span 
                               key={fIdx} 
                               onClick={(e) => { e.stopPropagation(); removeFragmentFromManual(lIdx, fIdx); }}
                               className="bg-gray-100 px-3 py-1 text-xs rounded-sm cursor-pointer hover:bg-red-50 hover:text-red-500 transition-colors"
                             >
                               {frag}
                             </span>
                           ))}
                           {line.length === 0 && <span className="text-[10px] text-gray-300 italic">空行 (点击激活)</span>}
                         </div>
                       ))}
                       {manualLines.length < 8 && (
                         <button onClick={addNewLine} className="text-[10px] uppercase font-black text-gray-400 py-2 border border-dashed border-gray-200 hover:border-gray-400 transition-all">
                            + 添加新行
                         </button>
                       )}
                    </div>

                    <div className="w-full bg-white/60 p-4 rounded-xl shadow-inner max-h-48 overflow-y-auto">
                      <h4 className="text-[9px] uppercase font-black text-gray-400 mb-3 tracking-widest">语料库片段</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentPoem.rawPool?.map((text, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => addFragmentToManual(text)}
                            className="bg-white px-3 py-1.5 text-xs border border-gray-100 hover:border-black transition-all shadow-sm active:scale-90"
                          >
                            {text}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4 w-full max-w-sm">
                      <button onClick={() => setIsManualMode(false)} className="flex-1 py-4 border border-black text-black text-xs font-black tracking-widest uppercase rounded-xl hover:bg-black hover:text-white transition-all">
                        取消
                      </button>
                      <button onClick={handleManualSave} className="flex-1 py-4 bg-black text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-xl active:scale-95 transition-all">
                        完成拼贴
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CollageCanvas poem={currentPoem} variant={activeVariant} innerRef={canvasRef} />
                    
                    {activeVariant === 'image-only' && (
                      <button 
                        onClick={() => { setIsManualMode(true); setManualLines([[]]); setCurrentActiveLine(0); }}
                        className="px-8 py-3 bg-white border border-black text-black text-[10px] font-black tracking-[0.3em] uppercase rounded-full hover:bg-black hover:text-white transition-all duration-500 animate-pulse shadow-lg"
                      >
                        是否开始手动拼贴？
                      </button>
                    )}

                    <button 
                      onClick={downloadImage} 
                      className="w-full max-w-sm bg-black text-white py-5 rounded-xl font-bold text-sm tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-gray-900 transition-all active:scale-95 shadow-2xl group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      保存此版本
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full aspect-[3/4.5] max-w-sm border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-white/40 rounded-sm">
                <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-gray-300">灵感等待着陆</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
