import { FactCheckPane } from "./chat-pane";

export default function FactCheck() {
  return (
    <div className="h-screen w-screen bg-gray-100 p-4">
      <div className="h-full max-w-6xl mx-auto">
        <FactCheckPane />
      </div>
    </div>
  );
}
