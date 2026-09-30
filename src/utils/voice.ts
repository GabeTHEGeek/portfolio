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
  prepare?(): void;
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

const PCM_SAMPLE_RATE = 24_000;
const PCM_MIN_CHUNK_BYTES = 9_600; // 200 ms of mono, 16-bit audio

export const pcm16ToFloat32 = (bytes: Uint8Array) => {
  if (bytes.byteLength % 2) throw new Error('Incomplete PCM sample');
  const samples = new Float32Array(bytes.byteLength / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32_768;
  return samples;
};

export class ServerTTSVoiceProvider implements VoiceProvider {
  private muted = false;
  private controller: AbortController | null = null;
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private stopPlayback: (() => void) | null = null;

  prepare() {
    if (typeof AudioContext === 'undefined') return;
    try {
      this.audioContext ??= new AudioContext();
      void this.audioContext.resume().catch(() => {});
    } catch { this.audioContext = null; }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.cancel();
    else this.prepare();
  }

  async *synthesize(text: string): AsyncIterable<never> {
    if (this.muted) return;
    const controller = new AbortController();
    this.controller = controller;
    const format = this.audioContext ? 'pcm' : 'mp3';
    try {
      const response = await fetch('/.netlify/functions/ask-gabriel-voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: speechText(text), format }), signal: controller.signal });
      if (!response.ok) throw new Error('Server voice unavailable');
      if (format === 'pcm') await this.playPcm(response, controller.signal);
      else await this.playMp3(response);
    } catch (error) {
      if (!controller.signal.aborted && (error as Error).name !== 'AbortError') throw error;
    } finally {
      if (this.controller === controller) this.controller = null;
      this.stopPlayback = null;
      this.audio = null;
    }
  }

  private async playPcm(response: Response, signal: AbortSignal) {
    const context = this.audioContext;
    if (!context) throw new Error('Streaming audio is unavailable');
    await context.resume();
    const stream = response.body ?? new Blob([await response.arrayBuffer()]).stream();
    const reader = stream.getReader();
    const sources = new Set<AudioBufferSourceNode>();
    let pending = new Uint8Array(0);
    let nextStart = context.currentTime + 0.05;
    let streamEnded = false;
    let playedAudio = false;
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => { finish = resolve; });
    const settle = () => { if (streamEnded && sources.size === 0) finish(); };
    const stop = () => {
      streamEnded = true;
      for (const source of sources) { try { source.stop(); } catch {} }
      finish();
    };
    this.stopPlayback = stop;

    const schedule = (bytes: Uint8Array) => {
      const samples = pcm16ToFloat32(bytes);
      const buffer = context.createBuffer(1, samples.length, PCM_SAMPLE_RATE);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => { sources.delete(source); source.disconnect(); settle(); };
      sources.add(source);
      nextStart = Math.max(nextStart, context.currentTime + 0.05);
      source.start(nextStart);
      nextStart += buffer.duration;
      playedAudio = true;
    };

    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        const combined = new Uint8Array(pending.byteLength + value.byteLength);
        combined.set(pending);
        combined.set(value, pending.byteLength);
        pending = combined;
        const evenLength = pending.byteLength & ~1;
        if (evenLength >= PCM_MIN_CHUNK_BYTES) {
          schedule(pending.slice(0, evenLength));
          pending = pending.slice(evenLength);
        }
      }
      if (signal.aborted) return;
      if (pending.byteLength > 1) schedule(pending.slice(0, pending.byteLength & ~1));
      if (!playedAudio) throw new Error('OpenAI returned no audio');
      streamEnded = true;
      settle();
      await finished;
    } catch (error) {
      stop();
      throw error;
    } finally {
      reader.releaseLock();
      if (this.stopPlayback === stop) this.stopPlayback = null;
      if (signal.aborted) stop();
    }
  }

  private async playMp3(response: Response) {
    const url = URL.createObjectURL(await response.blob());
    try {
      const audio = new Audio(url);
      this.audio = audio;
      await new Promise<void>((resolve, reject) => {
        this.stopPlayback = resolve;
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('OpenAI voice playback failed'));
        void audio.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  cancel() {
    this.controller?.abort();
    this.stopPlayback?.();
    if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; }
    if (this.audioContext) { void this.audioContext.close().catch(() => {}); this.audioContext = null; }
  }
}

export const getSpeechRecognition = () => {
  const scope = window as typeof window & { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  const Constructor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
};
