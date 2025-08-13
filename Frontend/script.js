const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const conversation = document.getElementById('chat-display');
const difficultySelect = document.getElementById('difficulty');
const newTopicBtn = document.getElementById('new-topic');
const toggleInputBtn = document.getElementById('toggle-input-btn');
const inputArea = document.getElementById('input-area');
const customTopicInput = document.getElementById('custom-topic');
const setTopicBtn = document.getElementById('set-topic-btn');

let sessionId = null;
let recognition;
let isListening = false;
let silenceTimer = null;
let inputVisible = false;

// Toggle input visibility
toggleInputBtn.addEventListener('click', () => {
    inputVisible = !inputVisible;
    inputArea.style.display = inputVisible ? 'block' : 'none';
    toggleInputBtn.textContent = inputVisible ? 'Hide Input' : 'Show Input';
});

// Start session with optional custom topic
async function startSession(difficulty = 'intermediate', customTopic = null) {
    const startRes = await fetch('http://localhost:4000/api/conversation/start', { 
        method: 'POST' 
    });
    const startData = await startRes.json();
    sessionId = startData.sessionId;

    const requestBody = { sessionId, difficulty };
    if (customTopic) {
        requestBody.customTopic = customTopic;
    }

    const topicRes = await fetch('http://localhost:4000/api/conversation/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    const topicData = await topicRes.json();
    appendMessage('AI', topicData.response);
    speak(topicData.response);
}

// Set custom topic
setTopicBtn.addEventListener('click', () => {
    const customTopic = customTopicInput.value.trim();
    if (customTopic) {
        const difficulty = difficultySelect.value;
        startSession(difficulty, customTopic);
        customTopicInput.value = '';
    } else {
        alert('Please enter a topic first');
    }
});

// Send user message to AI
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || !sessionId) return;

    appendMessage('You', message);
    userInput.value = '';

    const res = await fetch('http://localhost:4000/api/conversation/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message })
    });

    const data = await res.json();

    if (data.correction) {
        appendMessage('AI (correction)', data.correction);
        speak(data.correction);
    }

    appendMessage('AI', data.response);
    speak(data.response);
}

// Append message to chat
function appendMessage(sender, text) {
    const msg = document.createElement('div');
    msg.classList.add('message', sender === 'You' ? 'user-message' : 'ai-message');
    
    if (sender.includes('(correction)')) {
        msg.innerHTML = `<strong>${sender.replace(' (correction)', '')}:</strong> ${text} <span class="correction-badge">Correction</span>`;
        msg.classList.add('correction-message');
    } else {
        msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
    }
    
    conversation.appendChild(msg);
    conversation.scrollTop = conversation.scrollHeight;
}

// Speak text aloud
function speak(text) {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    synth.speak(utterance);
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

newTopicBtn.addEventListener('click', () => {
    const difficulty = difficultySelect.value;
    startSession(difficulty);
});

// Microphone functionality
micBtn.addEventListener('click', toggleSpeechRecognition);

function toggleSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert("Speech recognition is not supported.");
        return;
    }

    if (!recognition) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = function (event) {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                finalTranscript += event.results[i][0].transcript;
            }

            userInput.value = finalTranscript.trim();

            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                if (userInput.value.trim()) {
                    sendMessage();
                }
            }, 2000); // Shorter delay for more responsive feel
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error:', event.error);
        };

        recognition.onend = function () {
            if (isListening) {
                recognition.start();
            }
        };
    }

    if (!isListening) {
        recognition.start();
        isListening = true;
        micBtn.classList.add('listening');
        // micBtn.querySelector('img').src = './assets/mic-active.svg';
    } else {
        recognition.stop();
        isListening = false;
        micBtn.classList.remove('listening');
        micBtn.querySelector('img').src = './assets/mic.svg';
    }
}

// Initialize with random topic
startSession('beginner');