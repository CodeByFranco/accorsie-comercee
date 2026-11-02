import { notFound } from "next/navigation";
import { KitStorefrontDetail } from "@/features/kits/components/KitStorefrontDetail";
import { getKitBySlug } from "@/features/kits/services/getKitBySlug";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const kit = await getKitBySlug(slug);
  if (!kit) return { title: "Kit | Accorsi" };
  return {
    title: kit.seo_title?.trim() || `${kit.nome} | Kit`,
    description: kit.seo_description?.trim() || kit.descricao.slice(0, 160) || undefined,
  };
}

export default async function KitPage({ params }: PageProps) {
  const { slug } = await params;
  const kit = await getKitBySlug(slug);
  if (!kit) notFound();

  return <KitStorefrontDetail kit={kit} />;
}
