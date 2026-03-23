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
                    content: `You are 'Bwana Shamba AI', an expert Kenyan Agronomist. 
                    Your goal is to help Kenyan farmers diagnose crop issues. 
                    1. Identify the crop and disease/pest accurately.
                    2. Use the provided location and weather to give hyper-local advice.
                    3. Suggest treatments available in Kenyan agrovets.
                    4. Use a mix of English and Swahili (Sheng is fine) for a friendly 'homegrown' feel.
                    5. If weather is rainy/humid, emphasize fungal prevention.
                    6. Always format your response using Markdown (bullet points, bold text) for readability.`
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
