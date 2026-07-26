import { VariantSetView } from "@/features/variants/components/variant-set-view";

export default async function VariantSetPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  return <VariantSetView setId={setId} />;
}
