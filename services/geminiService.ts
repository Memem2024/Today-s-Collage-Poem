
import { GoogleGenAI, Type } from "@google/genai";

export interface PoeticResponse {
  fourLines: string[][]; 
  eightLines: string[][];
}

export const fallbackExtract = (text: string): PoeticResponse => {
  console.warn("Using fallback poetic fragments.");
  return {
    fourLines: [
      ["此刻", "情绪", "拼贴"],
      ["平静", "之下"],
      ["无声", "力量"],
      ["推行", "时光"]
    ],
    eightLines: [
      ["缓慢", "流动"],
      ["表面", "平静"],
      ["水底", "无声"],
      ["力量", "推行"],
      ["时光", "悄然"],
      ["留白", "此刻"],
      ["呼吸", "碎片"],
      ["思绪", "成河"]
    ]
  };
};

export const extractPoeticFragments = async (text: string): Promise<PoeticResponse> => {
  try {
    // 初始化 AI 客户端
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // 使用 gemini-flash-lite-latest 模型，它通常具有更高的免费层级配额
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `你是一个极具解构精神的拼贴诗人。请对用户文本进行“语料库式”的深度拆解。

From the user’s input text, first construct a corpus of unique Chinese word/phrase fragments, ignoring original order. Fragment length distribution must follow:
– 2, 3, and 4 characters should be balanced and form the main corpus.
– 5- and 6-character fragments are extremely rare and may appear at most 1–3 times each in the entire output.

Using this corpus, generate two collage poems: one with 4 lines, one with 8 lines.

Rules:
– In the 8-line poem, at least one line must be an extremely short line (3–4 Chinese characters or 1–2 words).
– Absolute defamiliarization: no line may follow the original text order, and adjacent lines must not preserve continuity from the source.
– Output format must be a 2D array: each line is an array of strings.
– Per line constraints:
• Max 4 fragments per line
• Max 12 Chinese characters per line
• Max 2 fragments of exactly 2 characters per line
– If fragment count causes a line to exceed 12 characters, reduce the number of fragments to 3 or 2, rather than shortening fragments.

Priority when conflicts occur (highest → lowest):
- Output format correctness
- <12 chinese characters per line
- ≤2 two-character fragments per line
- ≤4 fragments per line
- Rhythm variation and rarity constraints

用户素材：${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fourLines: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } },
            eightLines: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
          },
          required: ["fourLines", "eightLines"]
        },
        // Lite 模型不需要庞大的思维链预算，设为 0 以提高响应速度
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    const data = JSON.parse(response.text || '{}');
    const validate = (lines: any[][]) => {
      if (!Array.isArray(lines)) return [];
      return lines.map(line => {
        if (!Array.isArray(line)) return [];
        return line.map(frag => String(frag).trim()).filter(s => s.length > 0);
      });
    };

    return {
      fourLines: validate(data.fourLines).slice(0, 4),
      eightLines: validate(data.eightLines).slice(0, 8)
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    // 如果 API 依然报错（如完全超出每日总量），则进入 fallback 模式，保证 UI 不崩溃
    return fallbackExtract(text);
  }
};
