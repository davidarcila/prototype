import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";
import { VALUE_LEVELS, SPEED_LEVELS_MS, ODDS_LEVELS, PARAGON_MULTIPLIER_PER_POINT } from "../constants";

const apiKey = process.env.API_KEY || ''; 

export const getFinancialAdvice = async (gameState: GameState): Promise<string> => {
  // Always create a new instance to ensure we use the latest key context
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const baseVal = VALUE_LEVELS[gameState.upgrades.value] || 0.10;
  const prestigeMult = 1 + (gameState.paragonPoints * PARAGON_MULTIPLIER_PER_POINT);
  const currentPayout = baseVal * prestigeMult;
  
  const currentSpeed = SPEED_LEVELS_MS[gameState.upgrades.speed] || 2000;
  const currentOdds = (ODDS_LEVELS[gameState.upgrades.odds] || 0.5) * 100;
  const netWorth = gameState.money;

  const prompt = `
    You are a sarcastic, high-energy financial guru in a game called "Coin Flip Tycoon".
    
    Stats:
    - Cash: $${netWorth.toLocaleString()}
    - Flips: ${gameState.totalFlips}
    - Heads: ${gameState.totalHeads}
    - Coin Value: $${currentPayout.toFixed(2)}
    - Speed: ${(currentSpeed/1000).toFixed(2)}s
    - Win Chance: ${currentOdds}%
    - Automation Level: ${gameState.upgrades.auto}
    - Prestige (Paragon) Points: ${gameState.paragonPoints}
    
    Give a 1-2 sentence advice. Roast them if they are poor or have low upgrades. If they have high prestige, call them a "Time Lord" or "Economy God".
    Be funny.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Keep flipping! The economy is waiting.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The spirits are cloudy today. Try again later.";
  }
};
