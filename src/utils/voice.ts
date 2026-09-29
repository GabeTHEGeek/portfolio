export const VOICE_DISCLOSURE = "Hey, I’m Gabriel’s digital counterpart. What’s on your mind?";
export const VOICE_RETURN_GREETING = "Hey, welcome back. What’s on your mind?";

export const isGreeting = (text: string) =>
  /^(hello|hi|hey|good morning|good afternoon|good evening)( there)?[!.?\s]*$/i.test(text.trim());

export const speechText = (text: string) => text
  .replace(/https?:\/\/\S+/g, '')
  .replace(/[*_`#]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const formatTimer = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

export interface VoiceProvider {
  synthesize(text: string): AsyncIterable<never>;
  cancel(): void;
  setMuted?(muted: boolean): void;
}

type RecognitionLike = { start(): void; stop(): void; continuous: boolean; interimResults: boolean; lang: string; onresult?: (event: any) => void; onerror?: (event: any) => void; onend?: () => void };

/** Browser-native fallback: no server key, recording, or external voice provider required. */
export class BrowserSpeechVoiceProvider implements VoiceProvider {
  private muted = false;
  setMuted(muted: boolean) { this.muted = muted; if (muted) this.cancel(); }
  async *synthesize(text: string): AsyncIterable<never> {
    if (this.muted || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(speechText(text));
    utterance.rate = 1.02;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    await new Promise<void>((resolve) => { utterance.onend = () => resolve(); utterance.onerror = () => resolve(); });
  }
  cancel() { window.speechSynthesis?.cancel(); }
}

export class ServerTTSVoiceProvider implements VoiceProvider {
  private muted = false;
  private controller: AbortController | null = null;
  private audio: HTMLAudioElement | null = null;
  setMuted(muted: boolean) { this.muted = muted; if (muted) this.cancel(); }
  async *synthesize(text: string): AsyncIterable<never> {
    if (this.muted) return;
    this.controller = new AbortController();
    try {
      const response = await fetch('/.netlify/functions/ask-gabriel-voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: speechText(text) }), signal: this.controller.signal });
      if (!response.ok) throw new Error('Server voice unavailable');
      const url = URL.createObjectURL(await response.blob());
      this.audio = new Audio(url);
      await this.audio.play();
      await new Promise<void>((resolve, reject) => {
        this.audio!.onended = () => resolve();
        this.audio!.onerror = () => reject(new Error('OpenAI voice playback failed'));
      });
      URL.revokeObjectURL(url);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') throw error;
    } finally { this.controller = null; this.audio = null; }
  }
  cancel() { this.controller?.abort(); if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; } }
}

export const getSpeechRecognition = () => {
  const scope = window as typeof window & { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  const Constructor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
};
