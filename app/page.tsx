"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { FilePicker } from "@/components/file-picker";
import { RequireAuth } from "@/components/require-auth";

export default function Home() {
  return (
    <RequireAuth minRole="editor">
      <HomeContent />
    </RequireAuth>
  );
}

function HomeContent() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<{ base64: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: { base64: string; name: string }) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  const pdfUrl = useMemo(() => {
    if (!selectedFile) return null;
    const bytes = atob(selectedFile.base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  }, [selectedFile]);

  const handleExtract = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Extract data from PDF
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: selectedFile.base64,
          fileName: selectedFile.name,
        }),
      });

      const extractResult = await extractRes.json();

      if (!extractResult.success) {
        setError(extractResult.error || "Extraktion fehlgeschlagen");
        return;
      }

      // 2. Save to database (with PDF file)
      const saveRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          data: extractResult.data,
          fileBase64: selectedFile.base64,
        }),
      });

      const saveResult = await saveRes.json();

      if (saveResult.success) {
        router.push(`/invoices/${saveResult.data.id}`);
      } else {
        setError(saveResult.error || "Rechnung konnte nicht gespeichert werden");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" width={56} height={56} className="rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Rechnungsdaten-Extraktor</h1>
              <p className="text-muted-foreground text-sm mt-1">
                PDF-Rechnung hochladen und strukturierte Daten mit Google Gemini KI extrahieren
              </p>
            </div>
          </div>

          <Separator />

          <FilePicker onFileSelect={handleFileSelect} selectedFileName={selectedFile?.name} />

          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-[70vh] rounded-lg border"
              title="PDF-Vorschau"
            />
          )}
        </div>
      </div>

      <div className="border-t bg-background px-4 py-3">
        <div className="max-w-5xl mx-auto space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleExtract}
            disabled={!selectedFile || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Extrahiere & speichere...
              </span>
            ) : (
              "Rechnungsdaten extrahieren"
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
