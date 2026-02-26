import type { LineItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Swiss MWST (Mehrwertsteuer / VAT) rates — valid since 1 January 2024
// ---------------------------------------------------------------------------

export const MWST_RATES = [
  { value: "8.1", label: "8.1%", description: "Normal rate" },
  { value: "2.6", label: "2.6%", description: "Reduced rate (food, medicine, books, etc.)" },
  { value: "3.8", label: "3.8%", description: "Special rate (accommodation)" },
] as const;

/** Default MWST rate applied when no override is set. */
export const DEFAULT_MWST = "8.1";

// ---------------------------------------------------------------------------
// Per-line-item pricing calculations
// ---------------------------------------------------------------------------

export interface LineItemCalc {
  /** Effective margin percentage applied to this item. */
  margin: number;
  /** Effective MWST rate (%) applied to this item. */
  mwstRate: number;
  /** Selling price per unit, excluding MWST.
   *  Formula: unit_price × (1 + margin / 100) */
  sellPrice: number;
  /** Selling price per unit, including MWST.
   *  Formula: sellPrice × (1 + mwstRate / 100) */
  sellPriceInclMwst: number;
  /** Total selling amount (qty × sellPrice), excluding MWST. */
  sellTotal: number;
  /** Total selling amount (qty × sellPriceInclMwst), including MWST. */
  sellTotalInclMwst: number;
  /** MWST amount for this line: sellTotalInclMwst − sellTotal. */
  mwstAmount: number;
  /** Profit for this line: sellTotal − purchase line_total.
   *  This is the margin earned before MWST (MWST is a pass-through tax). */
  profit: number;
}

/**
 * Calculate the selling price per unit by applying a markup margin.
 *
 * @param unitPrice  The purchase (cost) price per unit.
 * @param margin     The markup percentage (e.g. 30 means +30%).
 * @returns          unitPrice × (1 + margin / 100)
 */
export function calcSellPrice(unitPrice: number, margin: number): number {
  return unitPrice * (1 + margin / 100);
}

/**
 * Compute all derived pricing values for a single line item.
 *
 * @param item      The original line item from the invoice (purchase side).
 * @param margin    Effective margin % for this item.
 * @param mwstRate  Effective MWST rate % for this item.
 */
export function calcLineItem(
  item: LineItem,
  margin: number,
  mwstRate: number
): LineItemCalc {
  const sellPrice = calcSellPrice(item.unit_price, margin);
  const sellPriceInclMwst = sellPrice * (1 + mwstRate / 100);
  const sellTotal = item.quantity * sellPrice;
  const sellTotalInclMwst = item.quantity * sellPriceInclMwst;
  const mwstAmount = sellTotalInclMwst - sellTotal;
  const profit = sellTotal - item.line_total;

  return {
    margin,
    mwstRate,
    sellPrice,
    sellPriceInclMwst,
    sellTotal,
    sellTotalInclMwst,
    mwstAmount,
    profit,
  };
}

// ---------------------------------------------------------------------------
// Invoice-level totals
// ---------------------------------------------------------------------------

export interface InvoiceTotals {
  /** Sum of all line sellTotal values (excluding MWST). */
  sellExcl: number;
  /** Sum of all line MWST amounts. */
  mwst: number;
  /** Sum of all line sellTotalInclMwst values. */
  sellIncl: number;
  /** Sum of all line profits. */
  profit: number;
}

/**
 * Aggregate totals across all line items.
 *
 * @param lineCalcs  Array of per-line calculation results.
 */
export function calcInvoiceTotals(lineCalcs: LineItemCalc[]): InvoiceTotals {
  return lineCalcs.reduce(
    (acc, c) => ({
      sellExcl: acc.sellExcl + c.sellTotal,
      mwst: acc.mwst + c.mwstAmount,
      sellIncl: acc.sellIncl + c.sellTotalInclMwst,
      profit: acc.profit + c.profit,
    }),
    { sellExcl: 0, mwst: 0, sellIncl: 0, profit: 0 }
  );
}

// ---------------------------------------------------------------------------
// Helpers for resolving per-item overrides
// ---------------------------------------------------------------------------

/**
 * Resolve the effective margin for a line item.
 * Returns the per-item override if set, otherwise the global default.
 */
export function resolveMargin(
  index: number,
  itemMargins: Record<number, number | null>,
  globalMargin: number
): number {
  const override = itemMargins[index];
  return override != null ? override : globalMargin;
}

/**
 * Resolve the effective MWST rate for a line item.
 * Returns the per-item override if set, otherwise the global default.
 */
export function resolveMwst(
  index: number,
  itemMwst: Record<number, string | null>,
  globalMwst: string
): number {
  const override = itemMwst[index];
  return parseFloat(override != null ? override : globalMwst);
}
