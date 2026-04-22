/** 7×5 Stare lattice — must match `StareRevealBoard` / `StareDiamondPlayBox`. */
export const STARE_MESH_ROWS = 7;

/**
 * Vertical “shingle” pull between flex rows (old 44/122dp + translateY) is disabled: with `flex: 1`
 * rows it stacked diamonds while Yoga still reserved full row height, which read as overlap / fake
 * gaps. Re-enable only with a layout model that matches paint bounds (e.g. explicit row heights).
 */
export function stareRowStackPullDp(_row: number, _rowSlotHeightPx: number | null): number {
  return 0;
}
