/**
 * The Audio port (ARCHITECTURE.md §5). Voice is a FUTURE plug-in; the interface exists from
 * day one so adding TTS later is purely additive. The default implementation is a no-op.
 */
export interface VoiceLine {
  text: string;
  voiceId?: string;
}
export type SfxId = string;

export interface AudioOut {
  speak(line: VoiceLine): void;
  play(sfx: SfxId): void;
}

export function createNoopAudio(): AudioOut {
  return { speak: () => undefined, play: () => undefined };
}
