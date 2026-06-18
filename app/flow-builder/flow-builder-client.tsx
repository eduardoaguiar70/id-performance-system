"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/lib/supabase";
import { MessageNode, type MessageNodeData } from "@/components/flow-builder/message-node";
import { Plus, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FlowLabel = "SUSPECT" | "LEAD";

type FollowupFlow = {
  id?: string;
  label: FlowLabel;
  step: number;
  message_order: number;
  message_text: string;
};

type MessagesTriple = [string, string, string];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NODE_TYPES = { messageNode: MessageNode };

const MAX_STEPS = 7;
const NODE_GAP = 60;
const NODE_HEIGHT = 330;
const NODE_TOTAL_HEIGHT = NODE_HEIGHT + NODE_GAP;
const EMPTY_MESSAGES: MessagesTriple = ["", "", ""];

function buildEdge(sourceId: string, targetId: string): Edge {
  return {
    id: `e-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    animated: false,
    style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "hsl(var(--primary))",
      width: 16,
      height: 16,
    },
  };
}

/**
 * Groups flat DB rows by step, filling a [msg1, msg2, msg3] triple.
 * Rows must already be sorted by step asc, message_order asc.
 */
function buildNodes(
  rows: FollowupFlow[],
  label: FlowLabel,
  onDelete: (id: string) => void,
  onMessageChange: (id: string, index: number, value: string) => void
): Node[] {
  // Group by step → MessagesTriple
  const stepsMap = new Map<number, MessagesTriple>();

  for (const row of rows) {
    if (!stepsMap.has(row.step)) {
      stepsMap.set(row.step, ["", "", ""]);
    }
    const triple = stepsMap.get(row.step)!;
    const idx = row.message_order - 1;
    if (idx >= 0 && idx < 3) {
      triple[idx] = row.message_text;
    }
  }

  const sortedSteps = Array.from(stepsMap.keys()).sort((a, b) => a - b);

  return sortedSteps.map((step, idx) => {
    const isFinal = step === MAX_STEPS;
    const xOffset = isFinal ? 40 : 0;
    const nodeId = `${label}-step-${step}`;
    const messages = stepsMap.get(step)!;

    return {
      id: nodeId,
      type: "messageNode",
      position: { x: 100 + xOffset, y: 60 + idx * NODE_TOTAL_HEIGHT },
      data: {
        step,
        label,
        messages,
        isFinal,
        onDelete,
        onMessageChange,
      } satisfies MessageNodeData,
    };
  });
}

function buildEdgesFromNodes(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push(buildEdge(nodes[i].id, nodes[i + 1].id));
  }
  return edges;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function FlowBuilderClient() {
  const [activeLabel, setActiveLabel] = useState<FlowLabel>("SUSPECT");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);

  // Tracks the 3 messages per node id to avoid stale closures in callbacks
  const messagesRef = useRef<Map<string, MessagesTriple>>(new Map());

  // ─── Callbacks ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const remaining = nds.filter((n) => n.id !== id);
        return remaining.map((n, idx) => {
          const step = idx + 1;
          const isFinal = step === MAX_STEPS;
          return {
            ...n,
            data: {
              ...(n.data as object),
              step,
              isFinal,
            },
          };
        });
      });
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      messagesRef.current.delete(id);
    },
    [setNodes, setEdges]
  );

  const handleMessageChange = useCallback(
    (id: string, index: number, value: string) => {
      const current = messagesRef.current.get(id) ?? [...EMPTY_MESSAGES] as MessagesTriple;
      const updated: MessagesTriple = [current[0], current[1], current[2]];
      updated[index] = value;
      messagesRef.current.set(id, updated);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...(n.data as object), messages: updated } }
            : n
        )
      );
    },
    [setNodes]
  );

  // Stable refs so node data callbacks don't trigger infinite re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDelete = useCallback(handleDelete, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableChange = useCallback(handleMessageChange, []);

  // ─── Load from Supabase ──────────────────────────────────────────────────────
  const loadFlow = useCallback(
    async (label: FlowLabel) => {
      setIsLoading(true);
      messagesRef.current.clear();

      const { data, error } = await supabase
        .from("followup_flows")
        .select("*")
        .eq("label", label)
        .order("step", { ascending: true })
        .order("message_order", { ascending: true });

      if (error || !data) {
        setIsLoading(false);
        return;
      }

      const builtNodes = buildNodes(data as FollowupFlow[], label, stableDelete, stableChange);
      const builtEdges = buildEdgesFromNodes(builtNodes);

      // Sync messages ref
      builtNodes.forEach((n) => {
        const d = n.data as MessageNodeData;
        messagesRef.current.set(n.id, d.messages);
      });

      setNodes(builtNodes);
      setEdges(builtEdges);
      setIsLoading(false);
    },
    [stableDelete, stableChange, setNodes, setEdges]
  );

  useEffect(() => {
    loadFlow(activeLabel);
  }, [activeLabel, loadFlow]);

  // ─── Add node ────────────────────────────────────────────────────────────────
  const handleAddNode = useCallback(() => {
    setNodes((nds) => {
      const nextStep = nds.length + 1;
      if (nextStep > MAX_STEPS) return nds;

      const isFinal = nextStep === MAX_STEPS;
      const newId = `${activeLabel}-step-${nextStep}`;
      const emptyMessages: MessagesTriple = ["", "", ""];

      const newNode: Node = {
        id: newId,
        type: "messageNode",
        position: {
          x: 100 + (isFinal ? 40 : 0),
          y: 60 + nds.length * NODE_TOTAL_HEIGHT,
        },
        data: {
          step: nextStep,
          label: activeLabel,
          messages: emptyMessages,
          isFinal,
          onDelete: stableDelete,
          onMessageChange: stableChange,
        } satisfies MessageNodeData,
      };

      messagesRef.current.set(newId, emptyMessages);

      const updatedNodes = [...nds, newNode];
      setEdges(buildEdgesFromNodes(updatedNodes));
      return updatedNodes;
    });
  }, [activeLabel, stableDelete, stableChange, setNodes, setEdges]);

  // ─── Save — granular upsert/delete per message_order ─────────────────────────
  const handleSave = useCallback(async () => {
    setSaveStatus("saving");

    const upserts: Omit<FollowupFlow, "id">[] = [];
    const deletes: { step: number; message_order: number }[] = [];

    for (const node of nodes) {
      const d = node.data as MessageNodeData;
      const messages = messagesRef.current.get(node.id) ?? [...EMPTY_MESSAGES] as MessagesTriple;

      for (let i = 0; i < 3; i++) {
        const message_order = i + 1;
        const text = messages[i]?.trim() ?? "";

        if (text.length > 0) {
          upserts.push({
            label: activeLabel,
            step: d.step,
            message_order,
            message_text: text,
          });
        } else {
          deletes.push({ step: d.step, message_order });
        }
      }
    }

    try {
      // Upsert all filled messages in one batch
      if (upserts.length > 0) {
        const { error: upsertError } = await supabase
          .from("followup_flows")
          .upsert(upserts, { onConflict: "label,step,message_order" });

        if (upsertError) throw upsertError;
      }

      // Delete empty slots concurrently to avoid stale records
      if (deletes.length > 0) {
        const deleteResults = await Promise.all(
          deletes.map(({ step, message_order }) =>
            supabase
              .from("followup_flows")
              .delete()
              .eq("label", activeLabel)
              .eq("step", step)
              .eq("message_order", message_order)
          )
        );

        const deleteError = deleteResults.find((r) => r.error)?.error;
        if (deleteError) throw deleteError;
      }

      setSaveStatus("success");
    } catch (error) {
      console.error("Save Error Details:", error);
      setSaveStatus("error");
    } finally {
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [nodes, activeLabel]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: false,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "hsl(var(--primary))",
            },
          },
          eds
        )
      ),
    [setEdges]
  );

  const canAddNode = nodes.length < MAX_STEPS;

  const intervalLabel = useMemo(() => {
    return activeLabel === "SUSPECT" ? "todos os dias" : "dia sim, dia não";
  }, [activeLabel]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card shrink-0">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tighter">
            Flow Builder{" "}
            <span className="text-primary">{activeLabel}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Disparo:{" "}
            <span className="text-foreground font-medium">{intervalLabel}</span>
            {" · "}
            {nodes.length} / {MAX_STEPS} passos · até 3 mensagens por passo
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Label toggle */}
          <div className="flex border border-border/60 bg-background overflow-hidden">
            {(["SUSPECT", "LEAD"] as FlowLabel[]).map((lbl) => (
              <button
                key={lbl}
                onClick={() => setActiveLabel(lbl)}
                className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                  activeLabel === lbl
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Add node button */}
          <button
            onClick={handleAddNode}
            disabled={!canAddNode}
            title={canAddNode ? "Adicionar passo" : "Máximo de 7 passos atingido"}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest border border-border/60 bg-secondary text-secondary-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Passo
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              saveStatus === "error"
                ? "bg-destructive text-white border border-destructive"
                : saveStatus === "success"
                ? "bg-primary/20 text-primary border border-primary"
                : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary"
            } disabled:opacity-60`}
          >
            {saveStatus === "saving" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveStatus === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : saveStatus === "error" ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saveStatus === "saving"
              ? "Salvando..."
              : saveStatus === "success"
              ? "Salvo!"
              : saveStatus === "error"
              ? "Erro"
              : "Salvar Fluxo"}
          </button>
        </div>
      </header>

      {/* ── Flow Canvas ── */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {!isLoading && nodes.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="border border-dashed border-border p-12 flex flex-col items-center gap-4">
              <p className="text-muted-foreground text-sm font-medium">
                Nenhum passo criado para o fluxo{" "}
                <span className="text-foreground font-bold">{activeLabel}</span>
              </p>
              <p className="text-xs text-muted-foreground/70">
                Clique em{" "}
                <span className="font-bold text-primary">+ Passo</span>{" "}
                para começar a montar o fluxo.
              </p>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.5}
          maxZoom={2}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
          style={{ background: "hsl(var(--background))" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="hsl(var(--muted-foreground) / 0.25)"
          />
          <Controls
            className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground [&>button:hover]:bg-secondary"
            style={{ borderRadius: 0 }}
          />
          <MiniMap
            nodeColor={(n) => {
              const d = n.data as MessageNodeData;
              return d.isFinal ? "hsl(var(--destructive))" : "hsl(var(--primary))";
            }}
            maskColor="hsl(var(--background) / 0.8)"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 0,
            }}
          />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 bg-card border border-border/60 p-3 text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 inline-block bg-primary" />
            Passo normal · até 3 disparos
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 inline-block bg-destructive" />
            Encerramento (passo 7)
          </div>
        </div>
      </div>
    </div>
  );
}
