
export interface PoeticFragment {
  id: string;
  text: string;
  style: FragmentStyle;
}

export interface FragmentStyle {
  backgroundColor: string;
  textColor: string;
  rotation: number;
  fontSize: string;
  padding: string;
}

export type PoemVariant = '4-lines' | '8-lines' | 'image-only' | 'manual';

export interface CollagePoem {
  id: string;
  title: string;
  variantLines: {
    '4-lines': PoeticFragment[][];
    '8-lines': PoeticFragment[][];
    'manual'?: PoeticFragment[][];
  };
  timestamp: number;
  background: string;
  fontFamily: string;
  rawPool?: string[]; // 存储AI提取的原始语料池
}

export interface DailyEntry {
  date: string; 
  content: string;
}
