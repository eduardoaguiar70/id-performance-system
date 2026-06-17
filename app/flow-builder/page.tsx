import { FlowBuilderClient } from "./flow-builder-client";

export const metadata = {
  title: "Flow Builder | ID Performance",
  description: "Monte o fluxo de mensagens de follow-up automático para SUSPECTS e LEADS.",
};

export default function FlowBuilderPage() {
  return <FlowBuilderClient />;
}
