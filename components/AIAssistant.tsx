
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Bot, User, Trash2, StopCircle, Mic, MicOff, Activity, Volume2 } from 'lucide-react';
import { startChatSession } from '../services/geminiService';
import { Chat, GenerateContentResponse, GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Patient } from '../types';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  allPatients?: Patient[];
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

// --- Audio Helpers for Live API ---
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Float32 audio from mic to Int16 PCM for Gemini
function floatTo16BitPCM(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, context, allPatients }) => {
  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: "Hello Dr. Resident. How can I help you with your patients today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  
  // Live Voice State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0); // For visualization

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<Promise<any> | null>(null); 
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const getSystemPrompt = (contextStr?: string, patients?: Patient[]) => {
      let prompt = `
        You are an expert internal medicine resident assistant. 
        Provide concise, evidence-based answers. 
        You are fluent in both English and Thai. 
        If the user speaks Thai, respond in Thai.
        If a patient context is provided, use it to answer clinical questions.
      `;

      if (patients && patients.length > 0) {
          const census = patients.map(p => 
              `- Room ${p.roomNumber}: ${p.name} (${p.age}${p.gender}). ${p.oneLiner || p.diagnosis}. Status: ${p.acuity}. Tasks: ${p.tasks.filter(t => !t.isCompleted).length} pending.`
          ).join('\n');
          prompt += `\n\nActive Patient Census (Use this to find patients):\n${census}`;
      }

      if (contextStr) {
          prompt += `\n\nCurrently Selected Patient Context (Focus on this one if asked about 'this patient'):\n${contextStr}`;
      } else {
          prompt += `\n\nNo specific patient is currently selected. Use the Census list if asked about specific rooms or names.`;
      }
      return prompt;
  };

  // Initialize Text Chat
  useEffect(() => {
    if (isOpen && !chatSession && !isLiveMode) {
      setChatSession(startChatSession(getSystemPrompt(context, allPatients)));
    }
  }, [isOpen, context, chatSession, allPatients, isLiveMode]);

  // Cleanup on close
  useEffect(() => {
      if (!isOpen) {
          stopLiveSession();
      }
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLiveMode]);

  // --- Text Chat Handlers ---

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessageStream({ message: userMsg.text });
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '' }]);

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;
        if (text) {
            setMessages(prev => prev.map(m => 
                m.id === botMsgId ? { ...m, text: m.text + text } : m
            ));
        }
      }
    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having trouble connecting right now. Please check your network or API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([{ id: Date.now().toString(), role: 'model', text: "Chat cleared. Ready for new questions." }]);
    setChatSession(startChatSession(getSystemPrompt(context, allPatients)));
  };

  // --- Live Voice Handlers ---

  const startLiveSession = async () => {
      setIsLiveMode(true);
      
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
          alert("API Key not found");
          setIsLiveMode(false);
          return;
      }

      try {
          const ai = new GoogleGenAI({ apiKey });
          
          // Setup Audio Context - Output usually 24kHz from Gemini Live
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext({ sampleRate: 24000 }); 
          audioContextRef.current = ctx;
          nextStartTimeRef.current = ctx.currentTime;

          // Connect Live Session
          const sessionPromise = ai.live.connect({
              model: 'gemini-2.5-flash-native-audio-preview-09-2025',
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                  },
                  systemInstruction: getSystemPrompt(context, allPatients),
              },
              callbacks: {
                  onopen: async () => {
                      setIsLiveConnected(true);
                      console.log("Live session connected");
                      
                      // Start Microphone Stream
                      try {
                          const stream = await navigator.mediaDevices.getUserMedia({ 
                              audio: { 
                                  sampleRate: 16000, 
                                  channelCount: 1,
                                  echoCancellation: true,
                                  noiseSuppression: true
                              } 
                          });
                          const source = ctx.createMediaStreamSource(stream);
                          inputSourceRef.current = source;
                          
                          // Processor to capture PCM
                          // Using ScriptProcessor for wider compat in simple demo
                          const processor = ctx.createScriptProcessor(4096, 1, 1);
                          processorRef.current = processor;

                          processor.onaudioprocess = (e) => {
                              const inputData = e.inputBuffer.getChannelData(0);
                              
                              // Simple visualizer
                              let sum = 0;
                              for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                              setVolumeLevel(Math.sqrt(sum / inputData.length) * 10);

                              // Convert to 16-bit PCM for Gemini
                              const pcm16 = floatTo16BitPCM(inputData);
                              const base64Data = arrayBufferToBase64(pcm16);
                              
                              sessionPromise.then(session => {
                                  session.sendRealtimeInput({
                                      media: {
                                          mimeType: "audio/pcm;rate=16000",
                                          data: base64Data
                                      }
                                  });
                              });
                          };

                          source.connect(processor);
                          // Connect to mute node to keep processor alive
                          const muteNode = ctx.createGain();
                          muteNode.gain.value = 0;
                          processor.connect(muteNode);
                          muteNode.connect(ctx.destination);

                      } catch (err) {
                          console.error("Mic Error", err);
                          stopLiveSession();
                      }
                  },
                  onmessage: async (msg: LiveServerMessage) => {
                      // Handle Audio Output
                      const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                      if (audioData) {
                          const audioBytes = base64ToUint8Array(audioData);
                          // Convert PCM 16bit back to Float32 for Web Audio API
                          const int16 = new Int16Array(audioBytes.buffer);
                          const float32 = new Float32Array(int16.length);
                          for(let i=0; i<int16.length; i++) {
                              float32[i] = int16[i] / 32768.0;
                          }
                          
                          const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
                          audioBuffer.copyToChannel(float32, 0);

                          const source = ctx.createBufferSource();
                          source.buffer = audioBuffer;
                          source.connect(ctx.destination);
                          
                          // Gapless Playback Scheduling
                          const now = ctx.currentTime;
                          // If nextStartTime is in the past (gap), jump to now. 
                          // Add small buffer (0.05s) to prevent overlap clicks if network jitter
                          const start = Math.max(now, nextStartTimeRef.current);
                          
                          source.start(start);
                          nextStartTimeRef.current = start + audioBuffer.duration;
                          
                          sourcesRef.current.push(source);
                          source.onended = () => {
                              // Cleanup ended sources
                              sourcesRef.current = sourcesRef.current.filter(s => s !== source);
                          };
                      }
                      
                      // Handle Interruption (User spoke)
                      if (msg.serverContent?.interrupted) {
                          sourcesRef.current.forEach(s => s.stop());
                          sourcesRef.current = [];
                          nextStartTimeRef.current = 0; // Reset timeline
                      }
                  },
                  onclose: () => {
                      console.log("Live session closed");
                      setIsLiveConnected(false);
                  },
                  onerror: (err) => {
                      console.error("Live session error", err);
                      setIsLiveConnected(false);
                  }
              }
          });
          
          liveSessionRef.current = sessionPromise;

      } catch (e) {
          console.error("Failed to start live session", e);
          setIsLiveMode(false);
      }
  };

  const stopLiveSession = () => {
      // Close Gemini Session
      if (liveSessionRef.current) {
          liveSessionRef.current.then((session: any) => session.close());
          liveSessionRef.current = null;
      }
      
      // Stop Audio Context
      if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
      }
      
      // Stop Mic / Processor
      if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current = null;
      }
      if (inputSourceRef.current) {
          inputSourceRef.current.disconnect();
          inputSourceRef.current = null;
      }

      setIsLiveConnected(false);
      setIsLiveMode(false);
      setVolumeLevel(0);
      nextStartTimeRef.current = 0;
      sourcesRef.current = [];
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[55]"
            onClick={onClose}
        />
      )}

      {/* Slide-over Panel */}
      <div className={`
        fixed top-0 right-0 h-full w-full sm:w-[400px] z-[60]
        bg-glass-panel border-l border-glass-border shadow-2xl backdrop-blur-xl
        transform transition-transform duration-300 ease-out flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-glass-border bg-gradient-to-r from-indigo-600/10 to-purple-600/10 shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-main text-lg leading-tight">Clinical Assistant</h2>
                    <p className="text-[10px] text-muted font-mono uppercase tracking-wider">Gemini 2.5 Flash</p>
                </div>
            </div>
            <div className="flex gap-2">
                {!isLiveMode && (
                    <>
                        <button 
                            onClick={startLiveSession}
                            className="p-2 text-indigo-600 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors flex items-center gap-2" 
                            title="Start Live Voice"
                        >
                            <Mic size={18} />
                        </button>
                        <button onClick={handleClear} className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Clear Chat">
                            <Trash2 size={18} />
                        </button>
                    </>
                )}
                <button onClick={onClose} className="p-2 text-muted hover:text-main hover:bg-glass-depth rounded-lg transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Content Area: Either Text Chat or Live Visualizer */}
        <div className="flex-1 overflow-hidden relative bg-glass-depth/30 flex flex-col">
            {isLiveMode ? (
                // Live Mode Visualizer
                <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in">
                    <div className="relative">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-100 ${isLiveConnected ? 'bg-indigo-500/10 border-4 border-indigo-500/30' : 'bg-gray-500/10 border-4 border-gray-500/20'}`}>
                            <Activity 
                                size={48} 
                                className={`${isLiveConnected ? 'text-indigo-500' : 'text-gray-400'}`} 
                                style={{ transform: `scale(${1 + volumeLevel})` }}
                            />
                        </div>
                        {isLiveConnected && (
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-400 opacity-50 animate-ping pointer-events-none"></div>
                        )}
                    </div>
                    
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-main">{isLiveConnected ? "Live Session Active" : "Connecting..."}</h3>
                        <p className="text-sm text-muted max-w-[250px]">
                            Hands-free mode enabled. Speak naturally to discuss patient data.
                        </p>
                    </div>

                    {isLiveConnected && (
                        <div className="flex gap-2">
                            <div className="h-4 w-1 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                            <div className="h-4 w-1 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="h-4 w-1 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <div className="h-4 w-1 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                        </div>
                    )}

                    <button 
                        onClick={stopLiveSession}
                        className="px-6 py-3 rounded-full bg-red-500/10 text-red-600 font-bold hover:bg-red-500/20 transition-all flex items-center gap-2 border border-red-500/20"
                    >
                        <MicOff size={18} /> End Session
                    </button>
                </div>
            ) : (
                // Text Chat Mode
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center shrink-0 border
                                ${msg.role === 'user' 
                                    ? 'bg-glass-depth border-glass-border text-muted' 
                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}
                            `}>
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            
                            <div className={`
                                max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 rounded-tr-none'
                                    : 'bg-glass-panel border border-glass-border text-main rounded-tl-none'}
                            `}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-indigo-500" />
                             </div>
                             <div className="bg-glass-panel border border-glass-border rounded-2xl rounded-tl-none p-4 flex items-center gap-1">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                             </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>

        {/* Input (Only in Text Mode) */}
        {!isLiveMode && (
            <div className="p-4 bg-glass-panel border-t border-glass-border shrink-0">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder={context ? "Ask about this patient..." : "Ask about any patient..."}
                        className="w-full bg-glass-depth border border-glass-border rounded-xl py-4 pl-4 pr-12 text-sm text-main placeholder-muted focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`
                            absolute right-2 p-2 rounded-lg transition-all
                            ${input.trim() && !isLoading 
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95' 
                                : 'bg-transparent text-muted cursor-not-allowed'}
                        `}
                    >
                        {isLoading ? <StopCircle size={18} className="animate-pulse"/> : <Send size={18} />}
                    </button>
                </div>
                {context && (
                    <div className="mt-2 text-[10px] text-indigo-500 flex items-center gap-1 px-1">
                        <Sparkles size={10} /> Context Active: {context.split('\n')[0].substring(0, 40)}...
                    </div>
                )}
            </div>
        )}
      </div>
    </>
  );
};

export default AIAssistant;
