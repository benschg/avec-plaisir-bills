"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCallback, useEffect, useRef, useState } from "react";

interface FilePickerProps {
  onFileSelect: (file: { base64: string; name: string }) => void;
  selectedFileName?: string;
}

export function FilePicker({ onFileSelect, selectedFileName }: FilePickerProps) {
  const [dragOver, setDragOver] = useState(false);
  const [exampleFiles, setExampleFiles] = useState<string[]>([]);
  const [loadingExample, setLoadingExample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/examples")
      .then((r) => r.json())
      .then((data) => setExampleFiles(data.files || []))
      .catch(() => {});
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        alert("Bitte wählen Sie eine PDF-Datei aus");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        onFileSelect({ base64, name: file.name });
      };
      reader.readAsDataURL(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleExampleClick = async (filename: string) => {
    setLoadingExample(filename);
    try {
      const res = await fetch(`/api/examples/${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (data.file) {
        onFileSelect({ base64: data.file, name: data.fileName });
      }
    } catch {
      alert("Beispieldatei konnte nicht geladen werden");
    } finally {
      setLoadingExample(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <svg
            className="w-10 h-10 mb-3 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm font-medium">
            {selectedFileName ? (
              <>
                Ausgewählt: <span className="text-primary">{selectedFileName}</span>
              </>
            ) : (
              "PDF hier ablegen oder klicken zum Durchsuchen"
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Nur PDF-Dateien</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </CardContent>
      </Card>

      {exampleFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Oder wählen Sie eine Beispielrechnung:</p>
          <div className="flex flex-wrap gap-2">
            {exampleFiles.map((filename) => (
              <Button
                key={filename}
                variant={selectedFileName === filename ? "default" : "outline"}
                size="sm"
                disabled={loadingExample !== null}
                onClick={() => handleExampleClick(filename)}
              >
                {loadingExample === filename ? "Laden..." : filename}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
