export enum AspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface SceneInput {
  scene: number | string;
  prompt: string;
}

export interface Scene extends SceneInput {
  id: string;
  status: GenerationStatus;
  videoUrl?: string;
  error?: string;
  finalPrompt: string; // The combined style + scene prompt
}

export interface ProjectConfig {
  apiKey: string;
  aspectRatio: AspectRatio;
  stylePrompt: string;
  projectName: string;
}

export interface VideoGenerationResult {
  uri: string | null;
  error?: string;
}