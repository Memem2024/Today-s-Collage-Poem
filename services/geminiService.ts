
import { GoogleGenAI, Type } from "@google/genai";

export interface PoeticResponse {
  fourLines: string[][];
  eightLines: string[][];
}


export const extractPoeticFragments = async (text: string): Promise<PoeticResponse> => {
  // Vite 在构建时会将 process.env.API_KEY 替换为具体的字符串
  const apiKey = process.env.API_KEY;

  // 如果替换后的结果为空，或者依然是占位符，则降级
  if (!apiKey || apiKey === "") {
    console.error("API Key is missing in the production build.");

  }

  try {
    const ai = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
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
    console.error("AI Generation error:", error);
  }
};
