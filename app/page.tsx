import EnergyDashboard from "@/components/EnergyDashboard";

// Static shell; the dashboard fetches live EnergyZero prices client-side (open CORS),
// so the exported page shows current data on every visit without a server.
export default function Page() {
  return <EnergyDashboard />;
}
