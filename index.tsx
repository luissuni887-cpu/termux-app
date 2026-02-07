import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { 
  GoogleGenAI, 
  LiveServerMessage, 
  Modality
} from "@google/genai";
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Mic, 
  Send, 
  Sparkles, 
  Search, 
  Sun, 
  Menu, 
  X,
  Loader2,
  StopCircle,
  Volume2,
  Download,
  TrendingUp,
  Github,
  Code2,
  Zap,
  Camera
} from "lucide-react";
import Markdown from 'react-markdown';

// --- Global Types & Configuration ---

type ViewMode = 'chat' | 'image' | 'live' | 'evolution';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  grounding?: { uri: string; title: string }[];
}

interface GeneratedImage {
  url: string;
  prompt: string;
}

// Instruções atualizadas para Português e perfil especialista
const SYSTEM_INSTRUCTION = `Você é a Suni AI, uma inteligência artificial extremamente rápida, brilhante e especialista em todas as áreas do conhecimento.
Sua personalidade é profissional, direta, calorosa e otimista.
Você entende o contexto do usuário quase instantaneamente.
Idioma de resposta: Português do Brasil (PT-BR).

CAPACIDADES:
1. Raciocínio avançado e lógico.
2. Especialista em TI, Engenharia, Ciências, Artes e Humanidades.
3. Se o contexto envolver código, aja como um Engenheiro de Software Sênior (Clean Code, Best Practices).
4. Se o usuário fornecer imagens (no chat ou no modo live), analise-as com precisão técnica e descreva o que vê se for relevante.

OBJETIVO:
Fornecer a resposta mais precisa, rápida e útil possível. Não enrole. Vá direto ao ponto com profundidade de especialista.`;

// --- Audio Utils for Live API ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
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

// --- Components ---

const EvolutionGraph = () => (
  <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-6 relative overflow-hidden shadow-2xl">
    <div className="flex justify-between items-start mb-6 relative z-10">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          Curva de Evolução
        </h3>
        <p className="text-slate-400 text-sm">Crescimento de conhecimento e interação</p>
      </div>
      <div className="text-right">
        <div className="text-3xl font-bold text-white">Nível 42</div>
        <div className="text-xs text-green-400 font-medium flex items-center justify-end gap-1">
          <Zap className="w-3 h-3" /> Top 1% Especialista
        </div>
      </div>
    </div>
    
    <div className="h-64 w-full relative">
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
        <div className="border-t border-slate-200 w-full"></div>
        <div className="border-t border-slate-200 w-full"></div>
        <div className="border-t border-slate-200 w-full"></div>
        <div className="border-t border-slate-200 w-full"></div>
      </div>
      
      {/* Chart SVG */}
      <svg viewBox="0 0 100 50" className="w-full h-full absolute bottom-0 left-0 right-0" preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{stopColor:"rgb(245, 158, 11)", stopOpacity:0.4}} />
            <stop offset="100%" style={{stopColor:"rgb(245, 158, 11)", stopOpacity:0}} />
          </linearGradient>
        </defs>
        {/* Animated Path */}
        <path d="M0,45 Q10,40 20,42 T40,30 T60,25 T80,10 L100,5 L100,50 L0,50 Z" fill="url(#grad)" className="animate-[pulse_4s_ease-in-out_infinite]" />
        <path d="M0,45 Q10,40 20,42 T40,30 T60,25 T80,10 L100,5" fill="none" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
        
        {/* Data Points */}
        <circle cx="20" cy="42" r="1" fill="#fff" />
        <circle cx="40" cy="30" r="1" fill="#fff" />
        <circle cx="60" cy="25" r="1" fill="#fff" />
        <circle cx="80" cy="10" r="1" fill="#fff" />
        <circle cx="100" cy="5" r="1.5" fill="#fff" className="animate-ping" />
      </svg>
    </div>

    <div className="grid grid-cols-3 gap-4 mt-6 relative z-10">
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <div className="text-slate-400 text-xs uppercase tracking-wider">Ideias</div>
        <div className="text-xl font-bold text-white">1,204</div>
      </div>
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <div className="text-slate-400 text-xs uppercase tracking-wider">Código</div>
        <div className="text-xl font-bold text-white">85k</div>
      </div>
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <div className="text-slate-400 text-xs uppercase tracking-wider">Precisão</div>
        <div className="text-xl font-bold text-white">99.8%</div>
      </div>
    </div>
  </div>
);

