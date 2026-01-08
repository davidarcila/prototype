import { GoogleGenAI, Type } from "@google/genai";
import { Entity } from "../types";

export const generateDailyEnemy = async (dateString: string): Promise<Entity> => {
  // Fallback enemy if API fails or key is missing
  const fallbackEnemy: Entity = {
    name: "Goblin Runt",
    maxHp: 10,
    currentHp: 10,
    shield: 0,
    description: "A small, annoying goblin with a rusty dagger.",
    coins: 0
  };

  if (!process.env.API_KEY) {
    console.warn("No API_KEY found, using fallback enemy.");
    return fallbackEnemy;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a fantasy enemy for a card game based on the date: ${dateString}. 
                 It should be a very weak enemy suitable for a quick battle.
                 MaxHP should be exactly 10.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            maxHp: { type: Type.INTEGER },
            description: { type: Type.STRING },
          },
          required: ["name", "maxHp", "description"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        name: data.name,
        maxHp: data.maxHp,
        currentHp: data.maxHp,
        shield: 0,
        description: data.description,
        coins: 0
      };
    }
    
    return fallbackEnemy;
  } catch (error) {
    console.error("Error generating enemy:", error);
    return fallbackEnemy;
  }
};