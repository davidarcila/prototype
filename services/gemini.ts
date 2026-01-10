
import { GoogleGenAI, Type } from "@google/genai";
import { Entity } from "../types";

export const generateDailyEnemy = async (dateString: string): Promise<Entity[]> => {
  // Fallback enemies if API fails
  const fallbackEnemies: Entity[] = [
    {
      name: "Rotting Rat",
      maxHp: 6,
      currentHp: 6,
      shield: 0,
      description: "It gnaws at the roots of the world.",
      visual: "🐀",
      coins: 0,
      difficulty: 'EASY'
    },
    {
      name: "Hollow Guard",
      maxHp: 10,
      currentHp: 10,
      shield: 0,
      description: "Armor rusting over nothing but dust.",
      visual: "🛡️",
      coins: 0,
      difficulty: 'MEDIUM'
    },
    {
      name: "The Forgotten",
      maxHp: 15,
      currentHp: 15,
      shield: 0,
      description: "It remembers you, but you do not remember it.",
      visual: "👁️",
      coins: 0,
      difficulty: 'HARD'
    }
  ];

  if (!process.env.API_KEY) {
    console.warn("No API_KEY found, using fallback enemies.");
    return fallbackEnemies;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 fantasy enemies for a roguelike card game Daily Run (Date: ${dateString}). 
                 The tone should be "Dark Fantasy" but the descriptions should be clear, concise, and descriptive (not overly poetic or cryptic).
                 Max 12 words per description.
                 For each enemy, provide a single UTF-8 Emoji that best represents it in the "visual" field.
                 
                 1. First enemy: Difficulty Easy (Weak, ~6 HP).
                 2. Second enemy: Difficulty Medium (Average, ~10 HP).
                 3. Third enemy: Difficulty Hard (Boss, ~15 HP).
                 
                 Return them as a JSON list.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              maxHp: { type: Type.INTEGER },
              description: { type: Type.STRING },
              visual: { type: Type.STRING, description: "A single emoji representing the enemy" }
            },
            required: ["name", "maxHp", "description", "visual"],
          }
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text) as any[];
      if (Array.isArray(data) && data.length >= 3) {
         return [
           { ...data[0], currentHp: data[0].maxHp, shield: 0, coins: 0, difficulty: 'EASY' },
           { ...data[1], currentHp: data[1].maxHp, shield: 0, coins: 0, difficulty: 'MEDIUM' },
           { ...data[2], currentHp: data[2].maxHp, shield: 0, coins: 0, difficulty: 'HARD' },
         ];
      }
    }
    
    return fallbackEnemies;
  } catch (error) {
    console.error("Error generating enemies:", error);
    return fallbackEnemies;
  }
};
