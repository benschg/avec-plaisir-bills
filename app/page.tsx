"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ApiKeyInput } from "@/components/api-key-input";
import { FilePicker } from "@/components/file-picker";

export default function Home() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ base64: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("gemini-api-key");
    if (stored) setApiKey(stored);
  }, []);

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    if (key) {
      sessionStorage.setItem("gemini-api-key", key);
    } else {
      sessionStorage.removeItem("gemini-api-key");
    }
  }, []);

  const handleFileSelect = useCallback((file: { base64: string; name: string }) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleExtract = async () => {
    if (!apiKey || !selectedFile) return;

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
          apiKey,
        }),
      });

      const extractResult = await extractRes.json();

      if (!extractResult.success) {
        setError(extractResult.error || "Extraction failed");
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
        setError(saveResult.error || "Failed to save invoice");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoice Data Extractor</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a PDF invoice and extract structured data using Google Gemini AI
          </p>
        </div>

        <Separator />

        <ApiKeyInput apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />

        <FilePicker onFileSelect={handleFileSelect} selectedFileName={selectedFile?.name} />

        <Button
          onClick={handleExtract}
          disabled={!apiKey || !selectedFile || loading}
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
              Extracting & saving...
            </span>
          ) : (
            "Extract Invoice Data"
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
