import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Download, Share2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id);
  const [activeTab, setActiveTab] = useState("storyboard");

  const { data: projectData, isLoading, refetch } = trpc.pipeline.getProject.useQuery({
    projectId,
  });

  const { data: statusData } = trpc.pipeline.getProjectStatus.useQuery(
    { projectId },
    { refetchInterval: 2000 } // Poll every 2 seconds
  );

  const generateFramesMutation = trpc.pipeline.generateFrames.useMutation();
  const generateClipsMutation = trpc.pipeline.generateClips.useMutation();
  const assembleMontagueMutation = trpc.pipeline.assembleMontage.useMutation();

  const handleGenerateFrames = async () => {
    try {
      await generateFramesMutation.mutateAsync({ projectId });
      toast.success("Frame generation started!");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate frames");
    }
  };

  const handleGenerateClips = async () => {
    try {
      await generateClipsMutation.mutateAsync({ projectId });
      toast.success("Clip generation started!");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate clips");
    }
  };

  const handleAssembleMontage = async () => {
    try {
      await assembleMontagueMutation.mutateAsync({ projectId });
      toast.success("Montage assembly started!");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assemble montage");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Project not found</h1>
          <Button onClick={() => setLocation("/projects")} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const { project, scenes } = projectData;
  const progress = statusData?.progress;
  const progressPercent = progress?.totalScenes ? Math.round((progress.clipsReady / progress.totalScenes) * 100) : 0;
  const framesPercent = progress?.totalScenes ? (progress.framesReady / progress.totalScenes) * 100 : 0;
  const clipsPercent = progress?.totalScenes ? (progress.clipsReady / progress.totalScenes) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/projects")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
              <p className="text-sm text-slate-400">{project.genre} • {project.videoLength}s</p>
            </div>
            {project.finalVideoUrl && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                  <Share2 className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {project.status !== "completed" && project.status !== "failed" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Pipeline Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${clipsPercent}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
          </TabsList>

          {/* Storyboard Tab */}
          <TabsContent value="storyboard" className="space-y-6 mt-6">
            <div className="grid gap-6">
              {scenes.map((scene) => (
                <Card key={scene.id} className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
                  <div className="grid md:grid-cols-3 gap-4 p-6">
                    {/* Scene Info */}
                    <div className="md:col-span-2">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-blue-400">{scene.sceneNumber}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">Scene {scene.sceneNumber}</h3>
                          <p className="text-slate-300 text-sm mb-3">{scene.description}</p>
                          {scene.visualStyle && (
                            <p className="text-xs text-slate-400">
                              <span className="font-semibold">Style:</span> {scene.visualStyle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Frames Preview */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Frames</p>
                      <div className="grid grid-cols-2 gap-2">
                        {scene.startFrameUrl ? (
                          <img
                            src={scene.startFrameUrl}
                            alt="Start frame"
                            className="w-full h-20 object-cover rounded bg-slate-700"
                          />
                        ) : (
                          <div className="w-full h-20 bg-slate-700 rounded flex items-center justify-center">
                            <span className="text-xs text-slate-500">No frame</span>
                          </div>
                        )}
                        {scene.endFrameUrl ? (
                          <img
                            src={scene.endFrameUrl}
                            alt="End frame"
                            className="w-full h-20 object-cover rounded bg-slate-700"
                          />
                        ) : (
                          <div className="w-full h-20 bg-slate-700 rounded flex items-center justify-center">
                            <span className="text-xs text-slate-500">No frame</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerateFrames}
                disabled={generateFramesMutation.isPending || project.status === "completed"}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
              >
                {generateFramesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Frames"
                )}
              </Button>
              <Button
                onClick={handleGenerateClips}
                disabled={generateClipsMutation.isPending || !progress || progress.framesReady === 0}
                variant="outline"
              >
                {generateClipsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Clips"
                )}
              </Button>
              <Button
                onClick={handleAssembleMontage}
                disabled={assembleMontagueMutation.isPending || !progress || progress.clipsReady === 0}
                variant="outline"
              >
                {assembleMontagueMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assembling...
                  </>
                ) : (
                  "Assemble Montage"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6 mt-6">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Pipeline Status</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Frames Generated</span>
                    <span className="text-blue-400">{progress?.framesReady || 0} / {progress?.totalScenes || 0}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${framesPercent}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Clips Generated</span>
                    <span className="text-cyan-400">{progress?.clipsReady || 0} / {progress?.totalScenes || 0}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${clipsPercent}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Output Tab */}
          <TabsContent value="output" className="space-y-6 mt-6">
            {project.finalVideoUrl ? (
              <Card className="bg-slate-800/50 border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Final Video</h3>
                <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center mb-4">
                  <Play className="w-12 h-12 text-slate-400" />
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                    <Download className="w-4 h-4 mr-2" />
                    Download Video
                  </Button>
                  <Button className="flex-1" variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />
                    Publish to Social
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700/50 p-12 text-center">
                <p className="text-slate-400 mb-4">Your final video will appear here once the montage is assembled.</p>
                <Button
                  onClick={handleAssembleMontage}
                  disabled={assembleMontagueMutation.isPending || !progress || progress.clipsReady === 0}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                >
                  Assemble Montage
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
