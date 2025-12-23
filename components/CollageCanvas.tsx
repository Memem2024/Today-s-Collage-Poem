
import React from 'react';
import { CollagePoem, PoemVariant } from '../types';

interface CollageCanvasProps {
  poem: CollagePoem;
  variant: PoemVariant;
  innerRef: React.Ref<HTMLDivElement>;
}

const SquareDateBlock = ({ date }: { date: Date }) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1) + '月';
  
  return (
    <div className="flex flex-col items-start select-none">
      <div className="bg-black text-white px-2 py-0.5 text-sm font-black leading-none">
        {day}
      </div>
      <div className="bg-gray-50 text-gray-400 px-1 py-0.5 text-[8px] font-bold leading-none border-x border-b border-gray-100 uppercase">
        {month}
      </div>
    </div>
  );
};

export const CollageCanvas: React.FC<CollageCanvasProps> = ({ poem, variant, innerRef }) => {
  const currentLines = variant === 'manual' 
    ? (poem.variantLines.manual || []) 
    : (variant !== 'image-only' ? poem.variantLines[variant as '4-lines' | '8-lines'] : []);
  
  const dateObj = new Date(poem.timestamp);
  const formattedDate = `${dateObj.getFullYear()}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
  
  // 动态决定行间距
  const lineGapClass = currentLines.length > 5 ? 'gap-3' : 'gap-12';

  // 应用用户要求的精确偏移
  const offsetStyle = {
    transform: variant === '4-lines' 
      ? 'translate(5px, -10px)' 
      : variant === '8-lines' 
        ? 'translateX(5px)' 
        : 'none'
  };

  return (
    <div 
      ref={innerRef}
      className="relative w-full aspect-[3/4.5] max-w-sm mx-auto bg-white shadow-2xl overflow-hidden border-[16px] border-white flex flex-col transition-all duration-500 select-none"
    >
      <div className="absolute top-4 left-4 z-40">
        <SquareDateBlock date={dateObj} />
      </div>

      <div className="absolute inset-0 opacity-[0.1] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] z-30"></div>
      
      <div 
        className={`relative flex flex-col items-center z-20 transition-all duration-700 px-4 flex-grow
          ${currentLines.length > 4 ? 'pt-20 pb-12 justify-center' : 'pt-28 pb-12 justify-start'} 
          ${variant === 'image-only' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        <div 
          className={`w-full flex flex-col items-center transition-all duration-700 ${lineGapClass}`}
          style={offsetStyle}
        >
          {currentLines.map((line, lineIdx) => (
            <div key={lineIdx} className="flex flex-nowrap justify-center items-center gap-[6px] w-full overflow-visible">
              {line.map((frag) => (
                <div
                  key={frag.id}
                  className="inline-block shadow-[1px_2px_4px_rgba(0,0,0,0.1)] transform-gpu whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: frag.style.backgroundColor,
                    color: frag.style.textColor,
                    fontFamily: poem.fontFamily,
                    fontWeight: 700,
                    transform: `rotate(${frag.style.rotation}deg)`,
                    fontSize: currentLines.length > 5 ? '0.85rem' : '1.05rem', 
                    padding: currentLines.length > 5 ? '3px 8px' : '6px 14px',
                    border: '0.5px solid rgba(0,0,0,0.05)',
                    lineHeight: 1.1,
                    borderRadius: '1px'
                  }}
                >
                  {frag.text}
                </div>
              ))}
              <div className="bg-white px-1.5 py-1 shadow-sm text-black/10 font-black rotate-2 text-[10px] ml-1 shrink-0 border border-black/5">
                {lineIdx === currentLines.length - 1 ? "。" : "，"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-20 h-32 w-full px-8 pb-8 flex flex-col justify-end">
        <div className="flex items-end justify-between w-full">
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-gray-300 font-serif-sc tracking-widest">本日切片</span>
            <span className="text-[10px] text-gray-300 font-serif-sc tracking-wider">{formattedDate}</span>
          </div>
          <div className="h-10 w-[1px] bg-blue-50/50 mx-auto"></div>
          <div className="text-[10px] text-gray-300 font-serif-sc tracking-[0.4em] uppercase">
            MOSAIC MUSE
          </div>
        </div>
      </div>
    </div>
  );
};
