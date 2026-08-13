/**
 * OPEN MIND AI - Voice Module
 * 
 * Voice input and output support using Web Speech API
 * and Web Audio API.
 */

export interface VoiceConfig {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface TextToSpeechOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}

// Check browser support
export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

// Speech Recognition (Voice Input)
export class VoiceInput {
  private recognition: SpeechRecognition | null = null;
  private config: VoiceConfig;
  private isListening: boolean = false;
  private onResultCallback?: (result: SpeechRecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;
  private onEndCallback?: () => void;

  constructor(config: VoiceConfig = {}) {
    this.config = {
      lang: config.lang || 'en-US',
      continuous: config.continuous ?? true,
      interimResults: config.interimResults ?? true,
      maxAlternatives: config.maxAlternatives ?? 1,
    };

    if (isSpeechRecognitionSupported()) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = this.config.lang;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          
          const recognitionResult: SpeechRecognitionResult = {
            transcript,
            confidence,
            isFinal: result.isFinal,
          };

          this.onResultCallback?.(recognitionResult);
        }
      };

      this.recognition.onerror = (event) => {
        this.onErrorCallback?.(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onEndCallback?.();
        
        // Restart if continuous mode
        if (this.config.continuous && this.isListening) {
          this.start();
        }
      };
    }
  }

  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  start(): void {
    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition not supported');
      return;
    }

    if (this.isListening) return;

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      this.onErrorCallback?.('Failed to start recognition');
    }
  }

  stop(): void {
    if (!this.recognition || !this.isListening) return;

    try {
      this.recognition.stop();
      this.isListening = false;
    } catch (error) {
      this.onErrorCallback?.('Failed to stop recognition');
    }
  }

  abort(): void {
    if (!this.recognition) return;

    this.recognition.abort();
    this.isListening = false;
  }

  setLanguage(lang: string): void {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

// Text to Speech (Voice Output)
export class VoiceOutput {
  private synth: SpeechSynthesis;
  private config: {
    lang: string;
    rate: number;
    pitch: number;
    volume: number;
  };

  constructor(config: {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}) {
    this.synth = window.speechSynthesis;
    this.config = {
      lang: config.lang || 'en-US',
      rate: config.rate || 1.0,
      pitch: config.pitch || 1.0,
      volume: config.volume || 1.0,
    };
  }

  speak(text: string, options?: Partial<Omit<TextToSpeechOptions, 'text'>>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isSpeechSynthesisSupported()) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || this.config.lang;
      utterance.rate = options?.rate || this.config.rate;
      utterance.pitch = options?.pitch || this.config.pitch;
      utterance.volume = options?.volume || this.config.volume;

      if (options?.voice) {
        utterance.voice = options.voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));

      this.synth.speak(utterance);
    });
  }

  speakAsync(text: string, options?: Partial<Omit<TextToSpeechOptions, 'text'>>): void {
    if (!isSpeechSynthesisSupported()) return;

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.lang || this.config.lang;
    utterance.rate = options?.rate || this.config.rate;
    utterance.pitch = options?.pitch || this.config.pitch;
    utterance.volume = options?.volume || this.config.volume;

    this.synth.speak(utterance);
  }

  stop(): void {
    this.synth.cancel();
  }

  pause(): void {
    this.synth.pause();
  }

  resume(): void {
    this.synth.resume();
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synth.getVoices();
  }

  getVoicesByLanguage(lang: string): SpeechSynthesisVoice[] {
    return this.synth.getVoices().filter(voice => voice.lang.startsWith(lang));
  }

  setDefaultLanguage(lang: string): void {
    this.config.lang = lang;
  }

  setDefaultRate(rate: number): void {
    this.config.rate = Math.max(0.1, Math.min(10, rate));
  }

  setDefaultPitch(pitch: number): void {
    this.config.pitch = Math.max(0, Math.min(2, pitch));
  }

  setDefaultVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  isPaused(): boolean {
    return this.synth.paused;
  }
}

// Combined Voice Manager
export class VoiceManager {
  private voiceInput: VoiceInput;
  private voiceOutput: VoiceOutput;
  private isEnabled: boolean = true;

  constructor(inputConfig?: VoiceConfig, outputConfig?: ConstructorParameters<typeof VoiceOutput>[0]) {
    this.voiceInput = new VoiceInput(inputConfig);
    this.voiceOutput = new VoiceOutput(outputConfig);
  }

  startListening(onResult: (result: SpeechRecognitionResult) => void): void {
    if (!this.isEnabled) return;
    this.voiceInput.onResult(onResult);
    this.voiceInput.start();
  }

  stopListening(): void {
    this.voiceInput.stop();
  }

  async speak(text: string): Promise<void> {
    if (!this.isEnabled) return;
    await this.voiceOutput.speak(text);
  }

  speakAsync(text: string): void {
    if (!this.isEnabled) return;
    this.voiceOutput.speakAsync(text);
  }

  stopSpeaking(): void {
    this.voiceOutput.stop();
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
    this.voiceInput.abort();
    this.voiceOutput.stop();
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  getInput(): VoiceInput {
    return this.voiceInput;
  }

  getOutput(): VoiceOutput {
    return this.voiceOutput;
  }

  isInputSupported(): boolean {
    return isSpeechRecognitionSupported();
  }

  isOutputSupported(): boolean {
    return isSpeechSynthesisSupported();
  }
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default {
  VoiceInput,
  VoiceOutput,
  VoiceManager,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
};