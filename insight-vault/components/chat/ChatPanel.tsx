"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import { type ChatMessage } from "@/db/schema";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { VoiceMicButton } from "@/components/ui/VoiceMicButton";

interface ChatPanelProps {
  messages: ChatMessage[];
  streaming: boolean;
  streamBuffer: string;
  error: string | null;
  onAsk: (question: string) => Promise<void>;
  onClear: () => Promise<void>;
  aiReady: boolean;
}

export function ChatPanel({
  messages,
  streaming,
  streamBuffer,
  error,
  onAsk,
  onClear,
  aiReady,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => {
      const separator = prev && !prev.endsWith(" ") ? " " : "";
      return prev + separator + text;
    });
  }, []);

  const voice = useVoiceInput({ onTranscript: handleVoiceTranscript });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamBuffer]);

  async function handleSend() {
    const q = input.trim();
    if (!q || streaming) return;
    setInput("");
    await onAsk(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Ask Your Notes</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear chat history"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onClear}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground text-center px-4">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p className="text-sm">
              Ask anything about your saved insights.
              <br />
              <span className="text-xs opacity-70">
                e.g. &ldquo;What have I noted about discipline?&rdquo;
              </span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 animate-fade-in",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                msg.role === "user"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {msg.role === "user" ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary/15 text-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}
            >
              {msg.role === "assistant" ? (
                <Markdown content={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Streaming chunk */}
        {streaming && streamBuffer && (
          <div className="flex gap-3 animate-fade-in" role="status" aria-live="polite">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center" aria-hidden="true">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-relaxed">
              <Markdown content={streamBuffer} />
              <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" aria-hidden="true" />
            </div>
          </div>
        )}

        {streaming && !streamBuffer && (
          <div className="flex gap-3" role="status" aria-live="polite" aria-label="AI is thinking">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center" aria-hidden="true">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive text-center px-4" role="alert">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        {!aiReady && (
          <p className="text-xs text-muted-foreground text-center mb-2">
            Add your Gemini API key in Settings to enable AI chat.
          </p>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              placeholder={
                voice.listening
                  ? "Listening… speak now"
                  : aiReady
                    ? "Ask a question about your notes… (Enter to send)"
                    : "AI not configured"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!aiReady || streaming}
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
              aria-label="Chat message input"
            />
            {voice.interimText && (
              <p className="text-[10px] text-muted-foreground italic mt-0.5 px-1 truncate">
                {voice.interimText}…
              </p>
            )}
          </div>
          <VoiceMicButton
            listening={voice.listening}
            supported={voice.supported}
            onClick={voice.toggle}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!aiReady || streaming || !input.trim()}
            className="shrink-0 h-10 w-10"
            aria-label="Send message"
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {voice.error && (
          <p className="text-xs text-destructive mt-1">{voice.error}</p>
        )}
      </div>
    </div>
  );
}
