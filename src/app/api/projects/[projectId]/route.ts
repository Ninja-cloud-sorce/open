import { getProject } from "@/features/projects/actions";

/**
 * Read-only project snapshot for polling.
 *
 * This exists because Next serialises Server Actions from a client: a poll
 * issued as an action would queue behind `runRoundGeneration`, which awaits all
 * ten variants and does not settle for minutes. A plain GET is an ordinary
 * request and answers immediately, so the UI can show each site as it lands
 * instead of waiting for the whole round.
 *
 * Route Handlers are uncached by default, so every poll reads current state.
 */
export async function GET(
  _request: Request,
  // Written out rather than using the `RouteContext` helper: that global is
  // emitted into .next/types, so it does not resolve on a cold checkout.
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(project);
}
