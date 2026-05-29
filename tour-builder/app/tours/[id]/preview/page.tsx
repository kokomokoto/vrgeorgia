import { TourPreview } from "@/components/TourPreview";

type Props = { params: Promise<{ id: string }> };

export default async function PreviewPage({ params }: Props) {
  const { id } = await params;
  return <TourPreview tourId={id} source="draft" />;
}
