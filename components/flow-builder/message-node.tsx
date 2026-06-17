"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";

export type MessageNodeData = {
  step: number;
  label: string; // 'LEAD' | 'SUSPECT'
  message_text: string;
  isFinal: boolean;
  onDelete: (id: string) => void;
  onMessageChange: (id: string, value: string) => void;
};

function MessageNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MessageNodeData;
  const { step, isFinal, message_text, onDelete, onMessageChange } = nodeData;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onMessageChange(id, e.target.value);
    },
    [id, onMessageChange]
  );

  const handleDelete = useCallback(() => {
    onDelete(id);
  }, [id, onDelete]);

  return (
    <div
      className={`
        relative w-72 bg-card text-card-foreground
        transition-all duration-150
        ${isFinal
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
          flex items-center justify-between px-4 py-2.5
          ${isFinal ? "bg-destructive/10 border-b border-destructive/30" : "bg-secondary border-b border-border/60"}
        `}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`
              inline-flex items-center justify-center w-6 h-6 text-[10px] font-bold
              ${isFinal
                ? "bg-destructive text-white"
                : "bg-primary text-primary-foreground"
              }
            `}
          >
            {step}
          </span>
          <span className="text-sm font-semibold tracking-wider uppercase">
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

      {/* Textarea body */}
      <div className="p-3">
        <textarea
          value={message_text}
          onChange={handleChange}
          placeholder={
            isFinal
              ? "Última mensagem antes do encerramento do fluxo..."
              : `Mensagem do dia ${step}...`
          }
          rows={4}
          className={`
            nodrag nowheel w-full resize-none bg-background/60 text-sm text-foreground
            placeholder:text-muted-foreground/50
            border focus:outline-none focus:ring-0 p-2.5 leading-relaxed
            transition-colors
            ${isFinal
              ? "border-destructive/30 focus:border-destructive/60"
              : "border-border/40 focus:border-primary/60"
            }
          `}
          style={{ borderRadius: 0 }}
        />
        {isFinal && (
          <p className="mt-1.5 text-[10px] text-destructive/80 font-medium tracking-wide uppercase">
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

export const MessageNode = memo(MessageNodeComponent);
