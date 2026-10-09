import "dotenv/config"; //Memuat file .env ke dalam environment variables (process.env). Ini digunakan agar API key atau konfigurasi sensitif lainnya tidak langsung ditulis di dalam kode.
import { GoogleGenAI } from "@google/genai"; //Mengimpor kelas GoogleGenAI dari library @google/genai. Kelas ini digunakan untuk berinteraksi dengan model AI Gemini.
import express from "express"; //Mengimpor library express untuk membuat server web.
import fs from "fs"; //Mengimpor library fs untuk operasi file system.
import multer from "multer"; //Mengimpor library multer untuk menangani upload file.

// setup kode
const app = express(); //Membuat instance aplikasi Express. Ini adalah objek utama yang akan digunakan untuk mengatur routing dan middleware.
const upload = multer( {
  limits: { 
    fileSize: 10_000_000 //10MB
  },
}); //Membuat instance multer untuk menangani upload file.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); //Membuat instance dari GoogleGenAI dengan menggunakan API key yang diambil dari environment variables (process.env.API_KEY).
const GEMINI_MODEL = "gemini-3.5-flash-lite" //Membuat konstanta GEMINI_MODEL yang menyimpan nama model AI yang akan digunakan.

app.use(express.json()); //Middleware untuk mengizinkan aplikasi Express menerima request dengan body bertipe JSON. Ini diperlukan agar aplikasi dapat menerima data JSON dari client (misalnya dari Postman).

const PORT = process.env.PORT || 4848 //Membuat konstanta PORT yang menyimpan nomor port yang akan digunakan. Jika environment variable PORT tidak tersedia, maka akan menggunakan port 4848.
app.listen(PORT, () => { console.log(`Server Jalan di ${PORT}`); }); //Memulai server Express pada port yang telah ditentukan. Ketika server berhasil dimulai, akan mencetak pesan ke konsol.






// END POINT
app.post('/generate-text', async (req, res) => { //Definisi endpoint POST pada '/generate-text'. Ini berarti endpoint ini akan menerima request dengan metode POST.
  const { prompt } = req.body; //Mengekstrak properti 'prompt' dari body request (req.body). Data ini akan digunakan sebagai input untuk model AI.

  try { //Blok try digunakan untuk menangani potensi error selama eksekusi kode.
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt //Input prompt yang telah diekstrak dari request body akan dikirimkan ke model AI.
    });

    res.status(200).json({ result: response.text }); //Jika tidak ada error, server akan mengirimkan response dengan status 200 (OK) dan body berupa JSON yang berisi hasil generate content (response.text).

  } catch (e) { // Blok catch akan dieksekusi jika terjadi error di dalam blok try. Di dalamnya terdapat kode untuk mencetak error ke konsol dan mengirimkan response error ke client.
    console.log(e);
    res.status(500).json({ message: e.message }); //Mengirimkan response dengan status 500 (Internal Server Error) dan body berupa JSON yang berisi pesan error.
  };
});

// Helper Function
// Fungsi ini bertanggung jawab memparsing file gambar dari multipart/form-data
// dan mengubahnya menjadi format yang bisa dipahami oleh Gemini API (Part).
const parseImageFile = (file) => { //Mendefinisikan fungsi parseImageFile yang menerima satu argumen file, yang merupakan objek file yang diunggah.
  const mimeType = file.mimetype; //Mengambil tipe file dari objek file yang diunggah.
  const buffer = file.buffer; // Data gambar mentah (bytes)

  // Gemini API memerlukan struktur khusus untuk data biner
  return {
    inlineData: { // Mengembalikan objek dengan struktur inlineData.
      data: buffer.toString("base64"), // Mengubah data biner menjadi string Base64.
      mimeType: mimeType, // Menetapkan tipe mime dari file.
    },
  };
};



// END POINT 2
app.post('/generate-image', upload.single("image"), async (req, res) => { //Definisi endpoint POST pada '/generate-image'. Ini berarti endpoint ini akan menerima request dengan metode POST.
  const { prompt } = req.body; //Mengekstrak properti 'prompt' dari body request (req.body). Data ini akan digunakan sebagai input untuk model AI.
  const base64Image = req.file.buffer.toString("base64"); //Mengubah data biner dari file yang diunggah menjadi string Base64. String ini kemudian akan digunakan sebagai input untuk model AI.

  try { //Blok try digunakan untuk menangani potensi error selama eksekusi kode.
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt, type: "text" },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
      ],
    });

    res.status(200).json({ result: result.text }); //Jika tidak ada error, server akan mengirimkan response dengan status 200 (OK) dan body berupa JSON yang berisi hasil generate content (result.text).
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message }); //Mengirimkan response dengan status 500 (Internal Server Error) dan body berupa JSON yang berisi pesan error.
  }
});


// TODO > /generate-from-document
app.post('/generate-from-document', upload.single("document"), async (req, res) => {
  const { prompt } = req.body;
  const base64Document = req.file.buffer.toString("base64");
  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt ?? "Tolong buat ringkasan dari document ini!", type: "text" },
        { inlineData: { data: base64Document, mimeType: req.file.mimetype } }
      ],
    });
    res.status(200).json({ result: result.text });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});
