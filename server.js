import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

const openai = new OpenAI({
    apiKey: "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",
    baseURL: "https://api.groq.com/openai/v1"
});

app.post("/chat", async (req, res) => {
    try {
        const { message, image, profile, history, context } = req.body;
        
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
                    content: `You are 'Bwana Shamba AI', a friendly and expert Kenyan Agronomist who feels like a helpful neighbor. 
                    
                    The farmer you are talking to is:
                    - **Name**: ${profile ? profile.name : 'Mkulima (Farmer)'}
                    - **Location**: ${profile ? profile.location : (context ? context.location : 'Kenya')}
                    - **Crops**: ${profile ? profile.crops : 'Various crops'}
                    
                    Your personality:
                    - **Conversational & Warm**: Start with a friendly greeting in Swahili or Sheng (e.g., 'Sasa mkulima!', 'Hujambo!'). If you know their name, use it!
                    - **Simple & Clear**: Explain things like you're talking to a friend. Avoid big technical words, or explain them simply if you must use them.
                    - **Local Expert**: Recommend products and solutions found in local Kenyan agrovets.
                    - **Action-Oriented**: Give clear 'how-to' steps based on their specific crops and location.
                    
                    Guidelines for your response:
                    1. BE CONCISE. Many farmers are on mobile and don't want to read long paragraphs.
                    2. Use Markdown: Use **bold headers**, bullet points, and emojis to make the advice easy to scan.
                    3. If a photo is provided, identify the plant and the issue immediately.
                    4. Keep it conversational—mix in a little Swahili/Sheng naturally like a local friend would.`
                },
                ...(history || []),
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