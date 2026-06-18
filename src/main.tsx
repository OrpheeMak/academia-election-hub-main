import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SimulationProvider } from "./contexts/SimulationContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SimulationProvider>
    <App />
  </SimulationProvider>
);
