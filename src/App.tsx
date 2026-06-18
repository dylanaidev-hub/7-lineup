import { AppView } from "./AppView";
import { useAppController } from "./hooks/useAppController";
import type { Language } from "./hooks/useUnifiedWorkspaceState";
import "./styles.css";

export default function App({ initialLanguage = "vi" }: { initialLanguage?: Language }) {
  return <AppView model={useAppController(initialLanguage)} />;
}
