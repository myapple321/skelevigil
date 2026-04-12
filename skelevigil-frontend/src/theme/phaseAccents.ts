/** Phase CTA / Vigil accents — aligned with Phases screen Play now buttons. */
export const PHASE_ACCENTS = {
  glimpse: {
    primary: '#8A8E91',
    title: 'The Glimpse',
  },
  stare: {
    primary: '#0E9595',
    title: 'The Stare',
  },
  trance: {
    primary: '#F5BF8A',
    title: 'The Trance',
  },
} as const;

export type VigilPhaseId = keyof typeof PHASE_ACCENTS;

export function parseVigilPhaseParam(raw: string | string[] | undefined): VigilPhaseId {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'stare' || v === 'trance' || v === 'glimpse') return v;
  return 'glimpse';
}
