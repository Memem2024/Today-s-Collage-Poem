
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface PoeticResponse {
  fourLines: string[];
  eightLines: string[];
}

export const extractPoeticFragments = async (text: string): Promise<PoeticResponse> => {
  const ai = getAI();
  const isShortInput = text.trim().length < 50;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `你是一个深思熟虑、擅长留白与意象捕捉的诗人。请从以下文字中创作两组完全不同的“拼贴诗”切片。
    
    提取要求：
    1. 结构：返回两组。第一组用于“四行诗”，包含 8-10 个短语；第二组用于“八行诗”，包含 12-16 个短语。
    2. 词长平衡：每组必须包含 2、3、4、5、6 字的短语。
    3. 拆词逻辑：${isShortInput ? '由于输入内容较少，允许通过拆词（如把“流动的水”拆为“流动的”和“水”）来补足短语数量。' : '输入内容充足，严禁进行任何拆词组合（如同时出现“流动的水之中”和“流动的水”）。每个短语必须是完整的、不重叠的独立意象。'}
    4. 严禁重复：两组之间及组内短语内容不得重复。
    5. 主语多样化：避免在同一组中大量重复相同的主语（如反复出现“我”、“你”、“他”）。尽量提取去主语化的意象。
    6. 禁忌词：严禁提取纯粹的方位词。
    7. 返回格式：必须返回一个包含 "fourLines" 和 "eightLines" 两个键的 JSON 对象。
    
    文字内容：
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fourLines: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          eightLines: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["fourLines", "eightLines"]
      },
    },
  });

  try {
    const data = JSON.parse(response.text || '{"fourLines":[], "eightLines":[]}');
    
    const filterAndClean = (arr: string[]) => {
      let raw = Array.from(new Set(arr))
        .map(s => s.trim())
        .filter(s => s.length >= 2 && s.length <= 8);
      
      if (!isShortInput) {
        // Strict substring removal for long inputs
        raw.sort((a, b) => b.length - a.length);
        let unique: string[] = [];
        for (let s of raw) {
          if (!unique.some(u => u.includes(s) || s.includes(u))) {
            unique.push(s);
          }
        }
        return unique;
      }
      return raw;
    };
    
    return {
      fourLines: filterAndClean(data.fourLines).slice(0, 10),
      eightLines: filterAndClean(data.eightLines).slice(0, 16)
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return { fourLines: [], eightLines: [] };
  }
};

export const generatePoemImage = async (poemText: string): Promise<string | undefined> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `Create a minimalist, artistic illustration for: "${poemText}". Style: Japanese ink wash or modern abstract collage. Soft tones, plenty of white space. No text.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed:", error);
  }
  return undefined;
};
