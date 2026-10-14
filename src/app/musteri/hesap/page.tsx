import { AccountPage } from "@/components/AccountPage";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  const user = await requireUser("CUSTOMER");
  return <AccountPage user={user} />;
}
