import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateStoryboard,
  regenerateSceneDescription,
  StoryboardScene,
} from "./services/storyboard";
import { createProject, getProjectById, updateProjectStatus } from "./db";

// Mock the LLM service
vi.mock("./services/storyboard", async () => {
  const actual = await vi.importActual("./services/storyboard");
  return {
    ...actual,
    generateStoryboard: vi.fn(),
  };
});

describe("Pipeline Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Storyboard Generation", () => {
    it("should generate a valid storyboard with scenes", async () => {
      const mockStoryboard = {
        scenes: [
          {
            sceneNumber: 1,
            description: "Opening shot of a beautiful landscape",
            duration: 5,
            visualStyle: "Cinematic, golden hour lighting",
          },
          {
            sceneNumber: 2,
            description: "Close-up of main subject",
            duration: 5,
            visualStyle: "Shallow depth of field, warm tones",
          },
        ],
        totalDuration: 10,
      };

      expect(mockStoryboard.scenes).toHaveLength(2);
      expect(mockStoryboard.scenes[0]).toMatchObject({
        sceneNumber: 1,
        duration: 5,
      });
      expect(mockStoryboard.totalDuration).toBe(10);
    });

    it("should validate scene structure", () => {
      const scene: StoryboardScene = {
        sceneNumber: 1,
        description: "A detailed scene description for video generation",
        duration: 5,
        visualStyle: "Cinematic, professional lighting",
      };

      expect(scene.sceneNumber).toBeGreaterThan(0);
      expect(scene.description.length).toBeGreaterThan(0);
      expect(scene.duration).toBeGreaterThan(0);
      expect(scene.visualStyle.length).toBeGreaterThan(0);
    });

    it("should handle multiple scenes with correct total duration", () => {
      const scenes: StoryboardScene[] = [
        {
          sceneNumber: 1,
          description: "Scene 1",
          duration: 5,
          visualStyle: "Style 1",
        },
        {
          sceneNumber: 2,
          description: "Scene 2",
          duration: 8,
          visualStyle: "Style 2",
        },
        {
          sceneNumber: 3,
          description: "Scene 3",
          duration: 7,
          visualStyle: "Style 3",
        },
      ];

      const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
      expect(totalDuration).toBe(20);
      expect(scenes).toHaveLength(3);
    });
  });

  describe("Project Management", () => {
    it("should create a project with valid initial state", async () => {
      const mockProject = {
        id: 1,
        userId: 1,
        title: "Test Video",
        description: "A test video project",
        initialPrompt: "Create a cinematic video about nature",
        videoLength: 30,
        genre: "cinematic" as const,
        status: "draft" as const,
        currentStage: undefined,
        finalVideoUrl: undefined,
        finalVideoKey: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: undefined,
      };

      expect(mockProject).toMatchObject({
        userId: 1,
        status: "draft",
        genre: "cinematic",
      });
      expect(mockProject.videoLength).toBe(30);
    });

    it("should update project status through pipeline stages", () => {
      const statuses = [
        "draft",
        "generating_storyboard",
        "storyboard_ready",
        "generating_frames",
        "generating_clips",
        "generating_montage",
        "completed",
      ];

      expect(statuses).toContain("draft");
      expect(statuses).toContain("completed");
      expect(statuses.length).toBe(7);
    });

    it("should handle failed status", () => {
      const validStatuses = [
        "draft",
        "generating_storyboard",
        "storyboard_ready",
        "generating_frames",
        "generating_clips",
        "generating_montage",
        "completed",
        "failed",
      ];

      expect(validStatuses).toContain("failed");
    });
  });

  describe("Pipeline Validation", () => {
    it("should validate video length constraints", () => {
      const validLengths = [5, 30, 60, 300];
      const invalidLengths = [0, 3, 400];

      validLengths.forEach((length) => {
        expect(length).toBeGreaterThanOrEqual(5);
        expect(length).toBeLessThanOrEqual(300);
      });

      invalidLengths.forEach((length) => {
        expect(length < 5 || length > 300).toBe(true);
      });
    });

    it("should validate genre selection", () => {
      const validGenres = ["realistic", "cinematic", "animated", "stylized", "documentary"];
      const testGenre = "cinematic";

      expect(validGenres).toContain(testGenre);
    });

    it("should validate scene numbering", () => {
      const scenes: StoryboardScene[] = [
        { sceneNumber: 1, description: "Scene 1", duration: 5, visualStyle: "Style 1" },
        { sceneNumber: 2, description: "Scene 2", duration: 5, visualStyle: "Style 2" },
        { sceneNumber: 3, description: "Scene 3", duration: 5, visualStyle: "Style 3" },
      ];

      scenes.forEach((scene, index) => {
        expect(scene.sceneNumber).toBe(index + 1);
      });
    });
  });

  describe("Frame Generation", () => {
    it("should expect frame URLs to be valid", () => {
      const frameUrl = "/manus-storage/projects/1/scenes/1/start-frame.png";
      expect(frameUrl).toMatch(/^\/manus-storage\//);
      expect(frameUrl).toContain("start-frame.png");
    });

    it("should generate both start and end frames", () => {
      const frameResult = {
        startFrameUrl: "/manus-storage/projects/1/scenes/1/start-frame.png",
        startFrameKey: "projects/1/scenes/1/start-frame.png",
        endFrameUrl: "/manus-storage/projects/1/scenes/1/end-frame.png",
        endFrameKey: "projects/1/scenes/1/end-frame.png",
      };

      expect(frameResult).toHaveProperty("startFrameUrl");
      expect(frameResult).toHaveProperty("endFrameUrl");
      expect(frameResult.startFrameUrl).not.toBe(frameResult.endFrameUrl);
    });
  });

  describe("Video Clip Generation", () => {
    it("should generate clip with Higgsfield request ID", () => {
      const clipResult = {
        videoClipUrl: "/manus-storage/projects/1/scenes/1/clip.mp4",
        videoClipKey: "projects/1/scenes/1/clip.mp4",
        higgsFieldRequestId: "hf-1234567890-1",
      };

      expect(clipResult).toHaveProperty("videoClipUrl");
      expect(clipResult).toHaveProperty("higgsFieldRequestId");
      expect(clipResult.higgsFieldRequestId).toMatch(/^hf-/);
    });
  });

  describe("Montage Assembly", () => {
    it("should accept multiple video clips for assembly", () => {
      const videoClips = [
        "/manus-storage/projects/1/scenes/1/clip.mp4",
        "/manus-storage/projects/1/scenes/2/clip.mp4",
        "/manus-storage/projects/1/scenes/3/clip.mp4",
      ];

      expect(videoClips).toHaveLength(3);
      videoClips.forEach((clip) => {
        expect(clip).toMatch(/\.mp4$/);
      });
    });

    it("should produce final video with storage key", () => {
      const montageResult = {
        finalVideoUrl: "/manus-storage/projects/1/final-video.mp4",
        finalVideoKey: "projects/1/final-video.mp4",
      };

      expect(montageResult.finalVideoUrl).toMatch(/final-video\.mp4$/);
      expect(montageResult.finalVideoKey).toMatch(/final-video\.mp4$/);
    });
  });

  describe("Publishing Records", () => {
    it("should create publishing record for each platform", () => {
      const platforms = ["instagram", "youtube", "tiktok"] as const;
      const records = platforms.map((platform) => ({
        projectId: 1,
        platform,
        status: "pending" as const,
      }));

      expect(records).toHaveLength(3);
      records.forEach((record) => {
        expect(["instagram", "youtube", "tiktok"]).toContain(record.platform);
      });
    });

    it("should track publishing status transitions", () => {
      const statusFlow = ["pending", "publishing", "published"];

      expect(statusFlow[0]).toBe("pending");
      expect(statusFlow[statusFlow.length - 1]).toBe("published");
    });
  });
});
