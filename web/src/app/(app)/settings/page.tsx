import { getSessionUser } from "@/lib/rbac";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "Settings · Odigma One" };

export default async function SettingsPage() {
  const user = (await getSessionUser())!;
  return (
    <SettingsView
      user={{
        name: user.name,
        email: user.email,
        roleName: user.roleName,
        timezone: user.timezone,
      }}
    />
  );
}
