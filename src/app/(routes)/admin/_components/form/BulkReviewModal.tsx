import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical, AlertCircle } from "lucide-react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkProcessingResult } from "./BulkUploadModal";
import { VisionPlayer } from "@/lib/visionTypes";
import { Player } from "@/generated/prisma/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormValues } from "../../_utils/form-helpers";

interface SetOption {
  id: number;
  label: string;
  isNew: boolean;
}

interface MatchAssignment {
  resultId: string;
  setId: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  results: BulkProcessingResult[];
  existingSets: FormValues["sets"];
  sessionPlayers: Player[];
  onConfirm: (
    assignments: Map<number, BulkProcessingResult[]>,
    newSetIds: number[],
  ) => void;
  highestSetId: number;
}

/**
 * BulkReviewModal component for reviewing and assigning matches to sets
 *
 * @description
 * This component allows users to:
 * 1. Review all successfully processed screenshots
 * 2. Assign each match to an existing or new set
 * 3. Create new sets as needed
 * 4. Remove sets that are empty
 * 5. Confirm assignments and update the form state
 *
 * @param props - Component props
 */
const BulkReviewModal = (props: Props) => {
  const {
    open,
    onClose,
    results,
    existingSets,
    onConfirm,
    highestSetId,
  } = props;

  // Initialize set options with existing sets
  const initialSetOptions: SetOption[] = existingSets.map((set, index) => ({
    id: set.setId,
    label: `Set ${index + 1}`,
    isNew: false,
  }));

  const [setOptions, setSetOptions] = useState<SetOption[]>(initialSetOptions);
  const [nextNewSetId, setNextNewSetId] = useState(highestSetId + 1);

  // Initialize assignments - all unassigned initially
  const [assignments, setAssignments] = useState<MatchAssignment[]>(
    results.map((r) => ({
      resultId: r.id,
      setId: null,
    })),
  );

  /**
   * Adds a new set option
   */
  const handleAddSet = useCallback(() => {
    const newSetId = nextNewSetId;
    setSetOptions((prev) => [
      ...prev,
      {
        id: newSetId,
        label: `Set ${prev.length + 1} (New)`,
        isNew: true,
      },
    ]);
    setNextNewSetId((prev) => prev + 1);
  }, [nextNewSetId]);

  /**
   * Removes a set option (only new sets or empty existing sets)
   */
  const handleRemoveSet = useCallback(
    (setId: number) => {
      // Check if any matches are assigned to this set
      const hasAssignments = assignments.some((a) => a.setId === setId);
      if (hasAssignments) {
        // Unassign all matches from this set
        setAssignments((prev) =>
          prev.map((a) => (a.setId === setId ? { ...a, setId: null } : a)),
        );
      }

      setSetOptions((prev) => {
        const filtered = prev.filter((s) => s.id !== setId);
        // Renumber the labels
        return filtered.map((s, i) => ({
          ...s,
          label: `Set ${i + 1}${s.isNew ? " (New)" : ""}`,
        }));
      });
    },
    [assignments],
  );

  /**
   * Updates a match assignment
   */
  const handleAssignmentChange = useCallback(
    (resultId: string, setId: number | null) => {
      setAssignments((prev) =>
        prev.map((a) => (a.resultId === resultId ? { ...a, setId } : a)),
      );
    },
    [],
  );

  /**
   * Validates and confirms the assignments
   */
  const handleConfirm = useCallback(() => {
    // Check if all matches are assigned
    const unassignedCount = assignments.filter((a) => a.setId === null).length;
    if (unassignedCount > 0) {
      return; // Button should be disabled, but just in case
    }

    // Group assignments by set
    const groupedAssignments = new Map<number, BulkProcessingResult[]>();
    assignments.forEach((assignment) => {
      if (assignment.setId === null) return;
      const result = results.find((r) => r.id === assignment.resultId);
      if (!result) return;

      if (!groupedAssignments.has(assignment.setId)) {
        groupedAssignments.set(assignment.setId, []);
      }
      groupedAssignments.get(assignment.setId)!.push(result);
    });

    // Get new set IDs
    const newSetIds = setOptions.filter((s) => s.isNew).map((s) => s.id);

    onConfirm(groupedAssignments, newSetIds);
    onClose();
  }, [assignments, results, setOptions, onConfirm, onClose]);

  /**
   * Gets player names from vision data
   */
  const getPlayerNames = (players: VisionPlayer[]): string => {
    if (!players || players.length === 0) return "No players detected";
    return players.map((p) => p.name).join(", ");
  };

  /**
   * Gets winner names from vision data
   */
  const getWinnerNames = (winners?: VisionPlayer[]): string => {
    if (!winners || winners.length === 0) return "No winner detected";
    return winners.map((w) => w.name).join(", ");
  };

  const unassignedCount = assignments.filter((a) => a.setId === null).length;
  const canConfirm = unassignedCount === 0 && results.length > 0;

  // Memoize to avoid recalculations
  const setOptionsForSelect = useMemo(() => setOptions, [setOptions]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Review & Assign Matches to Sets
          </DialogTitle>
          <DialogDescription>
            Assign each extracted match to a set. You can create new sets or use
            existing ones.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Sets Panel */}
          <Card className="p-4 md:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-base font-semibold">Sets</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddSet}
                type="button"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Set
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {setOptions.length === 0 ? (
                  <p className="text-muted-foreground text-center text-sm">
                    No sets. Click &quot;Add Set&quot; to create one.
                  </p>
                ) : (
                  setOptions.map((setOption) => {
                    const assignedCount = assignments.filter(
                      (a) => a.setId === setOption.id,
                    ).length;
                    return (
                      <div
                        key={setOption.id}
                        className="flex items-center justify-between rounded-md border p-2"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm">{setOption.label}</span>
                          <span className="text-muted-foreground text-xs">
                            ({assignedCount} match
                            {assignedCount !== 1 ? "es" : ""})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSet(setOption.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Matches Panel */}
          <Card className="p-4 md:col-span-2">
            <Label className="mb-3 block text-base font-semibold">
              Matches ({results.length})
            </Label>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {results.map((result, index) => {
                  const assignment = assignments.find(
                    (a) => a.resultId === result.id,
                  );
                  const isAssigned = assignment?.setId !== null;

                  return (
                    <div
                      key={result.id}
                      className={`flex gap-3 rounded-lg border p-3 transition-colors ${
                        isAssigned
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-yellow-500/30 bg-yellow-500/5"
                      }`}
                    >
                      {/* Preview Image */}
                      <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded">
                        <Image
                          src={result.previewUrl}
                          alt={result.fileName}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Match Details */}
                      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Match {index + 1}
                          </span>
                          {result.status === "check" && (
                            <span className="flex items-center gap-1 text-xs text-yellow-500">
                              <AlertCircle className="h-3 w-3" />
                              Needs review
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground truncate text-xs">
                          {result.fileName}
                        </span>
                        {result.data && (
                          <>
                            <span className="text-xs">
                              <strong>Players:</strong>{" "}
                              {getPlayerNames(result.data.players)}
                            </span>
                            <span className="text-xs">
                              <strong>Winner:</strong>{" "}
                              {getWinnerNames(result.data.winner)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Set Assignment */}
                      <div className="flex flex-shrink-0 flex-col gap-1">
                        <Label className="text-xs">Assign to Set</Label>
                        <Select
                          value={assignment?.setId?.toString() ?? ""}
                          onValueChange={(value) =>
                            handleAssignmentChange(
                              result.id,
                              value ? parseInt(value) : null,
                            )
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select set..." />
                          </SelectTrigger>
                          <SelectContent>
                            {setOptionsForSelect.map((setOption) => (
                              <SelectItem
                                key={setOption.id}
                                value={setOption.id.toString()}
                              >
                                {setOption.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            {unassignedCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-yellow-500">
                <AlertCircle className="h-4 w-4" />
                {unassignedCount} unassigned match
                {unassignedCount !== 1 ? "es" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              type="button"
            >
              Confirm Assignments
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkReviewModal;
