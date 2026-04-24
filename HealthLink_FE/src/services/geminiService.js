import { GoogleGenerativeAI } from "@google/generative-ai";
import getBotResponse from '../AI_BOT/BotBrain';
import { GEMINI_API_KEY as API_KEY, CONFIG } from '../config';

// API key is now imported from config.js (better security)

console.log('🔍 API_KEY loaded:', API_KEY ? 'YES' : 'NO');

let genAI = null;
let model = null;

// Initialize Gemini AI
if (API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({
            model: CONFIG.GEMINI_MODEL,  // Use config constant
        });
        console.log('✅ Gemini AI initialized successfully');
    } catch (error) {
        console.warn('⚠️ Failed to initialize Gemini AI:', error.message);
        genAI = null;
        model = null;
    }
} else {
    console.warn('⚠️ Gemini API key not found. Using fallback responses only.');
}

/**
 * Get AI response from Gemini with fallback to rule-based
 */
export async function getGeminiResponse(userMessage, conversationHistory = []) {
    if (!model) {
        console.log('🔄 Using rule-based response (no AI available)');
        return getBotResponse(userMessage);
    }

    try {
        // Add context to help guide the AI
        const prompt = `You are an AI assistant for an online health consultation platform. You can provide general health information, help users book appointments, and answer questions about symptoms. Keep responses concise (under 3 sentences). Question: ${userMessage}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        console.log('🤖 Gemini AI response generated');
        console.log('� Response:', response);

        return response || 'I apologize, I could not generate a response. Please try again.';

    } catch (error) {
        console.error('❌ Gemini AI error:', error);
        console.log('🔄 Falling back to rule-based  response');
        return getBotResponse(userMessage);
    }
}

export function isGeminiAvailable() {
    return model !== null;
}

export default {
    getGeminiResponse,
    isGeminiAvailable
};
