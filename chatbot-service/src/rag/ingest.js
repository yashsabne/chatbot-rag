import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export async function createEmbedding(text) {

    const response = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: text
    });

    return response.embeddings[0].values;
}

export function createChunks(text) {

    return text
        .split("\n\n")
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 0);
}

export async function ingestKnowledge() {

    const knowledgePath = path.join(
        process.cwd(),
        "knowledge",
        "rentsmart.txt"
    );

    const dataDirectory = path.join(
        process.cwd(),
        "src",
        "data"
    );

    const outputPath = path.join(
        dataDirectory,
        "knowledge.json"
    );

    const text = await fs.readFile(
        knowledgePath,
        "utf-8"
    );

    if (!text.trim()) {
        throw new Error("RentSmart knowledge base is empty.");
    }

    const chunks = createChunks(text);

    const documents = [];

    for (const chunk of chunks) {

        console.log("Creating embedding...");

        const embedding = await createEmbedding(chunk);

        documents.push({
            text: chunk,
            embedding
        });
    }

    await fs.mkdir(dataDirectory, {
        recursive: true
    });

    await fs.writeFile(
        outputPath,
        JSON.stringify(documents, null, 2
    ));

    console.log(`Indexed ${documents.length} chunks.`);
}