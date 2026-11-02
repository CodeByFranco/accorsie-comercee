import { notFound } from "next/navigation";
import { KitStorefrontDetail } from "@/features/kits/components/KitStorefrontDetail";
import { getKitByIdForAdmin } from "@/features/kits/services/getKitBySlug";
import { requireAdmin } from "@/lib/auth/requireAdmin";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const kit = await getKitByIdForAdmin(id);
  return {
    title: kit ? `Prévia | ${kit.nome}` : "Prévia do kit",
    robots: { index: false, follow: false },
  };
}

export default async function KitPreviewPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const kit = await getKitByIdForAdmin(id);
  if (!kit) notFound();
  return <KitStorefrontDetail kit={kit} preview />;
}
