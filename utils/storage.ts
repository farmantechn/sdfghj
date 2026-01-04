import { ProjectConfig, Scene } from '../types';

const STORAGE_KEYS = {
  CONFIG: 'veo_director_config',
  SCENES: 'veo_director_scenes',
};

export const saveProject = (config: ProjectConfig, scenes: Scene[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    localStorage.setItem(STORAGE_KEYS.SCENES, JSON.stringify(scenes));
  } catch (e) {
    console.error('Failed to save project', e);
  }
};

export const loadProject = (): { config: ProjectConfig | null; scenes: Scene[] | null } => {
  try {
    const configStr = localStorage.getItem(STORAGE_KEYS.CONFIG);
    const scenesStr = localStorage.getItem(STORAGE_KEYS.SCENES);
    return {
      config: configStr ? JSON.parse(configStr) : null,
      scenes: scenesStr ? JSON.parse(scenesStr) : null,
    };
  } catch (e) {
    console.error('Failed to load project', e);
    return { config: null, scenes: null };
  }
};

export const clearProject = () => {
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  localStorage.removeItem(STORAGE_KEYS.SCENES);
};