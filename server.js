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

app.post("/title", async (req, res) => {
    const style = (req.body?.style || "auto").toLowerCase()

    const length_line =
        style === "word"
            ? "output exactly one word."
            : style === "phrase"
                ? "output a short phrase of 2 to 6 words."
                : "output either one word or a short phrase, whichever matches the artist's usual style."

    const prompt =
        "based on the song titles and lyrics in the text below, invent a new song title that the artist would realistically use next. follow the same naming style, length, and tone the artist usually uses. do not copy or reuse any existing title that already appears in the text below. do not explain. do not add punctuation. output only the title in lowercase. " +
        length_line +
        "\n\n" +
        lyrics

    const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    })

    res.json({ title: response.text.trim().toLowerCase() })
})

app.post("/generate", async (req, res) => {
    const title = (req.body?.title || "").toString().slice(0, 200).trim()
    const extra = (req.body?.extra || "").toString().slice(0, 400).trim()

    const prompt =
        "write original song lyrics inspired by the text below, copying the general flow, tone, and style but not the exact lines. try to use only words that already appear in the text and avoid introducing new vocabulary unless absolutely necessary. the lyrics should feel cohesive and natural, not explanatory. output only the lyrics." +
        (title ? " the song is titled: " + title + "." : "") +
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
