import { Play, MoreVertical, Plus, Video, LayoutGrid, Sparkles } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "./EmptyState";
import { UploadProjectModal } from "./UploadProjectModal";
import { GeneratedContentCard } from "./GeneratedContentCard";
import { TemplateMarketplaceModal } from "./modals/TemplateMarketplaceModal";
import { useProjectGeneratedContent } from "@/hooks/useTemplates";
import { getProjectImages } from "@/db/actions/images";
import Image from "next/image";
import { Project } from "@/types/schema";
import HouseFallback from "@/../public/house_fallback.png";

interface ProjectsViewProps {
  initialProjects: Project[];
}

// Separate component to handle generated content for a single project
function ProjectGeneratedContent({ project }: { project: Project }) {
  const { data: generatedContent, isLoading } = useProjectGeneratedContent(project.id);

  // Return the data for parent to use
  return { generatedContent, isLoading };
}

export function ProjectsView({ initialProjects }: ProjectsViewProps) {
  const [viewMode, setViewMode] = useState<"projects" | "generated">("projects");
  const [filter, setFilter] = useState<"all" | "vertical" | "landscape">("all");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedProjectForTemplates, setSelectedProjectForTemplates] =
    useState<Project | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const handleCreateProject = () => {
    setIsUploadModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleProjectCreated = (project: Project) => {
    setProjects([...projects, project]);
    setIsUploadModalOpen(false);
  };

  const handleProjectClick = async (project: Project) => {
    // Only open template marketplace for draft projects
    if (project.status !== "draft") {
      // For non-draft projects, could open a project detail view
      return;
    }

    try {
      // Fetch project images to get available categories
      const projectImages = await getProjectImages(project.id);
      const categories = projectImages
        .filter((img) => img.category)
        .map((img) => img.category!)
        .filter((category, index, self) => self.indexOf(category) === index); // unique

      setAvailableCategories(categories);
      setSelectedProjectForTemplates(project);
    } catch (error) {
      console.error("Failed to fetch project images:", error);
      // Fallback: open marketplace with empty categories
      setAvailableCategories([]);
      setSelectedProjectForTemplates(project);
    }
  };

  const handleRegenerateContent = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      handleProjectClick(project);
    }
  };

  const handleTemplateMarketplaceClose = () => {
    setSelectedProjectForTemplates(null);
    setAvailableCategories([]);
  };

  const handleTemplateSelected = () => {
    setSelectedProjectForTemplates(null);
    setAvailableCategories([]);
  };

  const filteredProjects = projects.filter((project) => {
    if (filter === "all") return true;
    return project.format === filter;
  });

  // Show empty state if no projects exist
  if (projects.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen flex items-center justify-center">
        <EmptyState onCreateProject={handleCreateProject} />
        <UploadProjectModal
          isOpen={isUploadModalOpen}
          onClose={handleCloseModal}
          onProjectCreated={handleProjectCreated}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl mb-2">
            {viewMode === "projects" ? "Your Projects" : "Generated Content"}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {viewMode === "projects"
              ? "AI-generated home walkthrough videos optimized for social media"
              : "Content generated from your project templates"}
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-black text-white rounded-lg hover:bg-black/90 transition-colors flex items-center gap-2 justify-center sm:justify-start"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setViewMode("projects")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            viewMode === "projects"
              ? "text-black"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          Projects
          {viewMode === "projects" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
          )}
        </button>
        <button
          onClick={() => setViewMode("generated")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            viewMode === "generated"
              ? "text-black"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          <Sparkles size={16} />
          Generated Content
          {viewMode === "generated" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
          )}
        </button>
      </div>

      {viewMode === "projects" && (
        <>
          {/* Filter Tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 text-sm sm:text-base ${
                filter === "all"
                  ? "bg-black text-white"
                  : "bg-white border border-border hover:bg-secondary"
              }`}
            >
              All Videos
            </button>
            <button
              onClick={() => setFilter("vertical")}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0 text-sm sm:text-base ${
                filter === "vertical"
                  ? "bg-black text-white"
                  : "bg-white border border-border hover:bg-secondary"
              }`}
            >
              <Video size={16} />
              <span className="hidden xs:inline">Vertical</span> <span>(9:16)</span>
            </button>
            <button
              onClick={() => setFilter("landscape")}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0 text-sm sm:text-base ${
                filter === "landscape"
                  ? "bg-black text-white"
                  : "bg-white border border-border hover:bg-secondary"
              }`}
            >
              <LayoutGrid size={16} />
              <span className="hidden xs:inline">Landscape</span>{" "}
              <span>(16:9)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className={`bg-white rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow group ${
                  project.status === "draft" ? "cursor-pointer" : ""
                }`}
                onClick={() => handleProjectClick(project)}
              >
                <div className="relative aspect-video bg-gradient-to-br from-[#d4c4b0] to-[#e8ddd3] overflow-hidden">
                  {project.format === "vertical" ? (
                    <>
                      {/* Blurred background - TikTok style */}
                      <Image
                        src={project.thumbnailUrl || HouseFallback}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                      />
                      {/* Main centered vertical video */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image
                          src={project.thumbnailUrl || HouseFallback}
                          alt={project.title || "Undefined"}
                          className="h-full w-auto object-cover"
                        />
                      </div>
                    </>
                  ) : (
                    <Image
                      src={project.thumbnailUrl || HouseFallback}
                      alt={project.title || "Undefined"}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    {project.status === "draft" ? (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 text-white rounded-full px-4 py-2 flex items-center gap-2">
                        <Sparkles size={20} />
                        <span className="font-medium">Generate Content</span>
                      </div>
                    ) : (
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3">
                        <Play size={24} fill="black" stroke="black" />
                      </button>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    {project.subtitles && (
                      <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                        CC
                      </div>
                    )}
                    <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {project.format === "vertical" ? "9:16" : "16:9"}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    {project.duration}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-1 truncate">{project.title}</h3>
                      <p className="text-xs text-muted-foreground mb-1">
                        {project.status}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.platform}
                      </p>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground ml-2">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {viewMode === "generated" && (
        <GeneratedContentView
          projects={projects}
          onRegenerateContent={handleRegenerateContent}
          onSwitchToProjects={() => setViewMode("projects")}
        />
      )}

      <UploadProjectModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseModal}
        onProjectCreated={handleProjectCreated}
      />

      {selectedProjectForTemplates && (
        <TemplateMarketplaceModal
          isOpen={!!selectedProjectForTemplates}
          onClose={handleTemplateMarketplaceClose}
          projectId={selectedProjectForTemplates.id}
          availableCategories={availableCategories}
          onTemplateSelected={handleTemplateSelected}
        />
      )}
    </div>
  );
}

