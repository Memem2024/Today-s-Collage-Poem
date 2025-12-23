
import React from 'react';
import { CollagePoem, PoemVariant } from '../types';

interface CollageCanvasProps {
  poem: CollagePoem;
  variant: PoemVariant;
  innerRef: React.Ref<HTMLDivElement>;
  onImageLoad?: () => void; // 新增：图片加载完成的回调
}

const PunctuationFragment = ({ char }: { char: string }) => (
  <div
    className="inline-block shadow-[1px_1px_3px_rgba(0,0,0,0.06)] transform-gpu bg-white text-gray-400 font-serif-sc font-black"
    style={{
      transform: `rotate(${(Math.random() - 0.5) * 2}deg)`,
      fontSize: '0.85rem',
      padding: '2px 7px',
      border: '1px solid rgba(0,0,0,0.05)',
      marginLeft: '4px'
    }}
  >
    {char}
  </div>
);

export const CollageCanvas: React.FC<CollageCanvasProps> = ({ poem, variant, innerRef, onImageLoad }) => {
  const rawLines = variant !== 'image-only' ? poem.variantLines[variant] : [];
  const maxLinesAllowed = variant === '4-lines' ? 4 : variant === '8-lines' ? 8 : 0;
  const currentLines = rawLines.slice(0, maxLinesAllowed);

  const dateObj = new Date(poem.timestamp);
  const isEightLines = variant === '8-lines';

  // 处理图片加载完成
  const handleImgLoad = () => {
    if (onImageLoad) onImageLoad();
  };

  return (
    <div
      ref={innerRef}
      className="relative w-full aspect-[3/4] max-w-sm mx-auto bg-[#f8f5f0] shadow-2xl overflow-hidden border-[12px] border-white flex flex-col transition-all duration-500"
    >
      {/* 纸张纹理叠加 */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')] z-30"></div>

      {/* 日期标签 */}
      <div className="absolute top-4 left-4 z-40 flex flex-col items-start font-serif-sc">
        <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-black leading-none mb-0.5 shadow-sm">
          {dateObj.getDate().toString().padStart(2, '0')}
        </div>
        <div className="bg-gray-100/80 backdrop-blur-sm text-gray-500 px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-widest leading-none shadow-sm">
          {dateObj.toLocaleString('default', { month: 'short' })}
        </div>
      </div>

      {/* 拼贴文字区域 */}
      <div className={`relative flex flex-col items-center justify-center z-20 transition-all duration-500 ${isEightLines ? 'h-full pt-16 pb-12' : 'h-1/2 pt-14 pb-4'} px-6 ${variant === 'image-only' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className={`w-full flex flex-col items-center transform translate-x-1 ${isEightLines ? 'gap-2.5' : 'gap-4'}`}>
          {currentLines.map((line, lineIdx) => (
            <div key={lineIdx} className="flex flex-wrap justify-center items-center gap-2.5 w-full">
              {line.map((frag) => (
                <div
                  key={frag.id}
                  className="inline-block shadow-[1px_2px_4px_rgba(0,0,0,0.06)] transform-gpu"
                  style={{
                    backgroundColor: frag.style.backgroundColor,
                    color: frag.style.textColor,
                    fontFamily: poem.fontFamily,
                    fontWeight: 700,
                    transform: `rotate(${frag.style.rotation}deg)`,
                    fontSize: isEightLines ? '0.81rem' : `calc(${frag.style.fontSize} * 0.95)`,
                    padding: isEightLines ? '3px 6px' : '4px 8px',
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  {frag.text}
                </div>
              ))}
              <PunctuationFragment char={lineIdx === currentLines.length - 1 ? "。" : "，"} />
            </div>
          ))}
        </div>
      </div>

      {/* 艺术底图区域 */}
      <div className={`relative z-10 flex flex-col transition-all duration-500 ${variant === 'image-only' ? 'h-full' : isEightLines ? 'h-0 opacity-0 overflow-hidden' : 'h-1/2'}`}>
        <div className={`flex-1 w-full overflow-hidden px-5 transition-all duration-500 ${variant === 'image-only' ? 'py-10' : 'pb-4'}`}>
          <div className="w-full h-full rounded-sm shadow-sm border border-gray-100/50 overflow-hidden bg-[#fafaf7]">
            {poem.imageUrl ? (
              <img
                src={poem.imageUrl}
                alt="AI Art"
                onLoad={handleImgLoad} // 监听图片加载
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                 <span className="text-[10px] text-gray-200 font-serif-sc tracking-widest uppercase">Atmosphere</span>
              </div>
            )}
          </div>
        </div>

        {/* 页脚信息 */}
        <div className="px-6 pb-4 flex justify-between items-end opacity-30 font-serif-sc text-[8px] uppercase tracking-widest">
          <div className="flex flex-col">
            <span className="font-bold">{poem.title}</span>
            <span>{dateObj.toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="text-right">
            <span>MOSAIC MUSE</span>
          </div>
        </div>
      </div>

      {isEightLines && (
        <div className="absolute bottom-4 left-0 w-full px-6 flex justify-between items-end opacity-30 font-serif-sc text-[8px] uppercase tracking-widest z-40">
          <div className="flex flex-col">
            <span className="font-bold">{poem.title}</span>
            <span>{dateObj.toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="text-right">
            <span>MOSAIC MUSE</span>
          </div>
        </div>
      )}
    </div>
  );
};
