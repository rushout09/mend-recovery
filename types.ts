export interface Protocol {
  id: string;
  name: string;
  description: string;
  focusArea: string;
  keyInstructions: string[];
}

export enum AppState {
  SETUP = 'SETUP',
  SESSION = 'SESSION',
  SUMMARY = 'SUMMARY'
}

export interface SessionMetrics {
  startTime: number;
  duration: number; // seconds
  correctionsCount: number;
}