// Separate component for generated content view to properly use hooks
function GeneratedContentView({
  projects,
  onRegenerateContent,
  onSwitchToProjects
}: {
  projects: Project[];
  onRegenerateContent: (projectId: string) => void;
  onSwitchToProjects: () => void;
}) {
  // Fetch generated content for each project (hooks called at top level)
  const projectsWithContent = projects.map((project) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: generatedContent, isLoading } = useProjectGeneratedContent(project.id);
    return { project, generatedContent, isLoading };
  });

  // Filter to only show projects with content
  const projectsToShow = projectsWithContent.filter(
    ({ generatedContent, isLoading }) =>
      !isLoading && generatedContent && generatedContent.length > 0
  );

  const hasAnyContent = projectsToShow.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="text-center py-20">
        <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No generated content yet</p>
        <p className="text-sm text-gray-400 mb-6">
          Create content from your projects using templates
        </p>
        <button
          onClick={onSwitchToProjects}
          className="text-purple-600 hover:text-purple-700"
        >
          View Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {projectsToShow.map(({ project, generatedContent }) => (
        <div key={project.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{project.title}</h3>
              <p className="text-sm text-muted-foreground">
                {generatedContent!.length} generated item
                {generatedContent!.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => onRegenerateContent(project.id)}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Sparkles size={16} />
              Generate More
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedContent!.map((content) => (
              <GeneratedContentCard
                key={content.id}
                content={content}
                onRegenerate={() => onRegenerateContent(project.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
