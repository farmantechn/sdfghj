import { GoogleGenAI } from "@google/genai";
import { AspectRatio, VideoGenerationResult } from "../types";

// Helper delay function for polling
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateVideoScene = async (
  prompt: string,
  aspectRatio: AspectRatio
): Promise<VideoGenerationResult> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found in environment");
    }

    // 1. Initialize API Client
    const ai = new GoogleGenAI({ apiKey });

    // 2. Start Generation Operation
    // Using fast-generate-preview as per requirements for speed and availability
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p', // Standard efficient resolution
        aspectRatio: aspectRatio, 
      },
    });

    // 3. Poll for completion
    // The operation might take a minute or two.
    while (!operation.done) {
      await delay(5000); // Check every 5 seconds
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // 4. Handle Result
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      return { uri: null, error: "API returned no video URI" };
    }

    // 5. Fetch the actual video blob to ensure it's accessible and create a local blob URL
    // We must append the API key to the download link as per documentation
    const authenticatedUrl = `${videoUri}&key=${apiKey}`;
    
    // We fetch it here to convert to a Blob URL for easier local playback/download without CORS issues later
    const response = await fetch(authenticatedUrl);
    if (!response.ok) {
        return { uri: null, error: `Failed to download video bytes: ${response.statusText}` };
    }
    
    const blob = await response.blob();
    const localUrl = URL.createObjectURL(blob);

    return { uri: localUrl };

  } catch (error: any) {
    console.error("Veo Generation Error:", error);
    return { 
      uri: null, 
      error: error.message || "Unknown error occurred during generation" 
    };
  }
};