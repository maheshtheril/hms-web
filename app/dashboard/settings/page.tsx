// web/app/dashboard/settings/page.tsx
import SettingsApp from "./settings-app";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold mb-6">Settings — Admin</h1>
      <SettingsApp />
    </div>
  );
}
