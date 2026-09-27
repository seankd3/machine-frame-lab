import { useMemo } from "react";
import { compile } from "./machine/compile";
import { defaultMachine } from "./machine/document";
import { Viewport } from "./render/Viewport";

export default function App() {
  const compiled = useMemo(() => compile(defaultMachine), []);
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Viewport compiled={compiled} />
    </div>
  );
}
