
import { GoogleGenAI, Type } from "@google/genai";

// 辅助函数：判断是否在浏览器环境并安全获取 Key
const getApiKey = () => {
  const key = process.env.API_KEY || '';
  if (!key) console.warn("MOSAIC MUSE: API_KEY is not defined in environment variables.");
  return key;
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

export interface PoeticResponse {
  fourLines: string[];
  eightLines: string[];
}

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1586075010633-2442dcad1afc?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1596230502181-aa954608c005?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544733306-056580f1a26d?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1604147708224-5012193d9fb5?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515344831627-2c968f9b9f7a?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop",
];

/**
 * 核心本地降级算法：即便是完全没有网络或 API 挂了，也能根据原文生成美观的拼贴
 */
const fallbackExtract = (text: string): PoeticResponse => {
  // 按照标点和空格切分，并过滤掉太短的词
  const segments = text.split(/[，。！？\n\s,.;!]/).filter(s => s.trim().length >= 2);
  
  // 如果输入太少，强制生成一些意象词补充
  const baseSegments = segments.length > 5 ? segments : [...segments, "此刻", "呼吸", "留白", "光影", "碎片"];
  
  const shuffle = (arr: string[]) => [...arr].sort(() => Math.random() - 0.5);
  
  return {
    fourLines: shuffle(baseSegments).slice(0, 10),
    eightLines: shuffle(baseSegments).slice(0, 16)
  };
};

export const extractPoeticFragments = async (text: string): Promise<PoeticResponse> => {
  const key = getApiKey();
  if (!key) return fallbackExtract(text);

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一个深邃的诗人。从下面这段话里提取两组用于拼贴诗的短语：
      1. fourLines: 8-10个短语。
      2. eightLines: 12-16个短语。
      必须以 JSON 格式返回。
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

    const data = JSON.parse(response.text || '{}');
    const clean = (arr: any) => Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(s => s.length >= 2) : [];
    
    const result = {
      fourLines: clean(data.fourLines),
      eightLines: clean(data.eightLines)
    };

    if (result.fourLines.length < 2) throw new Error("AI output too sparse");
    return result;
  } catch (error) {
    console.error("AI Text Extraction Failed (likely Rate Limit or Safety Filter). Using fallback.", error);
    return fallbackExtract(text);
  }
};

export const generatePoemImage = async (poemText: string): Promise<string> => {
  const getRandomFallback = () => FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
  const key = getApiKey();
  if (!key) return getRandomFallback();

  try {
    const ai = getAI();
    // 提取极其简单的名词，避免任何安全拦截
    const keywordRes = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract only TWO simple English nouns from this: "${poemText.substring(0, 30)}". Return format: "Noun, Noun".`
    });
    const keywords = keywordRes.text?.trim().replace(/[^a-zA-Z, ]/g, "") || "Shapes, Nature";

    const artisticPrompt = `Minimalist flat illustration of ${keywords}, Bauhaus inspired, Morandi color palette, grainy paper texture, warm beige background, high quality.`;

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
    console.warn("AI Image Generation Failed. Using fallback aesthetic image.", error);
  }

  return getRandomFallback();
};
