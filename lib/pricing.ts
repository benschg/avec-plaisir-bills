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
// Expense distribution
// ---------------------------------------------------------------------------

export interface ExpenseDistribution {
  /** Total value of all expense line items. */
  totalExpenses: number;
  /** Total value (line_total sum) of all product (non-expense) items. */
  totalProductValue: number;
  /** Adjusted unit price per item index: unit_price + distributed expense per unit.
   *  For expense items the value equals the original unit_price (unused). */
  adjustedUnitPriceByIndex: number[];
}

/**
 * Distribute total expenses proportionally across product items based on
 * each product's `line_total` relative to the total product value.
 *
 * Formula per product item:
 *   expense_share   = (item.line_total / total_product_value) × total_expenses
 *   expense_per_unit = expense_share / item.quantity
 *   adjusted_price   = item.unit_price + expense_per_unit
 *
 * Edge cases:
 * - No expenses → adjusted prices equal unit prices (transparent no-op).
 * - All items are expenses → no products to distribute to; shares stay 0.
 * - All product line_totals are 0 → expenses split equally across products.
 * - An item has quantity 0 → expense_per_unit is 0 for that item.
 */
export function calcExpenseDistribution(
  items: LineItem[],
  expenseFlags: boolean[],
  extraExpenses: number = 0
): ExpenseDistribution {
  let totalExpenses = extraExpenses;
  let totalProductValue = 0;
  const productIndices: number[] = [];

  for (let i = 0; i < items.length; i++) {
    if (expenseFlags[i]) {
      totalExpenses += items[i].line_total;
    } else {
      totalProductValue += items[i].line_total;
      productIndices.push(i);
    }
  }

  const adjustedUnitPriceByIndex = items.map((item) => item.unit_price);

  if (totalExpenses > 0 && productIndices.length > 0) {
    if (totalProductValue > 0) {
      for (const idx of productIndices) {
        const item = items[idx];
        const share = (item.line_total / totalProductValue) * totalExpenses;
        const perUnit = item.quantity > 0 ? share / item.quantity : 0;
        adjustedUnitPriceByIndex[idx] = item.unit_price + perUnit;
      }
    } else {
      const equalShare = totalExpenses / productIndices.length;
      for (const idx of productIndices) {
        const item = items[idx];
        const perUnit = item.quantity > 0 ? equalShare / item.quantity : 0;
        adjustedUnitPriceByIndex[idx] = item.unit_price + perUnit;
      }
    }
  }

  return { totalExpenses, totalProductValue, adjustedUnitPriceByIndex };
}

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
 * @param item              The original line item from the invoice (purchase side).
 * @param margin            Effective margin % for this item.
 * @param mwstRate          Effective MWST rate % for this item.
 * @param adjustedUnitPrice Optional cost base after expense distribution.
 *                          If provided, sell price is based on this instead of item.unit_price.
 *                          Profit is still computed against the original item.line_total.
 */
export function calcLineItem(
  item: LineItem,
  margin: number,
  mwstRate: number,
  adjustedUnitPrice?: number
): LineItemCalc {
  const costPrice = adjustedUnitPrice ?? item.unit_price;
  const sellPrice = calcSellPrice(costPrice, margin);
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
 * When expenseFlags is provided, expense items are excluded from the totals
 * (their cost is already absorbed into the adjusted prices of product items).
 *
 * @param lineCalcs    Array of per-line calculation results.
 * @param expenseFlags Optional boolean array; true = expense (excluded from totals).
 */
export function calcInvoiceTotals(
  lineCalcs: LineItemCalc[],
  expenseFlags?: boolean[]
): InvoiceTotals {
  return lineCalcs.reduce(
    (acc, c, i) => {
      if (expenseFlags?.[i]) return acc;
      return {
        sellExcl: acc.sellExcl + c.sellTotal,
        mwst: acc.mwst + c.mwstAmount,
        sellIncl: acc.sellIncl + c.sellTotalInclMwst,
        profit: acc.profit + c.profit,
      };
    },
    { sellExcl: 0, mwst: 0, sellIncl: 0, profit: 0 }
  );
}

// ---------------------------------------------------------------------------
// Back-calculate margin from a user-set final price
// ---------------------------------------------------------------------------

/**
 * Derive the effective margin % from a final selling price that includes MWST.
 *
 * Formula (inverse of calcSellPrice + MWST):
 *   sellPriceExcl = finalPriceInclMwst / (1 + mwstRate / 100)
 *   margin        = ((sellPriceExcl / adjustedUnitPrice) − 1) × 100
 *
 * @param finalPriceInclMwst  The user-set unit selling price including MWST.
 * @param adjustedUnitPrice   Cost base per unit (after expense distribution).
 * @param mwstRate            MWST rate % applied to this item.
 * @returns                   The effective margin percentage.
 */
export function calcMarginFromFinalPrice(
  finalPriceInclMwst: number,
  adjustedUnitPrice: number,
  mwstRate: number
): number {
  if (adjustedUnitPrice === 0) return 0;
  const sellPriceExcl = finalPriceInclMwst / (1 + mwstRate / 100);
  return ((sellPriceExcl / adjustedUnitPrice) - 1) * 100;
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
