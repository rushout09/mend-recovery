import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Protocol } from '../types';
import AudioVisualizer from './AudioVisualizer';
import { Mic, MicOff, Video, VideoOff, XCircle, Activity, CheckCircle } from 'lucide-react';

interface LiveSessionProps {
  protocol: Protocol;
  onEndSession: () => void;
}

// --- Audio Helpers ---
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] range to prevent distortion
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove data url prefix
      resolve(base64data.split(',')[1]); 
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const LiveSession: React.FC<LiveSessionProps> = ({ protocol, onEndSession }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [status, setStatus] = useState<string>('Initializing...');
  const [transcription, setTranscription] = useState<string>('');
  
  // Refs for Media and Audio Logic
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null); // To store the session object
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Initialize Gemini API
  const connectToGemini = useCallback(async () => {
    try {
      setStatus('Connecting to Gemini...');
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }, 
        video: {
            width: 640,
            height: 480
        } 
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are Mend, a kind and observant post-op recovery guardian. 
          The user is performing the following exercise: "${protocol.name}".
          Protocol Description: ${protocol.description}
          Key Instructions to Watch For:
          ${protocol.keyInstructions.map(i => `- ${i}`).join('\n')}
          
          Your goal is to watch the video stream and listen to the user.
          1. If they perform the movement correctly, give brief positive reinforcement ("Good form", "Nice tempo").
          2. If they violate a key instruction (e.g., knee wobbling, moving too fast), gently correct them immediately.
          3. Be concise. Do not lecture. Speak like a helpful coach standing right there.
          4. If they ask a question, answer it based on general physical therapy knowledge.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            setIsConnected(true);
            setStatus('Active');

            // --- Setup Audio Input Stream ---
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            // ScriptProcessor is deprecated but required for this specific API demo flow currently
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (!isMicOn) return; 
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);

            // --- Setup Video Stream Loop ---
            startVideoStream(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              try {
                  const ctx = outputAudioContextRef.current;
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                  
                  const audioBuffer = await decodeAudioData(
                      decode(base64Audio),
                      ctx,
                      24000,
                      1
                  );
                  
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(ctx.destination);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
              } catch (err) {
                  console.error("Audio decoding error:", err);
              }
            }

            // Simple "Transcription" Handling (Live API doesn't send text by default in AUDIO mode unless configured, 
            // but we can infer activity or use turnComplete if we enabled transcription in config - 
            // for now, we'll just show status updates on turn completion)
            if (message.serverContent?.turnComplete) {
               // Visual indicator that Gemini finished speaking a turn
               setTranscription("Guard is watching...");
               setTimeout(() => setTranscription(""), 3000);
            }
          },
          onclose: () => {
            console.log('Session closed');
            setIsConnected(false);
            setStatus('Disconnected');
          },
          onerror: (err) => {
            console.error('Session error:', err);
            setStatus('Error occurred');
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error("Failed to connect:", e);
      setStatus('Connection Failed');
    }
  }, [protocol, isMicOn]);

  const startVideoStream = (sessionPromise: Promise<any>) => {
     if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

     // Send frames at 1 FPS (approx every 1000ms) to save bandwidth but keep context
     videoIntervalRef.current = window.setInterval(() => {
        if (!videoRef.current || !canvasRef.current || !isVideoOn) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx && video.videoWidth > 0) {
            canvas.width = video.videoWidth * 0.5; // Scale down for performance
            canvas.height = video.videoHeight * 0.5;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const base64Data = await blobToBase64(blob);
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({
                            media: { data: base64Data, mimeType: 'image/jpeg' }
                        });
                    });
                }
            }, 'image/jpeg', 0.6); // 60% quality jpeg
        }
     }, 1000); 
  };

  const cleanup = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
    }
    if (processorRef.current && inputAudioContextRef.current) {
        processorRef.current.disconnect();
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
    }
    // Note: session.close() isn't explicitly exposed on the promise result in the snippet, 
    // but the connection drops when WS closes or context is destroyed.
  }, []);

  useEffect(() => {
    connectToGemini();
    return () => cleanup();
  }, [connectToGemini, cleanup]);


  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-2xl overflow-hidden relative shadow-2xl">
      {/* Header / HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent">
        <div>
           <div className="flex items-center space-x-2">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
              <span className="font-semibold text-sm tracking-wide uppercase">{status}</span>
           </div>
           <h2 className="text-xl font-bold mt-1 text-teal-100">{protocol.name}</h2>
        </div>
        
        <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
           <AudioVisualizer isActive={isConnected} />
           <span className="text-xs text-slate-300 font-mono">LIVE GUARDIAN</span>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
         <video 
            ref={videoRef} 
            className={`w-full h-full object-cover transform scale-x-[-1] ${!isVideoOn ? 'opacity-0' : 'opacity-100'}`} 
            muted 
            playsInline
         />
         {!isVideoOn && (
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="text-slate-500 flex flex-col items-center">
                     <VideoOff size={48} />
                     <span className="mt-2">Camera Paused</span>
                 </div>
             </div>
         )}
         
         {/* Hidden Canvas for processing */}
         <canvas ref={canvasRef} className="hidden" />

         {/* Protocol Overlay */}
         <div className="absolute bottom-6 left-6 max-w-sm">
             <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl">
                 <h3 className="text-teal-400 text-xs font-bold uppercase mb-2 tracking-wider">Active Protocol</h3>
                 <ul className="text-sm space-y-2 text-slate-200">
                     {protocol.keyInstructions.slice(0, 3).map((inst, i) => (
                         <li key={i} className="flex items-start">
                             <CheckCircle size={14} className="mt-1 mr-2 text-teal-500 shrink-0" />
                             <span>{inst}</span>
                         </li>
                     ))}
                 </ul>
             </div>
         </div>
      </div>

      {/* Controls Footer */}
      <div className="bg-slate-800 p-4 flex justify-center items-center space-x-6 z-20">
          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-4 rounded-full transition-colors ${isMicOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          <button 
            onClick={onEndSession}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-lg transform hover:scale-105 transition-all flex items-center"
          >
             <XCircle className="mr-2" size={24} />
             End Session
          </button>

          <button 
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-4 rounded-full transition-colors ${isVideoOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
      </div>
    </div>
  );
};

export default LiveSession;
