import "dotenv/config"
import express from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { GoogleGenAI } from "@google/genai"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

const apikey = process.env.GEMINI_API_KEY
const model = "gemini-3.1-pro-preview"

if (!apikey) {
  throw new Error("missing gemini api key in .env")
}

const ai = new GoogleGenAI({ apiKey: apikey })
const lyrics = fs.readFileSync(path.join(__dirname, "lyrics.txt"), "utf8")

app.post("/hook", async (req, res) => {
  const extra = (req.body?.extra || "").toString().slice(0, 400).trim()

  const prompt =
    "write a brand new hook in the style implied by the text below. make it catchy, repeatable, and natural. do not copy lines from the text. try to use only words that already appear in the text and avoid introducing new vocabulary unless absolutely necessary. output only the hook as 8 to 12 lines." +
    (extra ? " extra info: " + extra + "." : "") +
    "\n\n" +
    lyrics

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  })

  res.json({ text: response.text })
})

app.post("/other", async (req, res) => {
  const q = (req.body?.q || "").toString().slice(0, 1200).trim()
  if (!q) return res.status(400).json({ error: "missing prompt" })

  const prompt =
    "answer the user's request using the text below as your reference. be concise and direct. if the request is creative, keep it in the artist's style. output only the answer.\n\n" +
    "user request:\n" +
    q +
    "\n\n" +
    lyrics

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  })

  res.json({ text: response.text })
})

app.listen(3000, () => {
  console.log("yenism running at http://localhost:3000")
})
