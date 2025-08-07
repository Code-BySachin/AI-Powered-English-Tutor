const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send-btn');
const userInput = document.getElementById('user-input');
const conversation = document.getElementById('chat-display');
const difficultySelect = document.getElementById('difficulty');
const newTopicBtn = document.getElementById('new-topic');

let sessionId = null;
let recognition;
let isListening = false;
let silenceTimer = null;

// Start session
async function startSession(difficulty = 'intermediate') {
    const startRes = await fetch('http://localhost:3000/api/conversation/start', { method: 'POST' });
    const startData = await startRes.json();
    sessionId = startData.sessionId;

    const topicRes = await fetch('http://localhost:3000/api/conversation/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, difficulty })
    });

    const topicData = await topicRes.json();
    appendMessage('AI', topicData.response);
    speak(topicData.response);
}

// Send user message to AI
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || !sessionId) return;

    appendMessage('You', message);
    userInput.value = '';

    const res = await fetch('http://localhost:3000/api/conversation/message', {
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
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
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

// Send on Enter
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// New topic button
newTopicBtn.addEventListener('click', () => {
    const difficulty = difficultySelect.value;
    startSession(difficulty);
});

// Toggle microphone on/off
micBtn.addEventListener('click', () => {
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
            }, 5000);
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error:', event.error);
        };

        recognition.onend = function () {
            if (isListening) {
                recognition.start(); // Restart only if user didn't manually stop it
            }
        };
    }

    if (!isListening) {
        recognition.start();
        isListening = true;
        micBtn.classList.add('listening');
    } else {
        recognition.stop();
        isListening = false;
        micBtn.classList.remove('listening');
    }
});
