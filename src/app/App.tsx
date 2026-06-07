import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/app/providers";

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}
