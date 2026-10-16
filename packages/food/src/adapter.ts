import type { FoodRecord, FoodSource } from './types'

/**
 * Unified interface for food composition data sources.
 *
 * Each national or international food database implements this interface so
 * the search layer can query them uniformly. Adapters for OFF, USDA, and BLS
 * are implemented; Ciqual, NEVO, Fineli, Frida, Swiss FCDB, and CoFID can
 * be added later by implementing this interface.
 *
 * Design notes:
 * - `search` is for live/API sources (OFF, USDA). Pre-imported sources like
 *   BLS are searched through the cache (Postgres trigram/vector) instead.
 * - `getById` fetches a single item by its source-specific ID.
 * - `normalize` converts a raw API response into a `FoodRecord`.
 * - Not every source supports every operation: OFF has barcodes, BLS doesn't.
 *   Optional methods handle these differences.
 */
export interface FoodSourceAdapter {
  /** Which source this adapter handles. */
  readonly source: FoodSource

  /** Human-readable name for attribution. */
  readonly displayName: string

  /** Whether this source supports live search (API call). Pre-imported sources return false. */
  readonly supportsLiveSearch: boolean

  /** Whether this source supports barcode lookup. */
  readonly supportsBarcode: boolean

  /**
   * Search the source for foods matching a query. Only called when
   * `supportsLiveSearch` is true.
   */
  search?(query: string, limit?: number): Promise<FoodRecord[]>

  /**
   * Fetch a single food by its source-specific ID (barcode for OFF,
   * fdcId for USDA, BLS code for BLS).
   */
  getById?(id: string): Promise<FoodRecord | null>

  /**
   * Normalize a raw record from the source's API/file format into a
   * `FoodRecord`. This is the core mapping function.
   */
  normalize?(raw: unknown): FoodRecord | null
}

/**
 * Registry of available food source adapters. The search layer uses this to
 * discover which sources are configured and can be queried.
 */
export type AdapterRegistry = Map<FoodSource, FoodSourceAdapter>
