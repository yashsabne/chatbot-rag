import express from "express";
import cors from "cors";
import "dotenv/config";

import { retrieve } from "./rag/retrieve.js";
import { generateAnswer } from "./rag/generate.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        message: "RentSmart Chatbot Service is running"
    });
});

app.post("/api/chat", async (req, res) => {

    try {

        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                message: "Question is required"
            });
        }

        const chunks = await retrieve(message);

        const answer = await generateAnswer(
            message,
            chunks
        );

        res.json({
            answer
        });

    } catch (error) {

        console.error("Chatbot error:", error);

        res.status(500).json({
            message: "Something went wrong"
        });
    }
});

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
    console.log(
        `RentSmart Chatbot Service running on port ${PORT}`
    );
});