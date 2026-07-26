import { HeroSetView } from "@/features/hero-images/components/hero-set-view";

export default async function HeroImageSetPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  return <HeroSetView setId={setId} />;
}
