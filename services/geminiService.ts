
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
    // 严格按照 Gemini SDK 指令初始化
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一个极具解构精神的拼贴诗人。请对用户文本进行“语料库式”的深度拆解。

【第一步：构建语料库】
从用户文本中提取不重复的碎片，必须严格遵守以下长度分布规则：
- 2字、3字、4字：这三种长度的碎片数量要大致均衡。
- 5字、6字：在整篇拼贴中极度稀缺，各仅限出现 1-2 次。

【第二步：执行拼贴】
利用上述语料库构建 4 行和 8 行的诗。

【核心规则】
1. 【节奏变化】：在 8 行诗版本中，必须至少包含一行总字数在 3-4 字之间的“极短句”。
2. 【绝对陌生化】：严禁按照原文语序排列。
3. 【格式】：返回格式中，每一行必须是一个字符串数组。

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
    return fallbackExtract(text);
  }
};
