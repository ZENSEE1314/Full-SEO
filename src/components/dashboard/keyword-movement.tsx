"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface KeywordMover {
  id: string;
  keyword: string;
  current_rank: number | null;
  change: number;
  ranking_url: string | null;
}

interface KeywordMovementProps {
  movers: KeywordMover[];
}

function RankChange({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3" />
        <span className="text-xs">0</span>
      </span>
    );
  }

  // Negative change means rank went down in number = improved position
  const isImproved = change < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isImproved ? "text-emerald-400" : "text-red-400",
      )}
    >
      {isImproved ? (
        <ArrowUp className="size-3" />
      ) : (
        <ArrowDown className="size-3" />
      )}
      {Math.abs(change)}
    </span>
  );
}

export function KeywordMovement({ movers }: KeywordMovementProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 p-5 backdrop-blur-sm",
        "animate-[slide-up_0.4s_ease-out_both]",
      )}
      style={{ animationDelay: "400ms" }}
    >
      <div className="mb-4">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Keyword Movers
        </h3>
        <p className="text-sm text-muted-foreground">
          Top rank changes this week
        </p>
      </div>

      {movers.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No keyword movement data yet
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground">
                Keyword
              </TableHead>
              <TableHead className="text-right text-xs text-muted-foreground">
                Rank
              </TableHead>
              <TableHead className="text-right text-xs text-muted-foreground">
                Change
              </TableHead>
              <TableHead className="hidden text-xs text-muted-foreground md:table-cell">
                URL
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movers.map((mover) => (
              <TableRow
                key={mover.id}
                className="border-border/20 hover:bg-nexus-accent/5"
              >
                <TableCell className="max-w-48 truncate font-medium text-foreground">
                  {mover.keyword}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {mover.current_rank ?? "--"}
                </TableCell>
                <TableCell className="text-right">
                  <RankChange change={mover.change} />
                </TableCell>
                <TableCell className="hidden max-w-40 truncate text-xs text-muted-foreground md:table-cell">
                  {mover.ranking_url
                    ? new URL(mover.ranking_url).pathname
                    : "--"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
