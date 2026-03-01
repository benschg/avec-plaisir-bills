"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function ApiKeyInput({ apiKey, onApiKeyChange }: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="api-key">Google Gemini API-Schlüssel</Label>
        <Input
          id="api-key"
          type={visible ? "text" : "password"}
          placeholder="Gemini API-Schlüssel eingeben..."
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
        />
      </div>
      <Button variant="outline" size="sm" onClick={() => setVisible(!visible)}>
        {visible ? "Verbergen" : "Anzeigen"}
      </Button>
    </div>
  );
}
