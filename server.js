import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const openai = new OpenAI({
    apiKey: "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",
    baseURL: "https://api.groq.com/openai/v1"
});

app.post("/chat", async (req, res) => {
    try {
        const { message, image, context } = req.body;
        
        if (!message && !image) {
            return res.json({ reply: "Please enter a message or upload an image." });
        }

        let contentObj = [];
        if (message) {
            contentObj.push({ type: "text", text: message });
        } else if (image) {
            contentObj.push({ type: "text", text: "What is in this image?" });
        }
        
        if (image) {
            contentObj.push({
                type: "image_url",
                image_url: {
                    url: image
                }
            });
        }

        // Add context to the prompt if available
        let finalPrompt = message;
        if (context && context.location) {
            finalPrompt = `Location: ${context.location}. Weather Info: ${JSON.stringify(context.weather)}. \n\nFarmer's Question: ${message}`;
        }
        
        let contentWithPrompt = contentObj.map(item => {
            if (item.type === "text") return { ...item, text: finalPrompt };
            return item;
        });

        const response = await openai.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "system",
                    content: `You are 'Bwana Shamba AI', an expert Kenyan Agronomist. 
                    Your goal is to help Kenyan farmers diagnose crop issues. 
                    1. Identify the crop and disease/pest accurately.
                    2. Use the provided location and weather to give hyper-local advice.
                    3. Suggest treatments available in Kenyan agrovets.
                    4. Use a mix of English and Swahili (Sheng is fine) for a friendly 'homegrown' feel.
                    5. If weather is rainy/humid, emphasize fungal prevention.
                    6. IMPORTANT: Always format your response using Markdown (bullet points, bold text for headings, etc.) for readability. DO NOT return a single long paragraph.`
                },
                { role: "user", content: contentWithPrompt }
            ]
        });

        res.json({
            reply: response.choices[0].message.content || "No response from AI"
        });
    } catch (err) {
        console.error("ERROR:", err);
        res.json({
            reply: "Error: " + err.message
        });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));