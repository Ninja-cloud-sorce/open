import { ProjectFlow } from "@/features/projects/components/project-flow";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectFlow projectId={projectId} />;
}
