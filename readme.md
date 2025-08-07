# English Communication Tutor

Practice speaking English with AI feedback! This web app lets you chat with an AI tutor, get grammar corrections, and even use your microphone for speech input.

## Features

- **AI-powered English conversation** at beginner, intermediate, or advanced levels
- **Grammar and phrasing corrections** with brief explanations
- **Speech recognition** (if supported by your browser)
- **Text-to-speech**: AI responses are spoken aloud
- **Start new topics** and select difficulty level

## Getting Started

1. **Clone or download this repository.**
2. **Install [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code** (optional, for local development).
3. **Set your Gemini API key:**
   - Create a `.env` file in the project root with:
     ```
     Gemini_API_KEY=YOUR_API_KEY_HERE
     ```
   - Or edit the `script.js` file and replace the default API key.

4. **Open `index.html` in your browser** (or use Live Server).

## Project Structure

- [`index.html`](index.html): Main HTML file
- [`style.css`](style.css): App styling
- [`script.js`](script.js): App logic (AI, chat, speech, etc.)
- [`assets/mic.svg`](assets/mic.svg): Microphone icon

## Requirements

- Modern browser (Chrome recommended for speech recognition)
- Gemini API key

## Customization

- Change conversation prompts or difficulty levels in [`script.js`](script.js)
- Update styles in [`style.css`](style.css)

## License

MIT License

---

*Created for English language learners and educators.*