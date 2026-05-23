import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Film, Clock, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  initialPrompt: z.string().min(10, "Prompt must be at least 10 characters"),
  videoLength: z.number().int().min(5).max(300),
  genre: z.enum([
    "realistic",
    "cinematic",
    "animated",
    "stylized",
    "documentary",
  ]),
});

type CreateProjectInput = z.infer<typeof createProjectSchema>;

export default function ProjectLibrary() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: projects, isLoading } =
    trpc.pipeline.getProjectLibrary.useQuery();
  const createProjectMutation = trpc.pipeline.createProject.useMutation();
  const generateStoryboardMutation =
    trpc.pipeline.generateStoryboard.useMutation();

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: "",
      description: "",
      initialPrompt: "",
      videoLength: 30,
      genre: "cinematic",
    },
  });

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      const project = await createProjectMutation.mutateAsync(data);
      toast.success("Project created! Generating storyboard...");
      setIsOpen(false);
      form.reset();

      // Auto-generate storyboard
      await generateStoryboardMutation.mutateAsync({ projectId: project.id });
      setLocation(`/projects/${project.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create project"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Your Projects</h1>
              <p className="text-slate-400 mt-1">
                Create and manage your video projects
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation("/settings")}
                variant="outline"
                className="text-slate-400 hover:text-white"
              >
                Settings
              </Button>
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                    <Plus className="w-5 h-5 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Video Project</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="title">Project Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Product Launch Video"
                        {...form.register("title")}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      {form.formState.errors.title && (
                        <p className="text-red-400 text-sm">
                          {form.formState.errors.title.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Add any additional notes about your project"
                        {...form.register("description")}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="initialPrompt">Your Video Idea</Label>
                      <Textarea
                        id="initialPrompt"
                        placeholder="Describe your video concept in detail. What story do you want to tell? What's the mood and style?"
                        {...form.register("initialPrompt")}
                        className="bg-slate-700 border-slate-600 text-white min-h-24"
                      />
                      {form.formState.errors.initialPrompt && (
                        <p className="text-red-400 text-sm">
                          {form.formState.errors.initialPrompt.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="videoLength">
                          Video Length (seconds)
                        </Label>
                        <Input
                          id="videoLength"
                          type="number"
                          min="5"
                          max="300"
                          {...form.register("videoLength", {
                            valueAsNumber: true,
                          })}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="genre">Style/Genre</Label>
                        <Select
                          value={form.watch("genre")}
                          onValueChange={value =>
                            form.setValue("genre", value as any)
                          }
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="realistic">Realistic</SelectItem>
                            <SelectItem value="cinematic">Cinematic</SelectItem>
                            <SelectItem value="animated">Animated</SelectItem>
                            <SelectItem value="stylized">Stylized</SelectItem>
                            <SelectItem value="documentary">
                              Documentary
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                        disabled={createProjectMutation.isPending}
                      >
                        {createProjectMutation.isPending
                          ? "Creating..."
                          : "Create Project"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card
                key={i}
                className="bg-slate-800/50 border-slate-700/50 h-48 animate-pulse"
              />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {projects.map(project => (
              <Card
                key={project.id}
                className="bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
                onClick={() => setLocation(`/projects/${project.id}`)}
              >
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {project.genre}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Film className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-auto space-y-2 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>{project.videoLength}s</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Zap className="w-4 h-4" />
                      <span className="capitalize">
                        {project.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Film className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              No projects yet
            </h3>
            <p className="text-slate-400 mb-6">
              Create your first video project to get started
            </p>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Project
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
