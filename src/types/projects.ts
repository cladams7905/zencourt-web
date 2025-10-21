import { GenerationJob } from "@/db/actions/generation";

export type ProjectStatus = "uploading" | "analyzing" | "draft" | "published";

export type ProjectMetadata = {
  generationJobs: GenerationJob[];
};
