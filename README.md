# Mend - Post-Op Recovery Guardian

Mend is a real-time physical therapy assistant powered by Google's Gemini Live API. It observes patients performing rehabilitation exercises through their camera and provides gentle, spoken corrective feedback in real-time, just like a human therapist.

## How It Works

Mend uses a sophisticated multimodal streaming architecture:

1.  **Initialization**:
    *   The app connects to the **Gemini Multimodal Live API** via WebSockets (`gemini-2.5-flash-native-audio-preview-09-2025`).
    *   It configures a `systemInstruction` that gives Gemini the persona of a "kind recovery guardian" and injects the specific medical protocol (e.g., "Knee Extension") into the context.

2.  **Real-time Inputs**:
    *   **Video**: The app captures the user's webcam feed. To optimize bandwidth while maintaining context, it extracts video frames (snapshots) every second (1 FPS), converts them to base64-encoded JPEGs, and streams them to the model using `session.sendRealtimeInput`.
    *   **Audio**: The app captures microphone input using the Web Audio API. It captures raw floating-point audio data via a `ScriptProcessorNode`, converts it into 16-bit PCM (Pulse Code Modulation) format at 16kHz, and streams it to the model.

3.  **Intelligent Analysis**:
    *   Gemini processes the incoming video frames and audio stream continuously.
    *   Using its long-context understanding, it compares the user's movements against the definitions in the "Active Protocol".
    *   It identifies issues like "knee wobbling" or "moving too fast" based on the visual input.

4.  **Real-time Feedback (Output)**:
    *   Gemini generates audio responses (speech) in real-time.
    *   The app receives these audio chunks as raw PCM data in `LiveServerMessage` events.
    *   It decodes the raw data and schedules it for playback using a precise timing queue (`nextStartTime`) to ensure the voice sounds smooth and conversational.

## Troubleshooting: "Network Error"

If you encounter a **Session error: Error: Network error**, it is likely due to the API connection failing during the handshake.

### 1. API Key Configuration
The application expects the API key to be available at `process.env.API_KEY`. 
*   **Solution**: Ensure you are running the application in an environment that injects this variable (e.g., Vite, Next.js, or a secure sandbox).
*   **Validation**: The key must be a valid Google Cloud API key with the **Generative Language API** enabled.

### 2. Model Access
The app uses `gemini-2.5-flash-native-audio-preview-09-2025`.
*   **Solution**: Verify that your API key project has access to the Gemini 2.5 Flash experimental models.

### 3. Permissions
The Live API requires an active data stream to maintain the connection.
*   **Solution**: Grant the browser permission to access both **Camera** and **Microphone** when prompted. The session may fail to initialize if streams are blocked.

## Tech Stack
*   **React 19**: Component architecture.
*   **@google/genai**: Official SDK for Gemini API interaction.
*   **Web Audio API**: Custom PCM encoding/decoding for low-latency streaming.
*   **Tailwind CSS**: Styling and responsive design.
