import OpenAI from "openai";

// Vercel Serverless Function for AI Chat and Crop Diagnosis
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ reply: "Method not allowed. Please use POST." });
    }

    try {
        const { message, image, context } = req.body;
        
        if (!message && !image) {
            return res.status(400).json({ reply: "Please enter a message or upload an image." });
        }

        const openai = new OpenAI({
            apiKey: process.env.GROQ_API_KEY || "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",
            baseURL: "https://api.groq.com/openai/v1"
        });

        let contentObj = [];
        if (message) {
            contentObj.push({ type: "text", text: message });
        } else if (image) {
            contentObj.push({ type: "text", text: "Please identify the crop and any diseases or pests visible in this image." });
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
        
        // Ensure the prompt is used in the text item
        let contentWithPrompt = contentObj.map(item => {
            if (item.type === "text") return { ...item, text: finalPrompt || item.text };
            return item;
        });

        const response = await openai.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "system",
                    content: `You are 'Bwana Shamba AI', a friendly and expert Kenyan Agronomist who feels like a helpful neighbor. 
                    
                    Your personality:
                    - **Conversational & Warm**: Start with a friendly greeting in Swahili or Sheng (e.g., 'Sasa mkulima!', 'Hujambo!'). 
                    - **Simple & Clear**: Explain things like you're talking to a friend. Avoid big technical words, or explain them simply if you must use them.
                    - **Local Expert**: Recommend products and solutions found in local Kenyan agrovets.
                    - **Action-Oriented**: Give clear 'how-to' steps.
                    
                    Guidelines for your response:
                    1. BE CONCISE. Many farmers are on mobile and don't want to read long paragraphs.
                    2. Use Markdown: Use **bold headers**, bullet points, and emojis to make the advice easy to scan.
                    3. If a photo is provided, identify the plant and the issue immediately.
                    4. Keep it conversational—mix in a little Swahili/Sheng naturally like a local friend would.`
                },
                { role: "user", content: contentWithPrompt }
            ]
        });

        res.status(200).json({
            reply: response.choices[0].message.content || "No response from AI"
        });

    } catch (err) {
        console.error("ERROR:", err);
        res.status(500).json({
            reply: "Error: " + err.message
        });
    }
}
