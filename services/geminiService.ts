
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

【第一步：构建语料库】
从用户文本中提取不重复的碎片，必须严格遵守以下长度分布规则：
- 2字、3字、4字：这三种长度的碎片数量要大致均衡。
- 5字、6字：在整篇拼贴中极度稀缺，各仅限出现 1-2 次。

【第二步：执行拼贴】
利用上述语料库构建 4 行和 8 行的诗。

【核心规则】
1. 【节奏变化】：在 8 行诗版本中，必须至少包含一行总字数在 3-4汉字/1-2词之间的“极短句”。
2. 【绝对陌生化】：严禁按照原文语序排列。
3. 【格式】：返回格式中，每一行必须是一个字符串数组。
4. 【句子构成】每行两字词语不得超过两个，每行句子中文字数不超过12个，每行/每句拼贴诗词碎片数不超过4个。

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
