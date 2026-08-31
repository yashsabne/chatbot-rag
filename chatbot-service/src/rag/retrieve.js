import fs from "fs/promises";
import path from "path";

import {
    createEmbedding
} from "./ingest.js";

export function cosineSimilarity(a, b) {

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {

        dotProduct += a[i] * b[i];

        magnitudeA += a[i] * a[i];

        magnitudeB += b[i] * b[i];
    }

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct /
        (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export async function retrieve(question, topK = 3) {

    const dataPath = path.join(
        process.cwd(),
        "src",
        "data",
        "knowledge.json"
    );

    const data = await fs.readFile(
        dataPath,
        "utf-8"
    );

    const documents = JSON.parse(data);

    // Convert user's question into an embedding
    const questionEmbedding =
        await createEmbedding(question);

    // Calculate similarity with every document
    const results = documents.map(document => {

        const score = cosineSimilarity(
            questionEmbedding,
            document.embedding
        );

        return {
            text: document.text,
            score
        };
    });

    // Highest similarity first
    results.sort((a, b) => b.score - a.score);

    // Return only the best chunks
    return results.slice(0, topK);
}