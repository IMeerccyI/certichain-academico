import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortenHash } from "@/lib/hash";
import { useAppStore } from "@/store/app-store";

type HashChipProps = {
  hash: string;
  size?: number;
};

export function HashChip({ hash, size = 10 }: HashChipProps) {
  const addToast = useAppStore((state) => state.addToast);

  const copyHash = async () => {
    await navigator.clipboard?.writeText(hash);
    addToast({
      title: "Hash copiado",
      description: shortenHash(hash, 12),
      intent: "info",
    });
  };

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
      <span className="truncate">{shortenHash(hash, size)}</span>
      <Button
        aria-label="Copiar hash"
        className="min-h-0 rounded p-1"
        icon={<Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        onClick={copyHash}
        variant="ghost"
      />
    </span>
  );
}
