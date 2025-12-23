
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => process.env.API_KEY || '';
const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

export interface PoeticResponse {
  fourLines: string[][]; 
  eightLines: string[][];
}

export const fallbackExtract = (text: string): PoeticResponse => {
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
  const key = getApiKey();
  if (!key) return fallbackExtract(text);

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一个极具解构精神的拼贴诗人。请对用户文本进行“语料库式”的深度拆解。

【第一步：构建语料库】
从用户文本中提取不重复的碎片，必须严格遵守以下长度分布规则：
- 2字、3字、4字：这三种长度的碎片数量要大致均衡，严禁大量堆砌2字词。
- 5字、6字：在整篇拼贴中，5字和6字长的纸条极度稀缺，各仅限出现 1-2 次。
- 碎片必须是完整的意象或语义块，严禁生硬切分导致词义全失。

【第二步：执行拼贴】
利用上述语料库构建 4 行和 8 行的诗。

【核心规则】
1. 【节奏变化】：在 8 行诗版本中，必须至少包含一行总字数在 3-4 字之间的“极短句”，用于打破长句的沉闷。
2. 【拼贴节奏】：每行要混合使用不同长度的碎片，创造视觉和朗读上的错落感。
3. 【绝对陌生化】：严禁按照原文语序排列。通过重组创造意外的、甚至有些荒诞的诗意。
4. 【单句规格】：每行总字数 3-13 字，禁止换行。
5. 【主语唯一】：同一行内禁止出现两个重复的代词（如两个“我”）。
6. 【元素独立】：返回格式中，每一行必须是一个包含多个独立碎片的字符串数组。

用户输入的原始素材：${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fourLines: { 
              type: Type.ARRAY, 
              items: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: "由长短错落的碎片组成的4行拼贴诗"
            },
            eightLines: { 
              type: Type.ARRAY, 
              items: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: "由长短错落的碎片组成的8行拼贴诗，至少含有一行极短句"
            }
          },
          required: ["fourLines", "eightLines"]
        },
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
    console.error("AI Collage Generation failed", error);
    return fallbackExtract(text);
  }
};
