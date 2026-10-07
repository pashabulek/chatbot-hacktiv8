import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({});

async function main() {
  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",
    input: "How does AI work?",
  });
  console.log(interaction.output_text);
}

await main();


