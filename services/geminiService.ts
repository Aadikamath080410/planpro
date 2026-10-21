
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ComparisonResult } from "../types";

// Always use named parameters for initializing GoogleGenAI with the direct environment key string.
const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key missing! Add VITE_GEMINI_API_KEY to your .env.local file.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

export const geminiService = {
  async compareProducts(productName: string, category: string): Promise<{ text: string, links: any[] }> {
    console.log("Initializing Gemini with model: gemini-1.5-flash");
    const ai = getAI();
    // Complex market comparison and reasoning task using gemini-1.5-flash
    const prompt = `Research and compare the furniture product "${productName}" in the category "${category}" with at least 3 similar products from high-end competitors (like West Elm, Restoration Hardware, or Herman Miller). 
    Provide a concise comparison of price, materials, and design aesthetic.
    Use Google Search to find current data and mention how PlanPro's offering compares in terms of value.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "Comparison data unavailable.";
    // Google Search results are extracted from groundingChunks
    const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { text, links };
  },

  async buildRoomWithAI(roomImageBase64: string, productDescription: string): Promise<string | null> {
    const ai = getAI();
    
    // We use gemini-1.5-flash for image editing/generation tasks
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: roomImageBase64.split(',')[1],
              mimeType: 'image/jpeg'
            }
          },
          {
            text: `Professional interior design edit: Seamlessly place a ${productDescription} into this room. Ensure the lighting, shadows, and perspective match the original room perfectly. Maintain the room's high-end aesthetic as per PlanPro's signature style.`
          }
        ]
      }
    });

    // Iterate through response parts to find the generated image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    return null;
  }
};
