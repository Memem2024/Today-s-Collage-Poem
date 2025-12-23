
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface PoeticResponse {
  fourLines: string[];
  eightLines: string[];
}

// 预设的兜底意境图（由 Unsplash 提供的高清、极简、扁平/意境风格图）
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?q=80&w=800&auto=format&fit=crop", // 湖泊山脉
  "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=800&auto=format&fit=crop", // 极简植物
  "https://images.unsplash.com/photo-1502481851512-e9e2529bbbf9?q=80&w=800&auto=format&fit=crop", // 禅意石头
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop", // 几何抽象
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop", // 远山意象
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop", // 极简沙滩
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=800&auto=format&fit=crop", // 恬静田野
  "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=800&auto=format&fit=crop", // 晨雾森林
];

export const extractPoeticFragments = async (text: string): Promise<PoeticResponse> => {
  const ai = getAI();
  const isShortInput = text.trim().length < 50;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `你是一个深思熟虑、擅长留白与意象捕捉的诗人。请从以下文字中创作两组完全不同的“拼贴诗”切片。

    提取要求：
    1. 结构：返回两组。第一组用于“四行诗”，包含 8-10 个短语；第二组用于“八行诗”，包含 12-16 个短语。
    2. 词长平衡：每组必须包含 2、3、4、5、6 字的短语。
    3. 拆词逻辑：${isShortInput ? '由于输入内容较少，允许通过拆词来补足短语数量。' : '输入内容充足，严禁进行任何拆词组合。每个短语必须是完整的、不重叠的独立意象。'}
    4. 严禁重复：两组之间及组内短语内容不得重复。
    5. 返回格式：必须返回一个包含 "fourLines" 和 "eightLines" 两个键的 JSON 对象。

    文字内容：
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fourLines: { type: Type.ARRAY, items: { type: Type.STRING } },
          eightLines: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["fourLines", "eightLines"]
      },
    },
  });

  try {
    const data = JSON.parse(response.text || '{"fourLines":[], "eightLines":[]}');
    const clean = (arr: string[]) => Array.from(new Set(arr)).map(s => s.trim()).filter(s => s.length >= 2);
    return {
      fourLines: clean(data.fourLines).slice(0, 10),
      eightLines: clean(data.eightLines).slice(0, 16)
    };
  } catch (error) {
    return { fourLines: [], eightLines: [] };
  }
};

export const generatePoemImage = async (poemText: string): Promise<string> => {
  const getRandomFallback = () => FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
  const ai = getAI();

  try {
    // 第一阶段：提取核心名词，绝对过滤掉敏感意象
    const keywordRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract exactly TWO neutral, concrete nouns from the text that represent nature or objects.
      Output format: "Noun1, Noun2" (in English).
      Strictly avoid: emotions, violence, bodies, or people.
      Text: ${poemText.substring(0, 100)}`
    });

    const keywords = keywordRes.text?.trim().replace(/[^a-zA-Z, ]/g, "") || "Minimalist, Nature";

    // 第二阶段：使用强制性的扁平化安全提示词
    const safePrompt = `A draw illustration of ${keywords}, hand-printed textures, colored pencil strokes, a beige background,  flat design, soft and harmonious color palette, aesthetic white space, calm atmosphere, simplified geometric shapes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: safePrompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
    }
  } catch (error) {
    console.warn("AI generation failed, applying atmospheric fallback.");
  }

  // 第三阶段：如果所有生成逻辑失败，返回随机兜底图
  return getRandomFallback();
};
