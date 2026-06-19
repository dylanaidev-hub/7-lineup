import { AppView } from "./AppView";
import { useAppController } from "./hooks/useAppController";
import "./styles.css";

export default function App() {
  return <AppView model={useAppController()} />;
}
