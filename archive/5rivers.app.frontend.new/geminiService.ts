
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getLogisticsAdvice(query: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert logistics dispatcher. Based on the user query, provide concise, actionable advice for a trucking company. Query: ${query}`,
    config: {
      temperature: 0.7,
      maxOutputTokens: 200,
    }
  });
  return response.text;
}

export async function parseCommand(command: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parse the following natural language command into a structured JSON for a logistics system.
    Examples:
    "Schedule a load from Toronto to Chicago for Global Foods" -> { "action": "CREATE_JOB", "params": { "origin": "Toronto", "destination": "Chicago", "customer": "Global Foods" } }
    "Show me all maintenance alerts" -> { "action": "FILTER_FLEET", "params": { "status": "Maintenance" } }
    
    Command: "${command}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          params: {
            type: Type.OBJECT,
            properties: {
              origin: { type: Type.STRING },
              destination: { type: Type.STRING },
              customer: { type: Type.STRING },
              status: { type: Type.STRING }
            }
          }
        },
        required: ["action"]
      }
    }
  });
  
  try {
    return JSON.parse(response.text);
  } catch (e) {
    return { action: 'UNKNOWN' };
  }
}
