
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

export type PoemVariant = '4-lines' | '8-lines' | 'image-only';

export interface CollagePoem {
  id: string;
  title: string;
  variantLines: {
    '4-lines': PoeticFragment[][];
    '8-lines': PoeticFragment[][];
  };
  timestamp: number;
  background: string;
  fontFamily: string;
  imageUrl?: string;
}

export interface DailyEntry {
  date: string; // YYYY-MM-DD
  content: string;
}
