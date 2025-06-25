// const dotenv = require('dotenv');
// dotenv.config();

// Configuration
const API_KEY = window.Gemini_API_KEY; // Replace with your actual API key
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// DOM Elements
const chatDisplay = document.getElementById('chat-display');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const difficultySelect = document.getElementById('difficulty');
const newTopicBtn = document.getElementById('new-topic');

// App State
let conversationHistory = [];
let currentTopic = '';
let isListening = false;
let recognition;

// Initialize the app
function init() {
    // Set up event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    newTopicBtn.addEventListener('click', startNewTopic);
    micBtn.addEventListener('click', toggleSpeechRecognition);
    
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendMessage();
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            addMessage('system', 'Error: ' + event.error);
            isListening = false;
            updateMicButton();
        };
        
        recognition.onend = () => {
            isListening = false;
            updateMicButton();
        };
    } else {
        micBtn.style.display = 'none';
    }
    
    // Start with a new topic
    startNewTopic();
}

// Start a new conversation topic
async function startNewTopic() {
    conversationHistory = [];
    chatDisplay.innerHTML = '';
    
    const difficulty = difficultySelect.value;
    let prompt;
    
    switch(difficulty) {
        case 'beginner':
            prompt = "Start a simple English conversation for a beginner. Ask a very basic question about daily life using simple vocabulary (10 words max). Wait for the user's response.";
            break;
        case 'advanced':
            prompt = "Start an advanced English conversation. Ask a complex question about current events, technology, or culture that requires thoughtful response.";
            break;
        default: // intermediate
            prompt = "Start an intermediate English conversation. Ask a question about common topics like hobbies, travel, or work that requires a few sentences to answer.";
    }
    
    addMessage('ai', 'Starting a new conversation...');
    showTypingIndicator();
    
    try {
        const response = await generateContent(prompt, true);
        addMessage('ai', response);
    } catch (error) {
        console.error('Error starting new topic:', error);
        addMessage('system', 'Error starting conversation. Please try again.');
    }
}

// Send user message to AI
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    userInput.value = '';
    addMessage('user', message);
    showTypingIndicator();
    
    try {
        // First check for grammar mistakes
        const grammarCheckPrompt = `
        The user said: "${message}"
        
        Analyze this sentence for:
        1. Grammar mistakes
        2. Unnatural phrasing
        3. Word choice issues
        
        If the sentence is perfect, respond only with "perfect". 
        If there are mistakes, provide the corrected sentence and a very brief explanation (10 words max) of the main issue.
        `;
        
        const grammarResponse = await generateContent(grammarCheckPrompt, false);
        
        if (grammarResponse.toLowerCase() !== 'perfect') {
            // There was an error - show correction
            addCorrection(grammarResponse);
            
            // Generate a verbal response that includes the correction naturally
            const conversationPrompt = `
            The user said: "${message}"
            You identified this issue: "${grammarResponse}"
            
            Continue the conversation naturally, but first gently correct the user by:
            1. Repeating the corrected sentence naturally
            2. Very briefly explaining the improvement (5 words max)
            3. Then continuing the conversation
            
            Speak conversationally and keep your response under 3 sentences total.
            `;
            
            const aiResponse = await generateContent(conversationPrompt, true);
            addMessage('ai', aiResponse);
            
            // Speak the correction
            speakText(aiResponse);
        } else {
            // Sentence was perfect - continue conversation normally
            const conversationPrompt = `
            Conversation history:
            ${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
            
            User's latest message: "${message}"
            
            Continue the conversation naturally. Keep your response to 1-2 sentences.
            `;
            
            const aiResponse = await generateContent(conversationPrompt, true);
            addMessage('ai', aiResponse);
            speakText(aiResponse);
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('system', 'Error processing your message. Please try again.');
    }
}

// Add a message to the chat display
function addMessage(role, content) {
    hideTypingIndicator();
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    messageDiv.textContent = content;
    chatDisplay.appendChild(messageDiv);
    
    // Add to conversation history
    conversationHistory.push({ role, content });
    
    // Scroll to bottom
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Add a correction message
function addCorrection(content) {
    const correctionDiv = document.createElement('div');
    correctionDiv.classList.add('correction');
    correctionDiv.textContent = content;
    chatDisplay.appendChild(correctionDiv);
    
    // Scroll to bottom
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'ai-message');
    typingDiv.id = 'typing-indicator';
    
    const typingText = document.createElement('span');
    typingText.textContent = 'AI is typing';
    
    const dots = document.createElement('span');
    dots.classList.add('typing-indicator');
    dots.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(typingText);
    typingDiv.appendChild(dots);
    chatDisplay.appendChild(typingDiv);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// Generate content using Gemini API
async function generateContent(prompt, addToHistory = false) {
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }]
    };
    
    // Include conversation history if needed
    if (addToHistory && conversationHistory.length > 0) {
        requestBody.contents[0].parts.unshift(
            ...conversationHistory.map(msg => ({
                text: `${msg.role}: ${msg.content}`
            }))
        );
    }
    
    const response = await fetch(`${BASE_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    if (addToHistory) {
        conversationHistory.push({ role: 'ai', content: text });
    }
    
    return text;
}

// Toggle speech recognition
function toggleSpeechRecognition() {
    if (!recognition) {
        addMessage('system', 'Speech recognition not supported in your browser');
        return;
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
        isListening = true;
        updateMicButton();
    }
}

// Update microphone button appearance
function updateMicButton() {
    if (isListening) {
        micBtn.style.backgroundColor = 'var(--error-color)';
        micBtn.querySelector('img').style.filter = 'brightness(0) invert(1)';
    } else {
        micBtn.style.backgroundColor = 'var(--primary-color)';
        micBtn.querySelector('img').style.filter = '';
    }
}

// Speak text using Web Speech API
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}

// Initialize the app when the page loads
window.onload = init;