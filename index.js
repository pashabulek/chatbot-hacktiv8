import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PRIMARY_PORT = parseInt(process.env.PORT, 10) || 3000;
const ALT_PORT = PRIMARY_PORT === 3000 ? 4848 : 3000;

// Gemini Client Setup
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  console.warn("⚠️ PERINGATAN: GEMINI_API_KEY / API_KEY belum disetel di file .env");
}
const ai = new GoogleGenAI({ apiKey });
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'Static')));

// System Instructions & Presets
const SYSTEM_PROMPTS = {
  general: `Kamu adalah 'Nusantara Voyage AI' (Bon Voyage Indonesia Travel Assistant), asisten AI pintar yang ahli dalam pariwisata, budaya, dan kuliner Indonesia.
Karaktermu ramah, bersemangat, informatif, dan solutif.
Tugas utamamu:
1. Memberikan rekomendasi destinasi wisata di Indonesia (hidden gems maupun tempat populer).
2. Merancang rencana perjalanan (itinerary) yang praktis, realistis, dan efisien.
3. Memberikan rekomendasi kuliner lokal autentik dan oleh-oleh khas.
4. Menyediakan perkiraan budget/biaya perjalanan (transportasi, penginapan, tiket masuk, makan).
5. Berbagi tips keselamatan, etika lokal, dan musim terbaik untuk berkunjung.
Gunakan gaya bahasa santai dan bersahabat (bahasa Indonesia yang natural), gunakan format markdown (bullet points, bold) agar mudah dibaca.`,

  backpacker: `Kamu adalah 'Nusantara Voyage AI' mode BACKPACKER & BUDGET TRAVELER.
Fokus utamamu adalah petualangan hemat dan efisien:
- Rekomendasi transportasi umum termurah (kereta, bus, kapal feri lokal).
- Rekomendasi hostel, guesthouse, atau homestay terjangkau.
- Rekomendasi kuliner kaki lima, pasar tradisional, dan warung lokal murah meriah.
- Tips menghemat biaya tiket, rute gratis, dan trik packing ringan.
Gaya bahasa kasual, asik, suportif, dan penuh tips praktis.`,

  leisure: `Kamu adalah 'Nusantara Voyage AI' mode LEISURE & FAMILY.
Fokus utamamu adalah liburan santai, nyaman, dan ramah keluarga:
- Destinasi ramah anak dan orang tua dengan akses mudah.
- Rekomendasi hotel/resort bintang, villa nyaman, atau restoran legendaris.
- Rute santai tanpa terburu-buru, fokus pada relaksasi dan kenyamanan.
Gaya bahasa hangat, sopan, elegan, dan informatif.`,

  adventure: `Kamu adalah 'Nusantara Voyage AI' mode EXPLORER & ADVENTURE.
Fokus utamamu adalah wisata alam bebas, eksplorasi alam, dan aktivitas menantang:
- Spot hiking, gunung, air terjun tersembunyi, surfing, diving, dan caving di Indonesia.
- Tips keselamatan fisik, logistik alam terbuka, dan perlengkapan wajib.
- Destinasi eksotis yang jarang dikunjungi turis umum.
Gaya bahasa bersemangat, energik, dan menginspirasi petualangan.`
};

// POST /api/chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { conversation, messages, prompt, tone = 'general', temperature, topP, topK } = req.body;

    // Normalisasi input conversation
    let history = conversation || messages || [];

    if (prompt && history.length === 0) {
      history = [{ role: 'user', text: prompt }];
    }

    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: "Input percakapan tidak boleh kosong." });
    }

    // Format pesan sesuai spesifikasi Gemini SDK (@google/genai)
    const contents = history.map(item => {
      const role = item.role === 'model' || item.role === 'bot' || item.role === 'assistant' ? 'model' : 'user';
      const text = item.text || item.content || item.message || '';
      return {
        role,
        parts: [{ text }]
      };
    });

    // Konfigurasi parameter kreatif
    const selectedSystemInstruction = SYSTEM_PROMPTS[tone] || SYSTEM_PROMPTS.general;
    const finalTemp = typeof temperature === 'number' ? temperature : (tone === 'backpacker' ? 0.5 : tone === 'adventure' ? 0.9 : 0.7);
    const finalTopP = typeof topP === 'number' ? topP : 0.95;
    const finalTopK = typeof topK === 'number' ? topK : 40;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: selectedSystemInstruction,
        temperature: finalTemp,
        topP: finalTopP,
        topK: finalTopK
      }
    });

    const resultText = response.text || "Maaf, tidak ada respons yang dihasilkan.";
    return res.status(200).json({
      result: resultText,
      model: GEMINI_MODEL,
      meta: {
        tone,
        temperature: finalTemp
      }
    });

  } catch (error) {
    console.error("Error pada endpoint /api/chat:", error);
    return res.status(500).json({
      message: error.message || "Terjadi kesalahan pada server saat menghubungi Gemini AI.",
      error: error.message
    });
  }
});

// Backward-compatible endpoint from Session 2
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ message: "Prompt is required" });
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

const server1 = app.listen(PRIMARY_PORT, () => {
  console.log(`Server Nusantara Voyage AI berjalan di http://localhost:${PRIMARY_PORT}`);
});
server1.on('error', (err) => {
  console.warn(`Port ${PRIMARY_PORT} info: ${err.message}`);
});

const server2 = app.listen(ALT_PORT, () => {
  console.log(`Server juga aktif di http://localhost:${ALT_PORT}`);
});
server2.on('error', (err) => {
  // port fallback silent ignore
});