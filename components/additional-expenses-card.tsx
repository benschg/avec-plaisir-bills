"use client";

import { useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AdditionalExpense {
  id?: string;
  description: string;
  amount: number;
  currency: string;
  amount_original?: number;
  currency_original?: string;
}

interface LineExpense {
  description: string;
  amount: number;
  currency: string;
}

interface AdditionalExpensesCardProps {
  lineExpenses: LineExpense[];
  expenses: AdditionalExpense[];
  onAddExpense: (expense: AdditionalExpense) => void;
  onUpdateExpense: (index: number, expense: AdditionalExpense) => void;
  onRemoveExpense: (index: number) => void;
  invoiceCurrency: string;
}

function fmt(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

export function AdditionalExpensesCard({
  lineExpenses,
  expenses,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense,
  invoiceCurrency,
}: AdditionalExpensesCardProps) {
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [amountCHF, setAmountCHF] = useState("");
  const [amountOriginal, setAmountOriginal] = useState("");
  const [currencyOriginal, setCurrencyOriginal] = useState(invoiceCurrency);
  const showOriginalFields = invoiceCurrency !== "CHF";

  const openAdd = () => {
    setEditingIndex(null);
    setDescription("");
    setAmountCHF("");
    setAmountOriginal("");
    setCurrencyOriginal(invoiceCurrency);
    setOpen(true);
  };

  const openEdit = (index: number) => {
    const exp = expenses[index];
    setEditingIndex(index);
    setDescription(exp.description);
    setAmountCHF(String(exp.amount));
    setAmountOriginal(exp.amount_original != null ? String(exp.amount_original) : "");
    setCurrencyOriginal(exp.currency_original || invoiceCurrency);
    setOpen(true);
  };

  const handleSave = () => {
    const numCHF = parseFloat(amountCHF);
    if (!description || isNaN(numCHF) || numCHF <= 0) return;
    const numOriginal = parseFloat(amountOriginal);
    const expense: AdditionalExpense = {
      description,
      amount: numCHF,
      currency: "CHF",
      ...(showOriginalFields && !isNaN(numOriginal) && numOriginal > 0
        ? { amount_original: numOriginal, currency_original: currencyOriginal }
        : {}),
    };
    if (editingIndex !== null) {
      onUpdateExpense(editingIndex, expense);
    } else {
      onAddExpense(expense);
    }
    setOpen(false);
  };

  // Totals — all additional expenses are now in CHF
  const lineTotal = lineExpenses.reduce((s, e) => s + e.amount, 0);
  const addlTotalCHF = expenses.reduce((s, e) => s + e.amount, 0);

  const hasAny = lineExpenses.length > 0 || expenses.length > 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kosten</CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="text-sm space-y-0">

            {/* From Invoice */}
            {lineExpenses.length > 0 && (
              <>
                <div className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Aus Rechnung
                </div>
                {lineExpenses.map((exp, i) => (
                  <div key={i} className="flex justify-between items-center py-1 pl-3 gap-4">
                    <span className="text-muted-foreground truncate" title={exp.description}>
                      {exp.description}
                    </span>
                    <span className="font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap tabular-nums">
                      {fmt(exp.amount, exp.currency)}
                    </span>
                  </div>
                ))}
                {lineExpenses.length > 1 && (
                  <div className="flex justify-between items-center py-1 pl-3 border-t mt-0.5 gap-4">
                    <span className="text-muted-foreground">Zwischensumme</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap tabular-nums">
                      {fmt(lineTotal, invoiceCurrency)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Added Separately */}
            <div className={`flex items-center justify-between ${lineExpenses.length > 0 ? "mt-3 border-t pt-3" : ""}`}>
              <span className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Separat hinzugefügt
              </span>
              <Button size="sm" variant="ghost" onClick={openAdd} className="h-6 px-2 -mr-1">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Hinzufügen
              </Button>
            </div>
            {expenses.map((exp, i) => (
              <div key={i} className="flex items-center py-1 pl-3 gap-2">
                <span className="text-muted-foreground truncate flex-1" title={exp.description}>
                  {exp.description}
                </span>
                <Button
                  variant="ghost" size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={() => openEdit(i)}
                  title="Bearbeiten"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="h-6 w-6 p-0 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => onRemoveExpense(i)}
                  title="Entfernen"
                >
                  <X className="h-3 w-3" />
                </Button>
                <span className="font-medium text-red-700 dark:text-red-400 whitespace-nowrap tabular-nums">
                  {fmt(exp.amount, "CHF")}
                  {exp.amount_original != null && exp.currency_original && (
                    <span className="text-muted-foreground text-xs ml-1">
                      ({fmt(exp.amount_original, exp.currency_original)})
                    </span>
                  )}
                </span>
              </div>
            ))}

            {/* Grand Total */}
            {hasAny && (
              <div className="border-t mt-2 pt-2 space-y-0.5">
                {lineTotal > 0 && (
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-semibold">Rechnung</span>
                    <span className="font-bold tabular-nums whitespace-nowrap">
                      {fmt(lineTotal, invoiceCurrency)}
                    </span>
                  </div>
                )}
                {addlTotalCHF > 0 && (
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-semibold">+ Separat</span>
                    <span className="font-bold tabular-nums whitespace-nowrap text-red-700 dark:text-red-400">
                      {fmt(addlTotalCHF, "CHF")}
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Kosten bearbeiten" : "Kosten hinzufügen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dlg-desc">Beschreibung</Label>
              <Input
                id="dlg-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Versandkosten"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dlg-amount-chf">Betrag (CHF)</Label>
              <Input
                id="dlg-amount-chf"
                type="number"
                value={amountCHF}
                onChange={(e) => setAmountCHF(e.target.value)}
                placeholder="12.34"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            {showOriginalFields && (
              <div className="space-y-2">
                <Label htmlFor="dlg-amount-orig" className="text-muted-foreground">
                  Originalbetrag ({invoiceCurrency}) — optional
                </Label>
                <Input
                  id="dlg-amount-orig"
                  type="number"
                  value={amountOriginal}
                  onChange={(e) => setAmountOriginal(e.target.value)}
                  placeholder="10.00"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave}>{editingIndex !== null ? "Aktualisieren" : "Hinzufügen"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
