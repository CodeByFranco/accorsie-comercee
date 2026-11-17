import { SiteMaintenanceToggle } from "@/features/admin/components/SiteMaintenanceToggle";
import { getSiteLayout } from "@/features/site-layout/services/getSiteLayout";

export async function SiteMaintenanceCard() {
  const layout = await getSiteLayout();
  return <SiteMaintenanceToggle initialLojaPublica={layout.loja_publica} />;
}