import Groq from "groq-sdk";
import "dotenv/config";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function generateAnswer(question, chunks) {

    const context = chunks
        .map(chunk => chunk.text)
        .join("\n\n");

    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
            {
                role: "system",
                content: `
You are the RentSmart AI Assistant.

Answer the user's question using ONLY the provided
RentSmart context.

If the answer is not available in the context,
say that you don't have that information.

Do not invent RentSmart policies, features,
payment information, or procedures.
                `
            },
            {
                role: "user",
                content: `
RentSmart Context:

${context}

User Question:

${question}
                `
            }
        ]
    });

    return response.choices[0].message.content;
}