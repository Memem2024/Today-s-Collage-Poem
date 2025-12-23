
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface PoeticResponse {
  fourLines: string[];
  eightLines: string[];
}

/**
 * 经过筛选的、符合“米色底、极简、艺术感”要求的兜底图库
 */
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1586075010633-2442dcad1afc?q=80&w=800&auto=format&fit=crop", // 米色艺术纸张
  "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop", // 柔和莫兰迪抽象
  "https://images.unsplash.com/photo-1596230502181-aa954608c005?q=80&w=800&auto=format&fit=crop", // 极简线条
  "https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=800&auto=format&fit=crop", // 抽象色块
  "https://images.unsplash.com/photo-1544733306-056580f1a26d?q=80&w=800&auto=format&fit=crop", // 暖色影调
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop", // 几何扁平
  "https://images.unsplash.com/photo-1604147708224-5012193d9fb5?q=80&w=800&auto=format&fit=crop", // 粗粝质感纸
  "https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?q=80&w=800&auto=format&fit=crop", // 极简波纹
  "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=800&auto=format&fit=crop", // 温暖留白
  "https://images.unsplash.com/photo-1515344831627-2c968f9b9f7a?q=80&w=800&auto=format&fit=crop", // 极简构图
  "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=800&auto=format&fit=crop", // 扁平植物
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop", // 极简沙滩纹理
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=800&auto=format&fit=crop", // 抽象田野
  "https://images.unsplash.com/photo-1502481851512-e9e2529bbbf9?q=80&w=800&auto=format&fit=crop", // 禅意石头
  "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=800&auto=format&fit=crop", // 晨雾
];

export const extractPoeticFragments = async (text: string): Promise<PoeticResponse> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `你是一个擅长意象捕捉的诗人。从这段话中提取两组“拼贴诗”切片。
    1. fourLines: 8-10个短语。
    2. eightLines: 12-16个短语。
    返回格式：JSON 对象。
    内容：${text}`,
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
    return {
      fourLines: data.fourLines.map((s: string) => s.trim()).filter((s: string) => s.length >= 2),
      eightLines: data.eightLines.map((s: string) => s.trim()).filter((s: string) => s.length >= 2)
    };
  } catch (error) {
    return { fourLines: [], eightLines: [] };
  }
};

export const generatePoemImage = async (poemText: string): Promise<string> => {
  const getRandomFallback = () => FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
  const ai = getAI();

  try {
    // 步骤1：先提取安全关键词，避免诗句中的敏感词触发拦截
    const keywordRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract exactly TWO concrete, neutral nouns from this text. Output ONLY "Noun1, Noun2" in English. Avoid abstract emotions.
      Text: ${poemText.substring(0, 100)}`
    });

    const keywords = keywordRes.text?.trim().replace(/[^a-zA-Z, ]/g, "") || "Minimalist, Nature";

    // 步骤2：使用强化的艺术风格提示语
    const artisticPrompt = `Minimalist flat illustration of ${keywords}, Bauhaus inspired, Morandi color palette (dusty rose, sage green, muted blue), clean simplified vector art, centered composition, soft grainy paper texture, warm beige background, aesthetic negative space, high quality, peaceful zen mood.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: artisticPrompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (error) {
    console.warn("AI generation error, using artistic fallback.");
  }

  // 兜底策略：始终返回一张高质量米色调图
  return getRandomFallback();
};
