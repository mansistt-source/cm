import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const promptFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  initialPrompt: z.string().min(10, "Prompt must be at least 10 characters"),
  videoLength: z.number().int().min(5).max(300),
  genre: z.enum(["realistic", "cinematic", "animated", "stylized", "documentary"]),
});

export type PromptFormInput = z.infer<typeof promptFormSchema>;

interface PromptFormProps {
  onSubmit: (data: PromptFormInput) => Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
}

export default function PromptForm({
  onSubmit,
  isLoading = false,
  submitButtonText = "Create Project",
}: PromptFormProps) {
  const form = useForm<PromptFormInput>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      title: "",
      description: "",
      initialPrompt: "",
      videoLength: 30,
      genre: "cinematic",
    },
  });

  const handleSubmit = async (data: PromptFormInput) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Project Title</Label>
        <Input
          id="title"
          placeholder="e.g., Product Launch Video"
          {...form.register("title")}
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
        />
        {form.formState.errors.title && (
          <p className="text-red-400 text-sm">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Add any additional notes about your project"
          {...form.register("description")}
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="initialPrompt">Your Video Idea</Label>
        <Textarea
          id="initialPrompt"
          placeholder="Describe your video concept in detail. What story do you want to tell? What's the mood and style?"
          {...form.register("initialPrompt")}
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 min-h-24"
        />
        {form.formState.errors.initialPrompt && (
          <p className="text-red-400 text-sm">{form.formState.errors.initialPrompt.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="videoLength">Video Length (seconds)</Label>
          <Input
            id="videoLength"
            type="number"
            min="5"
            max="300"
            {...form.register("videoLength", { valueAsNumber: true })}
            className="bg-slate-700 border-slate-600 text-white"
          />
          {form.formState.errors.videoLength && (
            <p className="text-red-400 text-sm">{form.formState.errors.videoLength.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="genre">Style/Genre</Label>
          <Select
            value={form.watch("genre")}
            onValueChange={(value) => form.setValue("genre", value as any)}
          >
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="realistic">Realistic</SelectItem>
              <SelectItem value="cinematic">Cinematic</SelectItem>
              <SelectItem value="animated">Animated</SelectItem>
              <SelectItem value="stylized">Stylized</SelectItem>
              <SelectItem value="documentary">Documentary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          submitButtonText
        )}
      </Button>
    </form>
  );
}
