import { NotificationsPage } from "@/components/NotificationsPage";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  const user = await requireUser("ADMIN");
  return <NotificationsPage userId={user.id} />;
}
