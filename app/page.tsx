import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {valid} from "@/lib/auth";
export const dynamic="force-dynamic";
import ApexWorld from "@/components/ApexWorld";
import ApexOverviewPanel from "@/components/ApexOverviewPanel";

export default async function Home() {
  if(!valid((await cookies()).get("apex_session")?.value || ""))redirect("/login");
  return (
    <main
      id="main"
      style={{ background: "#04080f", color: "#f0ede8", position: "relative", overflow: "hidden" }}
    >
      {/* Top-left overview HUD: clock + weather + social links */}
      <ApexOverviewPanel />

      {/* The world: orb core + orbiting agent graph. Tap the orb to cycle its
          state; click any agent node to open its overview card. */}
      <section style={{ position: "relative", height: "100vh", minHeight: 620 }}>
        <ApexWorld />
      </section>


    </main>
  );
}
