"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiKeyInput } from "@/components/api-key-input";
import { FilePicker } from "@/components/file-picker";
import { InvoiceDetails } from "@/components/invoice-details";
import { InvoiceTable } from "@/components/invoice-table";
import type { InvoiceData } from "@/lib/types";
import type { Tables } from "@/lib/database.types";

type SavedInvoice = Pick<
  Tables<"invoices">,
  "id" | "file_name" | "invoice_number" | "invoice_date" | "currency" | "total" | "created_at"
> & {
  vendors: Pick<Tables<"vendors">, "name">;
  customers: Pick<Tables<"customers">, "name">;
};

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ base64: string; name: string } | null>(null);
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("gemini-api-key");
    if (stored) setApiKey(stored);
    loadSavedInvoices();
  }, []);

  const loadSavedInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      const result = await res.json();
      if (result.success) setSavedInvoices(result.data || []);
    } catch {
      // silently fail — DB might not be running yet
    }
  };

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
    setExtractedData(null);
    setError(null);
    setSaved(false);
  }, []);

  const handleExtract = async () => {
    if (!apiKey || !selectedFile) return;

    setLoading(true);
    setError(null);
    setExtractedData(null);
    setSaved(false);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: selectedFile.base64,
          fileName: selectedFile.name,
          apiKey,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setExtractedData(result.data);
      } else {
        setError(result.error || "Extraction failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData || !selectedFile) return;

    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          data: extractedData,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setSaved(true);
        loadSavedInvoices();
      } else {
        setError(result.error || "Failed to save");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
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
              Extracting data...
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

        {extractedData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Extracted Data</h2>
              <Button onClick={handleSave} disabled={saving || saved} variant={saved ? "outline" : "default"}>
                {saved ? "Saved" : saving ? "Saving..." : "Save to Database"}
              </Button>
            </div>
            <InvoiceDetails data={extractedData} />
            <InvoiceTable data={extractedData} />
          </div>
        )}

        {savedInvoices.length > 0 && (
          <>
            <Separator />
            <h2 className="text-lg font-semibold">Saved Invoices</h2>
            <div className="grid gap-3">
              {savedInvoices.map((inv) => (
                <Card key={inv.id} className="py-3">
                  <CardHeader className="pb-2 pt-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {inv.vendors?.name} — {inv.invoice_number}
                      </CardTitle>
                      <Badge variant="secondary">
                        {inv.total?.toFixed(2)} {inv.currency}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-0">
                    <p className="text-xs text-muted-foreground">
                      {inv.file_name} &middot; {inv.invoice_date} &middot; Saved{" "}
                      {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
