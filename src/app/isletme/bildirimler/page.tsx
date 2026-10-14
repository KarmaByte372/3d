import { NotificationsPage } from "@/components/NotificationsPage";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  const user = await requireUser("BUSINESS");
  return <NotificationsPage userId={user.id} />;
}
