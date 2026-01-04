import React, { useState, useEffect, useRef } from 'react';
import { 
  Clapperboard, 
  Settings, 
  Sparkles, 
  Download, 
  Trash2, 
  RefreshCw, 
  AlertCircle,
  Play,
  CheckCircle2,
  FileJson,
  LayoutTemplate,
  Loader2
} from 'lucide-react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  AspectRatio, 
  ProjectConfig, 
  Scene, 
  GenerationStatus, 
  SceneInput 
} from './types';
import { generateVideoScene } from './services/veoService';
import { saveProject, loadProject, clearProject } from './utils/storage';
import { Button } from './components/Button';
import { Input, TextArea } from './components/Input';

// Removed conflicting global declaration.
// We cast window to any to access aistudio methods to avoid type conflicts with global ambient types.

// --- Constants ---
const DEFAULT_JSON_PLACEHOLDER = `[
  { "scene": 1, "prompt": "A cinematic drone shot of a futuristic neon city at night, raining." },
  { "scene": 2, "prompt": "Close up of a cybernetic detective looking at a hologram." }
]`;

const App: React.FC = () => {
  // --- State ---
  const [step, setStep] = useState<number>(1);
  const [config, setConfig] = useState<ProjectConfig>({
    apiKey: '',
    aspectRatio: AspectRatio.LANDSCAPE,
    stylePrompt: '',
    projectName: 'My Veo Movie',
  });
  const [jsonInput, setJsonInput] = useState<string>('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<number | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // --- Effects ---
  useEffect(() => {
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio && await aiStudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    const saved = loadProject();
    if (saved.config && saved.scenes) {
      setConfig(saved.config);
      setScenes(saved.scenes);
      // Auto-advance if we have data, but verify step
      if (saved.scenes.length > 0 && saved.scenes.some(s => s.status !== GenerationStatus.IDLE)) {
        setStep(3);
      }
    }
  }, []);

  useEffect(() => {
    if (scenes.length > 0) {
      saveProject(config, scenes);
    }
  }, [scenes, config]);

  // --- Actions ---

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      // Assume success to handle race condition as per guidelines
      setHasApiKey(true);
    }
  };

  const handleJsonParse = () => {
    try {
      const parsed: SceneInput[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Input must be an array");
      
      const newScenes: Scene[] = parsed.map((item, idx) => ({
        ...item,
        id: crypto.randomUUID(),
        status: GenerationStatus.IDLE,
        finalPrompt: `${config.stylePrompt}. Scene details: ${item.prompt}`.trim(),
      }));

      setScenes(newScenes);
      setStep(3);
    } catch (e) {
      alert("Invalid JSON format. Please ensure it matches the example.");
    }
  };

  const startGeneration = async () => {
    setIsGenerating(true);
    
    // Find first pending or failed scene
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].status === GenerationStatus.COMPLETED) continue;

      setCurrentGeneratingIndex(i);
      updateSceneStatus(i, GenerationStatus.GENERATING);

      const result = await generateVideoScene(
        scenes[i].finalPrompt,
        config.aspectRatio
      );

      if (result.uri) {
        updateSceneStatus(i, GenerationStatus.COMPLETED, result.uri);
      } else {
        updateSceneStatus(i, GenerationStatus.FAILED, undefined, result.error);
        setIsGenerating(false);
        return; // Stop on error to let user fix/retry
      }
    }

    setIsGenerating(false);
    setCurrentGeneratingIndex(null);
  };

  const updateSceneStatus = (index: number, status: GenerationStatus, url?: string, error?: string) => {
    setScenes(prev => {
      const next = [...prev];
      next[index] = { 
        ...next[index], 
        status, 
        videoUrl: url || next[index].videoUrl,
        error: error 
      };
      return next;
    });
  };

  const handleRetry = (index: number) => {
    // Reset status to idle so it can be picked up, then start generation
    updateSceneStatus(index, GenerationStatus.IDLE);
    // If not already running, kick it off
    if (!isGenerating) {
      startGeneration();
    }
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    const folder = zip.folder(config.projectName || "veo-scenes");
    
    // Filter completed scenes
    const completedScenes = scenes.filter(s => s.status === GenerationStatus.COMPLETED && s.videoUrl);
    
    if (completedScenes.length === 0) return;

    await Promise.all(completedScenes.map(async (scene, idx) => {
      if (!scene.videoUrl) return;
      const response = await fetch(scene.videoUrl);
      const blob = await response.blob();
      const fileName = `scene_${String(scene.scene).padStart(2, '0')}.mp4`;
      folder?.file(fileName, blob);
    }));

    const content = await zip.generateAsync({ type: "blob" });
    FileSaver.saveAs(content, `${config.projectName || "veo-project"}.zip`);
  };

  const clearAll = () => {
    if (confirm("Are you sure? This will delete all generated videos.")) {
      clearProject();
      setScenes([]);
      setStep(1);
      setConfig(prev => ({ ...prev, apiKey: '' }));
      setJsonInput('');
    }
  };

  // --- Render Steps ---

  const renderStep1 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <Clapperboard className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Veo Director</h1>
        <p className="text-gray-400">Production-ready video generation suite</p>
      </div>

      <div className="bg-surface p-6 rounded-xl border border-white/5 space-y-6 shadow-2xl">
        <div className="space-y-4">
          <Input 
            label="Project Name"
            placeholder="e.g., Cyberpunk Short Film"
            value={config.projectName}
            onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
          />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-400 ml-1">Google GenAI API Key</label>
            {!hasApiKey ? (
              <div className="p-4 bg-surface border border-white/10 rounded-lg flex flex-col gap-3">
                <p className="text-sm text-gray-400">
                  Veo generation requires a paid API key from a Google Cloud Project.
                </p>
                <Button onClick={handleSelectKey} variant="secondary">
                   Select API Key
                </Button>
                <p className="text-xs text-gray-500">
                   See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-primary hover:underline">billing documentation</a>.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>API Key Selected</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-400 ml-1">Platform Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setConfig({ ...config, aspectRatio: AspectRatio.LANDSCAPE })}
              className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                config.aspectRatio === AspectRatio.LANDSCAPE 
                  ? 'bg-primary/20 border-primary text-white' 
                  : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              <LayoutTemplate className="w-6 h-6 rotate-90" />
              <span className="text-sm font-medium">YouTube (16:9)</span>
            </button>
            
            <button
              onClick={() => setConfig({ ...config, aspectRatio: AspectRatio.PORTRAIT })}
              className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                config.aspectRatio === AspectRatio.PORTRAIT 
                  ? 'bg-primary/20 border-primary text-white' 
                  : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
              }`}
            >
              <LayoutTemplate className="w-6 h-6" />
              <span className="text-sm font-medium">TikTok (9:16)</span>
            </button>
          </div>
          {/* Note: 1:1 is removed as it's not strictly supported in fast-generate-preview per system prompt docs */}
        </div>

        <Button 
          className="w-full h-12 text-lg" 
          disabled={!hasApiKey || !config.projectName}
          onClick={() => setStep(2)}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Character & Style</h2>
          <p className="text-gray-400 text-sm">This description is automatically attached to every scene to maintain consistency.</p>
        </div>
        
        <div className="bg-surface p-6 rounded-xl border border-white/5 space-y-4">
          <div className="flex items-start gap-3 mb-2">
            <div className="p-2 bg-accent/20 rounded-lg text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-white">Global Consistency Prompt</h3>
              <p className="text-xs text-gray-500">Define your main character, lighting, and art style.</p>
            </div>
          </div>
          
          <TextArea 
            label="Style Description"
            placeholder="e.g., Anime style, 90s aesthetic. Main character is a tall woman with silver hair wearing a red leather jacket..."
            rows={6}
            value={config.stylePrompt}
            onChange={(e) => setConfig({ ...config, stylePrompt: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Scene Script</h2>
          <p className="text-gray-400 text-sm">Paste your JSON array containing scene numbers and specific prompts.</p>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-white/5 space-y-4 h-full">
           <div className="flex items-start gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-white">Scene JSON</h3>
              <p className="text-xs text-gray-500">Format: Array of objects with 'scene' and 'prompt'.</p>
            </div>
          </div>

          <TextArea 
            label="JSON Input"
            rows={12}
            className="font-mono text-xs leading-relaxed"
            placeholder={DEFAULT_JSON_PLACEHOLDER}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={handleJsonParse}>Generate Scenes</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {config.projectName}
            <span className="text-sm font-normal text-gray-500 px-3 py-1 bg-white/5 rounded-full border border-white/5">
              {config.aspectRatio}
            </span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {scenes.filter(s => s.status === GenerationStatus.COMPLETED).length} / {scenes.length} Scenes Completed
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={clearAll} icon={<Trash2 className="w-4 h-4" />}>
            New Project
          </Button>
          <Button 
            onClick={downloadAll} 
            disabled={scenes.filter(s => s.status === GenerationStatus.COMPLETED).length === 0}
            icon={<Download className="w-4 h-4" />}
          >
            Download ZIP
          </Button>
          {!isGenerating && scenes.some(s => s.status !== GenerationStatus.COMPLETED) && (
            <Button onClick={startGeneration} icon={<Play className="w-4 h-4" />}>
              Start Generation
            </Button>
          )}
          {isGenerating && (
             <Button disabled isLoading>Generating...</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenes.map((scene, idx) => (
          <div 
            key={scene.id}
            className={`
              relative group rounded-xl overflow-hidden border transition-all duration-300
              ${scene.status === GenerationStatus.GENERATING ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/20' : 'border-white/10 bg-surface'}
            `}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start">
              <span className="bg-black/50 backdrop-blur text-xs font-bold px-2 py-1 rounded text-white border border-white/10">
                Scene {scene.scene}
              </span>
              {scene.status === GenerationStatus.FAILED && (
                 <button onClick={() => handleRetry(idx)} className="bg-red-500/80 p-1.5 rounded hover:bg-red-500 text-white transition-colors">
                   <RefreshCw className="w-3 h-3" />
                 </button>
              )}
            </div>

            {/* Content Area */}
            <div className={`aspect-[${config.aspectRatio.replace(':', '/')}] bg-black relative flex items-center justify-center`}>
              {scene.status === GenerationStatus.IDLE && (
                <div className="text-gray-600 flex flex-col items-center gap-2">
                  <Clapperboard className="w-8 h-8 opacity-20" />
                  <span className="text-xs uppercase tracking-widest opacity-40">Ready</span>
                </div>
              )}
              
              {scene.status === GenerationStatus.PENDING && (
                <div className="text-gray-500 flex flex-col items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
                  <span className="text-xs uppercase tracking-widest opacity-40">Queued</span>
                </div>
              )}

              {scene.status === GenerationStatus.GENERATING && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-xs text-primary font-medium animate-pulse">Creating Magic...</span>
                </div>
              )}

              {scene.status === GenerationStatus.FAILED && (
                <div className="flex flex-col items-center gap-2 text-red-400 px-4 text-center">
                  <AlertCircle className="w-8 h-8 opacity-50" />
                  <p className="text-xs">{scene.error || "Generation Failed"}</p>
                </div>
              )}

              {scene.status === GenerationStatus.COMPLETED && scene.videoUrl && (
                <video 
                  src={scene.videoUrl} 
                  controls 
                  className="w-full h-full object-cover"
                  loop
                  playsInline
                />
              )}
            </div>

            {/* Footer / Prompt Preview */}
            <div className="p-4 border-t border-white/5 bg-surface/50">
              <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                <span className="text-white/30 mr-1 font-semibold">Prompt:</span>
                {scene.prompt}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background text-gray-200 selection:bg-primary/30">
      <div className="fixed top-0 left-0 right-0 h-1 bg-surface z-50">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <AnimatePresence mode="wait">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;