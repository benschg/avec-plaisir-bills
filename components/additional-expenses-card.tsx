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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AdditionalExpense {
  id?: string;
  description: string;
  amount: number;
  currency: string;
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
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(invoiceCurrency);
  const showCurrencySelect = invoiceCurrency !== "CHF";

  const openAdd = () => {
    setEditingIndex(null);
    setDescription("");
    setAmount("");
    setCurrency(invoiceCurrency);
    setOpen(true);
  };

  const openEdit = (index: number) => {
    const exp = expenses[index];
    setEditingIndex(index);
    setDescription(exp.description);
    setAmount(String(exp.amount));
    setCurrency(exp.currency);
    setOpen(true);
  };

  const handleSave = () => {
    const numericAmount = parseFloat(amount);
    if (!description || isNaN(numericAmount) || numericAmount <= 0) return;
    const expense: AdditionalExpense = { description, amount: numericAmount, currency };
    if (editingIndex !== null) {
      onUpdateExpense(editingIndex, expense);
    } else {
      onAddExpense(expense);
    }
    setOpen(false);
  };

  // Totals by currency across all expenses
  const lineTotal = lineExpenses.reduce((s, e) => s + e.amount, 0);
  const addlByInvoiceCurrency = expenses
    .filter((e) => e.currency === invoiceCurrency)
    .reduce((s, e) => s + e.amount, 0);
  const addlByCHF = expenses
    .filter((e) => e.currency === "CHF" && e.currency !== invoiceCurrency)
    .reduce((s, e) => s + e.amount, 0);

  const grandInvoiceCurrency = lineTotal + addlByInvoiceCurrency;
  const hasGrandCHF = addlByCHF > 0;

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
                  {fmt(exp.amount, exp.currency)}
                </span>
              </div>
            ))}

            {/* Grand Total */}
            {hasAny && (
              <div className="border-t mt-2 pt-2 space-y-0.5">
                {grandInvoiceCurrency > 0 && (
                  <div className="flex justify-between items-center gap-4">
                    <span className="font-semibold">Gesamt</span>
                    <span className="font-bold tabular-nums whitespace-nowrap">
                      {fmt(grandInvoiceCurrency, invoiceCurrency)}
                    </span>
                  </div>
                )}
                {hasGrandCHF && (
                  <div className="flex justify-between items-center gap-4 pl-12">
                    <span className="text-muted-foreground text-xs">+ separat</span>
                    <span className="font-bold tabular-nums whitespace-nowrap text-red-700 dark:text-red-400">
                      {fmt(addlByCHF, "CHF")}
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
              <Label htmlFor="dlg-amount">Betrag</Label>
              <div className="flex gap-2">
                <Input
                  id="dlg-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="12.34"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                {showCurrencySelect ? (
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={invoiceCurrency}>{invoiceCurrency}</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="flex items-center text-sm text-muted-foreground px-2">CHF</span>
                )}
              </div>
            </div>
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