const App = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGithubConnected, setIsGithubConnected] = useState(false);

  // -- Chat State --
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Olá! Eu sou a Suni AI. Especialista em todas as áreas. Como posso ajudar você hoje?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // -- Image Gen State --
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // -- Live API State --
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<{in: string, out: string}>({in:'', out:''});
  const liveSessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // --- Effects ---

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, currentView]);

  // Clean up Live session on unmount
  useEffect(() => {
    return () => {
      disconnectLive();
    };
  }, []);

  // --- Helpers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLiveImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isLiveConnected && liveSessionRef.current) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            const mimeType = base64String.split(':')[1].split(';')[0];

            liveSessionRef.current?.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
                setLiveTranscript(prev => ({...prev, in: prev.in + ' [Imagem Enviada para Análise] ' }));
            });
        };
        reader.readAsDataURL(file);
    } else if (!isLiveConnected) {
        alert("Inicie a conversa primeiro para enviar imagens.");
    }
  };

  // --- Logic: Chat ---

  const sendChatMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: inputText,
      image: selectedImage || undefined
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputText("");
    setSelectedImage(null);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const parts: any[] = [];
      
      // Handle Image
      if (userMsg.image) {
        const base64Data = userMsg.image.split(',')[1];
        const mimeType = userMsg.image.split(':')[1].split(';')[0];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      // Handle Text with Extra Context
      let finalPrompt = userMsg.text;
      if (isGithubConnected) {
        finalPrompt = `[CONTEXTO GITHUB: ATIVO - Aja como Engenheiro de Software Sênior] ${finalPrompt}`;
      }
      parts.push({ text: finalPrompt });

      // Use flash for "Very fast" understanding as requested, unless search is on
      const modelName = useSearch ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      
      const config: any = {
        systemInstruction: SYSTEM_INSTRUCTION,
      };

      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config
      });

      const text = response.text || "Não consegui gerar uma resposta de texto.";
      
      // Extract grounding metadata if available
      let groundingLinks: { uri: string; title: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            groundingLinks.push({ uri: chunk.web.uri, title: chunk.web.title });
          }
        });
      }

      setChatMessages(prev => [...prev, {
        role: 'model',
        text: text,
        grounding: groundingLinks.length > 0 ? groundingLinks : undefined
      }]);

    } catch (error) {
      console.error("Chat Error:", error);
      setChatMessages(prev => [...prev, {
        role: 'model',
        text: "Desculpe, encontrei um erro ao processar sua solicitação."
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- Logic: Image Generation ---

  const generateImage = async () => {
    if (!imagePrompt.trim()) return;

    setIsImageLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: imagePrompt }]
        },
        config: {}
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64String = part.inlineData.data;
                const url = `data:image/png;base64,${base64String}`;
                setGeneratedImages(prev => [{ url, prompt: imagePrompt }, ...prev]);
                foundImage = true;
            }
        }
      }

      if (!foundImage) {
          alert("A Suni não conseguiu gerar a imagem. O modelo pode ter recusado o prompt.");
      }

    } catch (error) {
      console.error("Image Gen Error:", error);
      alert("Falha ao gerar imagem.");
    } finally {
      setIsImageLoading(false);
    }
  };

  // --- Logic: Live API ---

  const connectLive = async () => {
    if (isLiveConnected) return;

    try {
      setIsLiveConnected(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Audio Contexts
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      audioContextRef.current = audioCtx;
      inputAudioContextRef.current = inputCtx;
      
      const outputNode = audioCtx.createGain();
      outputNode.connect(audioCtx.destination);

      // Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      scriptProcessor.connect(inputCtx.destination);
      source.connect(scriptProcessor);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
            },
            systemInstruction: SYSTEM_INSTRUCTION,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
        callbacks: {
            onopen: () => {
                console.log("Sessão Live Conectada");
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio && audioCtx) {
                    const audioBuffer = await decodeAudioData(
                        decode(base64Audio),
                        audioCtx,
                        24000,
                        1
                    );
                    
                    const sourceNode = audioCtx.createBufferSource();
                    sourceNode.buffer = audioBuffer;
                    sourceNode.connect(outputNode);
                    
                    const currentTime = audioCtx.currentTime;
                    const startTime = Math.max(nextStartTimeRef.current, currentTime);
                    sourceNode.start(startTime);
                    
                    nextStartTimeRef.current = startTime + audioBuffer.duration;
                    
                    sourceNode.addEventListener('ended', () => {
                        sourcesRef.current.delete(sourceNode);
                    });
                    sourcesRef.current.add(sourceNode);
                }

                if (message.serverContent?.inputTranscription) {
                    setLiveTranscript(prev => ({...prev, in: prev.in + message.serverContent?.inputTranscription?.text}));
                }
                if (message.serverContent?.outputTranscription) {
                    setLiveTranscript(prev => ({...prev, out: prev.out + message.serverContent?.outputTranscription?.text}));
                }

                if (message.serverContent?.interrupted) {
                    sourcesRef.current.forEach(node => node.stop());
                    sourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                    setLiveTranscript({in: '', out: ''});
                }
                
                if (message.serverContent?.turnComplete) {
                     setTimeout(() => setLiveTranscript({in:'', out:''}), 2000);
                }
            },
            onclose: () => {
                console.log("Sessão Live Fechada");
                setIsLiveConnected(false);
            },
            onerror: (e) => {
                console.error("Erro na Sessão Live", e);
                setIsLiveConnected(false);
            }
        }
      });

      liveSessionRef.current = sessionPromise;

      scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBlob = createBlob(inputData);
          sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
          });
      };

    } catch (err) {
      console.error("Falha ao iniciar sessão live", err);
      setIsLiveConnected(false);
    }
  };

  const disconnectLive = () => {
    if (liveSessionRef.current) {
        liveSessionRef.current.then(session => session.close());
        liveSessionRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    setIsLiveConnected(false);
    nextStartTimeRef.current = 0;
  };


  // --- Render ---

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-slate-200 font-sans">
      
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden relative z-20`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Suni AI</h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <button 
            onClick={() => setCurrentView('chat')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentView === 'chat' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat Principal
          </button>
          <button 
            onClick={() => setCurrentView('image')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentView === 'image' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            <ImageIcon className="w-4 h-4" />
            Estúdio de Imagem
          </button>
          <button 
            onClick={() => setCurrentView('live')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentView === 'live' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            <Mic className="w-4 h-4" />
            Voz Ao Vivo
          </button>
          <button 
            onClick={() => setCurrentView('evolution')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentView === 'evolution' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
          >
            <TrendingUp className="w-4 h-4" />
            Evolução
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button 
            onClick={() => setIsGithubConnected(!isGithubConnected)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
              isGithubConnected 
              ? 'bg-slate-800 text-white border-slate-600 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
              : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Github className="w-4 h-4" />
            {isGithubConnected ? 'GitHub Conectado' : 'Conectar GitHub'}
            {isGithubConnected && <div className="w-2 h-2 rounded-full bg-green-500 ml-auto animate-pulse"></div>}
          </button>

          <div className="text-xs text-slate-500 text-center pt-2">
            Suni Core v3.0 • Brasil
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative w-full h-full">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur flex items-center px-4 justify-between z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-medium text-slate-300 flex items-center gap-2">
            {currentView === 'chat' && (
              <>
                Suni Chat
                {isGithubConnected && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-green-400 border border-slate-700">MODO DEV</span>}
              </>
            )}
            {currentView === 'image' && 'Suni Estúdio'}
            {currentView === 'live' && 'Suni Live'}
            {currentView === 'evolution' && 'Evolução do Usuário'}
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400 border border-slate-700">
            AI
          </div>
        </header>

        {/* View: Chat */}
        {currentView === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 md:p-6 ${
                    msg.role === 'user' 
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' 
                      : 'glass-panel text-slate-200'
                  }`}>
                    {msg.image && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                        <img src={msg.image} alt="User upload" className="max-h-64 object-contain" />
                      </div>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                    {msg.grounding && (
                      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                        {msg.grounding.map((link, i) => (
                          <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" 
                             className="text-xs flex items-center gap-1 bg-black/20 hover:bg-black/40 px-2 py-1 rounded transition-colors text-amber-200/80">
                            <Search className="w-3 h-3" />
                            {link.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="glass-panel rounded-2xl p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span className="text-sm text-slate-400">Suni está processando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-950">
              {selectedImage && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-slate-900 rounded-lg w-fit border border-slate-800">
                    <img src={selectedImage} alt="Selected" className="w-8 h-8 rounded object-cover" />
                    <span className="text-xs text-slate-400">Imagem anexada</span>
                    <button onClick={() => setSelectedImage(null)} className="text-slate-500 hover:text-red-400">
                        <X className="w-3 h-3" />
                    </button>
                </div>
              )}
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                 <div className="flex items-center gap-2 mb-1">
                    <button 
                        onClick={() => setUseSearch(!useSearch)}
                        className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${useSearch ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                    >
                        <Search className="w-3 h-3" />
                        Google Search {useSearch ? 'Ligado' : 'Desligado'}
                    </button>
                 </div>
                 <div className="relative flex items-end gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800 focus-within:border-amber-500/50 transition-all">
                    <label className="p-2 text-slate-400 hover:text-amber-400 cursor-pointer rounded-lg hover:bg-slate-800 transition-colors">
                        <ImageIcon className="w-5 h-5" />
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                        placeholder={isGithubConnected ? "Pergunte algo ao Especialista em Dev..." : "Pergunte qualquer coisa..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 resize-none py-2 max-h-32 min-h-[44px]"
                        rows={1}
                    />
                    <button 
                        onClick={sendChatMessage}
                        disabled={isChatLoading || (!inputText && !selectedImage)}
                        className="p-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-lg transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* View: Image Studio */}
        {currentView === 'image' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-slate-900">
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white">Suni Estúdio</h2>
                <p className="text-slate-400">Crie visuais incríveis com o poder do Gemini 2.5</p>
              </div>

              <div className="glass-panel p-2 rounded-2xl flex gap-2 border border-slate-700/50 shadow-xl">
                <input 
                  type="text" 
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Descreva a imagem que você quer criar..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 px-4"
                />
                <button 
                  onClick={generateImage}
                  disabled={isImageLoading || !imagePrompt}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isImageLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Gerar
                </button>
              </div>

              {/* Gallery */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedImages.map((img, idx) => (
                  <div key={idx} className="group relative rounded-xl overflow-hidden aspect-square border border-slate-800 bg-slate-950">
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <p className="text-sm text-white line-clamp-2 mb-3">{img.prompt}</p>
                      <a href={img.url} download={`suni-generated-${idx}.png`} className="bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg flex items-center justify-center gap-2 backdrop-blur-sm transition-colors">
                        <Download className="w-4 h-4" /> Salvar
                      </a>
                    </div>
                  </div>
                ))}
                {generatedImages.length === 0 && !isImageLoading && (
                  <div className="col-span-full py-20 text-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma imagem gerada ainda. Comece a criar!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View: Evolution (NEW) */}
        {currentView === 'evolution' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-slate-900">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-bold text-white">Sua Evolução</h2>
                <p className="text-slate-400">Acompanhe seu crescimento junto com a Suni AI</p>
              </div>
              
              <EvolutionGraph />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Code2 className="w-5 h-5"/></div>
                     <h3 className="font-semibold text-white">Habilidades de Dev</h3>
                  </div>
                  <div className="space-y-4">
                     <div>
                       <div className="flex justify-between text-sm text-slate-300 mb-1">
                         <span>Python</span>
                         <span>98%</span>
                       </div>
                       <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 w-[98%]"></div>
                       </div>
                     </div>
                     <div>
                       <div className="flex justify-between text-sm text-slate-300 mb-1">
                         <span>React/TS</span>
                         <span>95%</span>
                       </div>
                       <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 w-[95%]"></div>
                       </div>
                     </div>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Sparkles className="w-5 h-5"/></div>
                     <h3 className="font-semibold text-white">Criatividade</h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Você tem explorado conceitos avançados de IA e design. 
                    Seu perfil indica uma forte tendência para inovação tecnológica.
                  </p>
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-200 text-sm">
                    Recomendação: Experimente gerar diagramas de arquitetura no Estúdio.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View: Live */}
        {currentView === 'live' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 relative overflow-hidden">
            {/* Ambient Background */}
            <div className={`absolute w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[100px] transition-all duration-1000 ${isLiveConnected ? 'scale-110 opacity-60' : 'scale-75 opacity-30'}`} />
            
            <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg text-center px-4">
               <div className="space-y-2">
                 <h2 className="text-4xl font-bold text-white tracking-tight">Suni Live</h2>
                 <p className="text-slate-400">Conversa em tempo real (Português)</p>
               </div>

               {/* Visualizer Circle */}
               <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isLiveConnected ? 'border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.4)]' : 'border-slate-800 bg-slate-950'}`}>
                 {isLiveConnected ? (
                    <div className="flex gap-1 items-center h-20">
                        {/* Fake visualizer bars */}
                        <div className="w-2 bg-amber-400 h-10 animate-pulse rounded-full" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 bg-amber-400 h-16 animate-pulse rounded-full" style={{animationDelay: '100ms'}}></div>
                        <div className="w-2 bg-amber-400 h-12 animate-pulse rounded-full" style={{animationDelay: '200ms'}}></div>
                        <div className="w-2 bg-amber-400 h-20 animate-pulse rounded-full" style={{animationDelay: '300ms'}}></div>
                        <div className="w-2 bg-amber-400 h-14 animate-pulse rounded-full" style={{animationDelay: '150ms'}}></div>
                    </div>
                 ) : (
                    <Mic className="w-16 h-16 text-slate-700" />
                 )}
               </div>

               {/* Transcript Snippets */}
               {isLiveConnected && (liveTranscript.in || liveTranscript.out) && (
                   <div className="min-h-[80px] w-full glass-panel p-4 rounded-xl flex flex-col gap-2 text-sm text-slate-300">
                      {liveTranscript.in && <p className="text-right opacity-60">Você: {liveTranscript.in}</p>}
                      {liveTranscript.out && <p className="text-left text-amber-200">Suni: {liveTranscript.out}</p>}
                   </div>
               )}

               <div className="flex items-center gap-4">
                    <button 
                        onClick={isLiveConnected ? disconnectLive : connectLive}
                        className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 ${isLiveConnected ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'}`}
                    >
                        {isLiveConnected ? (
                            <>
                                <StopCircle className="w-6 h-6" /> Encerrar
                            </>
                        ) : (
                            <>
                                <Volume2 className="w-6 h-6" /> Iniciar
                            </>
                        )}
                    </button>

                    {/* Image Upload for Live API */}
                    {isLiveConnected && (
                       <label className="p-4 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-400/50 cursor-pointer transition-all shadow-lg hover:shadow-amber-500/10 active:scale-95 group relative">
                           <Camera className="w-6 h-6" />
                           <input type="file" accept="image/*" className="hidden" onChange={handleLiveImageUpload} />
                           <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                             Enviar Imagem
                           </span>
                       </label>
                    )}
               </div>
               
               {isLiveConnected && <p className="text-xs text-slate-500 mt-2">Toque na câmera para a Suni ver o que você vê.</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);