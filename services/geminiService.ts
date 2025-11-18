
import { GoogleGenAI, Type } from "@google/genai";
import { Shift } from '../types';

if (!process.env.API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled. Please set process.env.API_KEY.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const shiftSchema = {
  type: Type.OBJECT,
  properties: {
    nome_turno: {
      type: Type.STRING,
      description: "Il nome descrittivo del turno (es. 'Accoglienza Atleti').",
    },
    descrizione: {
      type: Type.STRING,
      description: "Una breve descrizione di cosa comporta il turno.",
    },
    luogo: {
      type: Type.STRING,
      description: "Il luogo dove si svolge il turno.",
    },
    data_inizio: {
      type: Type.STRING,
      description: "La data del turno, in formato DD/MM/YYYY.",
    },
    ora_inizio: {
      type: Type.STRING,
      description: "L'ora di inizio del turno, in formato HH:MM (24 ore).",
    },
    ora_fine: {
      type: Type.STRING,
      description: "L'ora di fine del turno, in formato HH:MM (24 ore).",
    },
  },
  required: ["nome_turno", "descrizione", "luogo", "data_inizio", "ora_inizio", "ora_fine"],
};

export const generateShiftFromPrompt = async (prompt: string): Promise<Partial<Shift>> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key for Gemini not configured.");
  }

  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fullPrompt = `
    Analizza la seguente richiesta per creare un turno per un evento. Estrai le informazioni e formattale secondo lo schema JSON fornito.
    La data di oggi è ${today}. Se l'anno non è specificato, assumi sia l'anno corrente (2026).
    Interpreta espressioni come "pomeriggio", "mattina", "sera" con orari ragionevoli (es. pomeriggio: 14:00-18:00).
    Assicurati che tutti i campi obbligatori siano presenti.
    Richiesta: "${prompt}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: shiftSchema,
      },
    });

    const text = response.text.trim();
    if (!text) {
        throw new Error("Empty response from Gemini API.");
    }

    const parsedJson = JSON.parse(text);
    return parsedJson as Partial<Shift>;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate shift details from prompt. Please try again.");
  }
};
