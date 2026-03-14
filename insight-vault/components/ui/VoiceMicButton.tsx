"use client";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceMicButtonProps {
  listening: boolean;
  supported: boolean;
  onClick: () => void;
  className?: string;
  size?: "sm" | "default";
}

export function VoiceMicButton({
  listening,
  supported,
  onClick,
  className,
  size = "default",
}: VoiceMicButtonProps) {
  if (!supported) return null;

  const isSmall = size === "sm";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      onClick={onClick}
      className={cn(
        "shrink-0 transition-all",
        isSmall ? "h-8 w-8" : "h-10 w-10",
        listening
          ? "text-red-400 bg-red-500/15 hover:bg-red-500/25 animate-pulse"
          : "text-muted-foreground hover:text-primary hover:bg-primary/10",
        className
      )}
    >
      {listening ? (
        <MicOff className={cn(isSmall ? "w-3.5 h-3.5" : "w-4 h-4")} />
      ) : (
        <Mic className={cn(isSmall ? "w-3.5 h-3.5" : "w-4 h-4")} />
      )}
    </Button>
  );
}
