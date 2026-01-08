import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  FolderUp,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { Player } from "@/generated/prisma/client";
import Image from "next/image";
import { VisionResultCodes } from "@/lib/constants";
import { toast } from "sonner";
import { handleAnalyzeBtnClick } from "../../_utils/rdc-vision-helpers";
import { VisionPlayer, VisionResult } from "@/lib/visionTypes";
import { z } from "zod/v4";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  onBulkProcessingComplete: (results: BulkProcessingResult[]) => void;
  sessionPlayers: Player[];
  gameName: string;
}

export interface BulkProcessingResult {
  id: string;
  fileName: string;
  previewUrl: string;
  status: "pending" | "processing" | "success" | "check" | "failed";
  message: string;
  data?: VisionResult;
}

const zodFile = z
  .file({ error: "File is required." })
  .mime(["image/jpeg", "image/png", "image/jpg"], {
    error: "Invalid file type. Please upload a valid image.",
  });

/**
 * Converts a File object to a base64 encoded string
 *
 * @param selectedFile - The File object to convert
 * @returns Promise that resolves with the base64 encoded string
 */
const getFileAsBase64 = async (selectedFile: File): Promise<string | null> => {
  const reader = new FileReader();

  const readFile = () =>
    new Promise((resolve, reject) => {
      reader.onload = async (e) => resolve(e.target?.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(selectedFile);
    });

  try {
    const fileContent = await readFile();
    if (!fileContent) return null;
    return Buffer.from(fileContent as ArrayBuffer).toString("base64");
  } catch (error) {
    console.error("Error reading file content:", error);
    return null;
  }
};

/**
 * BulkUploadModal component for uploading and processing multiple screenshots
 *
 * @description
 * This component allows users to:
 * 1. Select multiple screenshot files at once
 * 2. Preview selected files before processing
 * 3. Process all files in parallel using the vision API
 * 4. View processing status for each file
 * 5. Trigger a review modal when processing is complete
 *
 * @param props - Component props
 * @param props.onBulkProcessingComplete - Callback when all files are processed
 * @param props.sessionPlayers - Array of players in the current session
 * @param props.gameName - Name of the current game
 */
const BulkUploadModal = (props: Props) => {
  const { onBulkProcessingComplete, sessionPlayers, gameName } = props;

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<BulkProcessingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Map to store actual File objects (not serializable in state)
  const [fileMap] = useState<Map<string, File>>(new Map());

  /**
   * Handles file selection from the file input
   */
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || event.target.files.length === 0) return;

      const newFiles: BulkProcessingResult[] = [];

      Array.from(event.target.files).forEach((file) => {
        const validationResult = zodFile.safeParse(file);
        if (!validationResult.success) {
          console.warn("Invalid file:", file.name, validationResult.error);
          return;
        }

        const url = URL.createObjectURL(file);
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          previewUrl: url,
          status: "pending",
          message: "Ready to process",
          data: undefined,
        });

        // Store the file reference in a map for later processing
        fileMap.set(newFiles[newFiles.length - 1].id, file);
      });

      if (newFiles.length === 0) {
        toast.error("No valid image files found", { richColors: true });
        return;
      }

      setFiles((prev) => [...prev, ...newFiles]);
      event.target.value = ""; // Reset input
    },
    [fileMap],
  );

  /**
   * Removes a file from the list
   */
  const handleRemoveFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === id);
        if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
        return prev.filter((f) => f.id !== id);
      });
      fileMap.delete(id);
    },
    [fileMap],
  );

  /**
   * Processes a single file using the vision API
   */
  const processFile = async (
    fileResult: BulkProcessingResult,
  ): Promise<BulkProcessingResult> => {
    const file = fileMap.get(fileResult.id);
    if (!file) {
      return {
        ...fileResult,
        status: "failed",
        message: "File not found",
      };
    }

    const base64Content = await getFileAsBase64(file);
    if (!base64Content) {
      return {
        ...fileResult,
        status: "failed",
        message: "Failed to read file",
      };
    }

    const result = await handleAnalyzeBtnClick(
      base64Content,
      sessionPlayers,
      gameName,
    );

    switch (result.status) {
      case VisionResultCodes.Success:
        return {
          ...fileResult,
          status: "success",
          message: "Analysis completed successfully",
          data: result.data,
        };
      case VisionResultCodes.CheckRequest:
        return {
          ...fileResult,
          status: "check",
          message: result.message || "Analysis requires review",
          data: result.data,
        };
      case VisionResultCodes.Failed:
        return {
          ...fileResult,
          status: "failed",
          message: result.message || "Analysis failed",
        };
      default:
        return {
          ...fileResult,
          status: "failed",
          message: "Unknown error occurred",
        };
    }
  };

  /**
   * Processes all pending files in parallel
   */
  const handleProcessAll = async () => {
    if (files.length === 0) {
      toast.warning("No files to process", { richColors: true });
      return;
    }

    if (sessionPlayers.length === 0) {
      toast.warning("Please select session players first", { richColors: true });
      return;
    }

    setIsProcessing(true);

    // Set all files to processing status
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending"
          ? { ...f, status: "processing" as const, message: "Processing..." }
          : f,
      ),
    );

    // Process all pending files in parallel
    const pendingFiles = files.filter((f) => f.status === "pending" || f.status === "processing");
    const results = await Promise.all(pendingFiles.map(processFile));

    // Update files with results
    setFiles((prev) =>
      prev.map((f) => {
        const result = results.find((r) => r.id === f.id);
        return result || f;
      }),
    );

    setIsProcessing(false);

    // Check if we have any successful results
    const successfulResults = results.filter(
      (r) => r.status === "success" || r.status === "check",
    );

    if (successfulResults.length === 0) {
      toast.error("All files failed to process", { richColors: true });
      return;
    }

    toast.success(
      `Processed ${successfulResults.length}/${results.length} files successfully`,
      { richColors: true },
    );

    // Pass results to parent and close modal
    onBulkProcessingComplete(successfulResults);
    handleClose();
  };

  /**
   * Cleans up and closes the modal
   */
  const handleClose = () => {
    // Clean up preview URLs
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFiles([]);
    fileMap.clear();
    setOpen(false);
  };

  /**
   * Gets the status icon for a file
   */
  const getStatusIcon = (status: BulkProcessingResult["status"]) => {
    switch (status) {
      case "pending":
        return <div className="h-5 w-5 rounded-full border-2 border-gray-400" />;
      case "processing":
        return <LoaderCircle className="h-5 w-5 animate-spin text-blue-500" />;
      case "success":
        return <CircleCheck className="h-5 w-5 text-green-500" />;
      case "check":
        return <CircleAlert className="h-5 w-5 text-yellow-500" />;
      case "failed":
        return <CircleX className="h-5 w-5 text-red-500" />;
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const processingCount = files.filter((f) => f.status === "processing").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isProcessing) return; // Prevent closing while processing
        if (!v) handleClose();
        else setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="bg-secondary text-secondary-foreground my-2 rounded-sm p-4"
          type="button"
        >
          <FolderUp className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl">Bulk Screenshot Import</DialogTitle>
          <DialogDescription>
            Select multiple screenshots to import match data in bulk. All files
            will be processed simultaneously.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isProcessing}
            className="hover:bg-primary-foreground hover:cursor-pointer"
          />

          {files.length > 0 && (
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border p-2"
                  >
                    <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded">
                      <Image
                        src={file.previewUrl}
                        alt={file.fileName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-medium">
                        {file.fileName}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {file.message}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(file.status)}
                      {!isProcessing && file.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(file.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {files.length === 0 && (
            <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">
                Select files to see them here
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <span className="text-muted-foreground text-sm">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
            {processingCount > 0 && ` (${processingCount} processing)`}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcessAll}
              disabled={
                isProcessing ||
                pendingCount === 0 ||
                sessionPlayers.length === 0
              }
              type="button"
            >
              {isProcessing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Process ${pendingCount} File${pendingCount !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadModal;
