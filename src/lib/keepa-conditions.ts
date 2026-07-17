export const CONDITION_PRICE_INDEX: Record<string, number> = {
  "Used - Like New": 19,
  "Used - Very Good": 20,
  "Used - Good": 21,
  "Used - Acceptable": 22,
};

export const PRICE_TYPE_CONDITION: Record<number, string> = {
  19: "Used - Like New",
  20: "Used - Very Good",
  21: "Used - Good",
  22: "Used - Acceptable",
};

export const WAREHOUSE_CONDITION: Record<number, string> = {
  2: "Used - Like New",
  3: "Used - Very Good",
  4: "Used - Good",
  5: "Used - Acceptable",
};

export function conditionFromWarehouseCode(code: number | null | undefined): string {
  return code == null ? "Used - Very Good" : (WAREHOUSE_CONDITION[code] ?? "Used - Very Good");
}

export function conditionForDeal(priceType: number, warehouseCondition?: number | null): string {
  return PRICE_TYPE_CONDITION[priceType] ?? conditionFromWarehouseCode(warehouseCondition);
}

export function priceIndexForCondition(condition: string): number {
  return CONDITION_PRICE_INDEX[condition] ?? 9;
}
