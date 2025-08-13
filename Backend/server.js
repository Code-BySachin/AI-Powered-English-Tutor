// server.js

const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Replace with your API key

const sessions = new Map();

// Start session
app.post('/api/conversation/start', (req, res) => {
    const sessionId = Date.now().toString();
    sessions.set(sessionId, { history: [], topic: '' });
    res.status(200).json({ sessionId, message: 'Session started' });
});

// Start topic
app.post('/api/conversation/topic', async (req, res) => {
    const { sessionId, difficulty, customTopic } = req.body;
    
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    let prompt = '';

    if (customTopic && customTopic.trim() !== '') {
        // Custom topic provided
        prompt = `Start a conversation in English about "${customTopic}". 
        Ask one engaging question. Speak like a friendly tutor, adapting to a ${difficulty || 'medium'}-level learner. 
        Keep the reply short and conversational.`;
    } else {
        // Use default based on difficulty
        if (difficulty === 'beginner') {
            prompt = `Start a friendly English conversation for a beginner. 
            Ask a short and simple question. Avoid long replies. Speak naturally like a tutor.`;
        } else if (difficulty === 'advanced') {
            prompt = `Start an engaging English conversation on a complex topic like culture or technology.
            Ask a thoughtful question. Speak like a fluent tutor.`;
        } else {
            prompt = `Start a medium-level English conversation.
            Ask a clear question related to hobbies, travel, or daily life. Speak simply.`;
        }
    }

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const text = result.candidates[0].content.parts[0].text;

        session.history = [
            { role: 'user', parts: [{ text: prompt }] },
            { role: 'model', parts: [{ text }] }
        ];
        session.topic = customTopic || difficulty;

        res.status(200).json({ response: text });
    } catch (error) {
        console.error('Error generating conversation topic:', error);
        res.status(500).json({ error: 'Failed to start conversation' });
    }
});


// Handle message + grammar + response
app.post('/api/conversation/message', async (req, res) => {
    const { sessionId, message } = req.body;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Step 1: Grammar correction
    const grammarPrompt = `The user said: "${message}"
Is it grammatically correct? If yes, respond with "perfect". 
If not, provide a corrected version and a short 5–10 word explanation.`;

    const grammarResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: grammarPrompt }] }]
    });

    const grammarText = grammarResponse.candidates[0].content.parts[0].text.trim();

    // Step 2: Conversation reply
    let replyPrompt = '';

    if (grammarText.toLowerCase() === 'perfect') {
        replyPrompt = `Continue the conversation based on: "${message}". 
Ask a relevant question to keep talking naturally.`;
    } else {
        replyPrompt = `The user said: "${message}"
You corrected it to: "${grammarText}".
Now reply politely with the correction, explain briefly, and continue the conversation naturally with a question.`;
    }

    const reply = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [...session.history, { role: 'user', parts: [{ text: replyPrompt }] }]
    });

    const responseText = reply.candidates[0].content.parts[0].text.trim();

    // Update session history
    session.history.push({ role: 'user', parts: [{ text: message }] });
    session.history.push({ role: 'model', parts: [{ text: responseText }] });

    res.status(200).json({
        correction: grammarText.toLowerCase() !== 'perfect' ? grammarText : null,
        response: responseText
    });
});

// End session
app.post('/api/conversation/end', (req, res) => {
    const { sessionId } = req.body;
    sessions.delete(sessionId);
    res.status(200).json({ message: 'Session ended' });
});

app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
