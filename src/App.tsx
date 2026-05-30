import { useMemo, useState } from "react";
import { HeaderBar } from "./components/HeaderBar";
import { ProfileIntake } from "./components/ProfileIntake";
import { ScenarioControls } from "./components/ScenarioControls";
import { RailControls } from "./components/RailControls";
import { FillControls } from "./components/FillControls";
import { KpiGrid } from "./components/KpiGrid";
import { VerdictPanel } from "./components/VerdictPanel";
import { FrameVisualizer } from "./components/FrameVisualizer";
import { ModeShapeChart } from "./components/ModeShapeChart";
import { ResonanceMap } from "./components/ResonanceMap";
import { ScenarioComparison } from "./components/ScenarioComparison";
import { AssumptionPanel } from "./components/AssumptionPanel";
import { profiles } from "./data/profiles";
import { analyzeScenario } from "./model/scenario";
import { readSharedDesign } from "./model/share";
import type { MachineScenario, ProfileSpec } from "./model/types";

const initialScenario: MachineScenario = {
  profileId: "tslot-4080-heavy",
  spanMm: 1100,
  support: "fixed-fixed",
  axis: "vertical",
  loadN: 950,
  loadPositionPct: 50,
  rpm: 7800,
  flutes: 3,
  movingMassKg: 18,
  rail: {
    modelId: "hgr20",
    topCount: 2,
    sideCount: 0,
    boltPitchMm: 60,
    preload: "medium",
  },
  fill: {
    mediumId: "epoxy-granite",
    ratio: 0.55,
  },
};

export default function App() {
  const sharedDesign = useMemo(() => readSharedDesign(), []);
  const [scenario, setScenario] = useState<MachineScenario>(
    sharedDesign?.scenario ?? initialScenario,
  );
  const [customProfile, setCustomProfile] = useState<ProfileSpec | null>(
    sharedDesign?.customProfile ?? null,
  );

  const activeProfile = useMemo(() => {
    if (customProfile && scenario.profileId === customProfile.id) {
      return customProfile;
    }

    return profiles.find((profile) => profile.id === scenario.profileId) ?? profiles[0];
  }, [customProfile, scenario.profileId]);

  const analysis = useMemo(
    () => analyzeScenario(activeProfile, scenario),
    [activeProfile, scenario],
  );

  return (
    <div className="app">
      <HeaderBar
        analysis={analysis}
        design={{ version: 1, scenario, customProfile }}
      />

      <main className="workbench" aria-label="Machine frame simulation workspace">
        <aside className="panel panel-left">
          <div className="input-column profile-column">
            <ProfileIntake
              activeProfile={activeProfile}
              customProfile={customProfile}
              onApplyDetectedProfile={(profile) => {
                setCustomProfile(profile);
                setScenario((current) => ({ ...current, profileId: profile.id }));
              }}
              onProfileChange={(profileId) =>
                setScenario((current) => ({ ...current, profileId }))
              }
            />
            <FillControls scenario={scenario} onScenarioChange={setScenario} />
          </div>
          <div className="input-column setup-column">
            <ScenarioControls scenario={scenario} onScenarioChange={setScenario} />
            <RailControls scenario={scenario} onScenarioChange={setScenario} />
          </div>
        </aside>

        <section className="stage">
          <FrameVisualizer
            profile={activeProfile}
            scenario={scenario}
            analysis={analysis}
          />
          <ModeShapeChart analysis={analysis} />
        </section>

        <aside className="panel panel-right">
          <VerdictPanel analysis={analysis} />
          <KpiGrid analysis={analysis} />
          <ResonanceMap analysis={analysis} />
          <ScenarioComparison profile={activeProfile} scenario={scenario} />
        </aside>
      </main>

      <AssumptionPanel analysis={analysis} profile={activeProfile} />
    </div>
  );
}
