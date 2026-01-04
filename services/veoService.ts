import { GoogleGenerativeAI } from "@google/generative-ai";
import { AspectRatio, VideoGenerationResult } from "../types";

const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const generateVideoScene = async (
  prompt: string,
  aspectRatio: AspectRatio
): Promise<VideoGenerationResult> => {
  try {
    const apiKey = process.env.VEO_API_KEY;

    if (!apiKey) {
      throw new Error("VEO_API_KEY not found");
    }

    // Initialize client
    const ai = new GoogleGenerativeAI(apiKey);

    // Start operation
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio,
      },
    });

    while (!operation.done) {
      await delay(5000);
      operation = await ai.operations.getVideosOperation({
        operation,
      });
    }

    const videoUri =
      operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      return { uri: null, error: "No video returned from API" };
    }

    const authenticatedUrl = `${videoUri}&key=${apiKey}`;

    const response = await fetch(authenticatedUrl);

    if (!response.ok) {
      return {
        uri: null,
        error: `Failed to fetch video: ${response.statusText}`,
      };
    }

    const blob = await response.blob();
    const localUrl = URL.createObjectURL(blob);

    return { uri: localUrl };
  } catch (error: any) {
    console.error("Veo Generation Error:", error);
    return {
      uri: null,
      error: error?.message || "Unknown error",
    };
  }
};
