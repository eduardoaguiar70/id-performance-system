"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";

export type MessageNodeData = {
  step: number;
  label: string;
  messages: [string, string, string];
  isFinal: boolean;
  onDelete: (id: string) => void;
  onMessageChange: (id: string, index: number, value: string) => void;
};

const MESSAGE_LABELS = ["MENSAGEM 1", "MENSAGEM 2", "MENSAGEM 3"] as const;

function MessageNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MessageNodeData;
  const { step, isFinal, messages, onDelete, onMessageChange } = nodeData;

  const handleDelete = useCallback(() => {
    onDelete(id);
  }, [id, onDelete]);

  return (
    <div
      className={`
        relative w-[300px] bg-card text-card-foreground
        transition-all duration-150
        ${
          isFinal
            ? "border-2 border-destructive shadow-[0_0_20px_rgba(220,38,38,0.25)]"
            : selected
            ? "border-2 border-primary shadow-[0_0_20px_rgba(93,194,32,0.2)]"
            : "border border-border/60"
        }
      `}
      style={{ borderRadius: 0 }}
    >
      {/* Top handle */}
      {step > 1 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !rounded-none !bg-primary !border-0"
        />
      )}

      {/* Header */}
      <div
        className={`
          flex items-center justify-between px-3 py-2
          ${
            isFinal
              ? "bg-destructive/10 border-b border-destructive/30"
              : "bg-secondary border-b border-border/60"
          }
        `}
      >
        <div className="flex items-center gap-2">
          <span
            className={`
              inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold
              ${isFinal ? "bg-destructive text-white" : "bg-primary text-primary-foreground"}
            `}
          >
            {step}
          </span>
          <span className="text-xs font-semibold tracking-wider uppercase font-mono">
            {isFinal ? "Encerramento" : `Passo ${step}`}
          </span>
        </div>

        <button
          onClick={handleDelete}
          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
          title="Remover nó"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Multi-message body */}
      <div className="p-2.5 flex flex-col gap-2.5">
        {MESSAGE_LABELS.map((labelText, i) => (
          <MessageField
            key={i}
            nodeId={id}
            index={i}
            label={labelText}
            value={messages[i] ?? ""}
            isFinal={isFinal}
            step={step}
            onMessageChange={onMessageChange}
          />
        ))}

        {isFinal && (
          <p className="mt-0.5 text-[10px] text-destructive/80 font-mono font-medium tracking-wide uppercase">
            ⚠ Máximo de 7 passos atingido
          </p>
        )}
      </div>

      {/* Bottom handle */}
      {!isFinal && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !rounded-none !bg-primary !border-0"
        />
      )}
    </div>
  );
}

// ─── Sub-component: individual message field ─────────────────────────────────

type MessageFieldProps = {
  nodeId: string;
  index: number;
  label: string;
  value: string;
  isFinal: boolean;
  step: number;
  onMessageChange: (id: string, index: number, value: string) => void;
};

const MessageField = memo(function MessageField({
  nodeId,
  index,
  label,
  value,
  isFinal,
  step,
  onMessageChange,
}: MessageFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onMessageChange(nodeId, index, e.target.value);
    },
    [nodeId, index, onMessageChange]
  );

  return (
    <div>
      {/* Brutalist label row */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-mono text-[9px] font-bold tracking-[0.12em] text-muted-foreground uppercase shrink-0">
          {label}
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={
          index === 0
            ? isFinal
              ? "Última mensagem antes do encerramento..."
              : `Mensagem principal do passo ${step}...`
            : `Disparo sequencial ${index + 1}...`
        }
        rows={3}
        className={`
          nodrag nowheel w-full resize-none bg-background/60 text-xs text-foreground font-mono
          placeholder:text-muted-foreground/40
          border focus:outline-none focus:ring-0 p-2 leading-relaxed
          transition-colors
          ${
            isFinal
              ? "border-destructive/30 focus:border-destructive/60"
              : "border-border/40 focus:border-primary/60"
          }
        `}
        style={{ borderRadius: 0 }}
      />
    </div>
  );
});

export const MessageNode = memo(MessageNodeComponent);
