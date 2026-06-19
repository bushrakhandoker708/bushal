// lib/search/trie.ts

/**
 * ============================================================================
 * TRIE (PREFIX TREE) - SEARCH AUTOCOMPLETE ENGINE
 * ============================================================================
 *
 * This module implements a Trie (prefix tree) data structure optimized for
 * search autocomplete functionality. A Trie is a tree-like data structure
 * where each node represents a character, and paths from root to nodes
 * represent prefixes of stored words.
 *
 * WHY TRIE FOR SEARCH?
 * - O(m) time complexity for prefix searches (where m = prefix length)
 * - Efficient memory usage for shared prefixes (e.g., "sh" -> "shirt", "shoes")
 * - Natural support for autocomplete suggestions
 * - Can be extended with popularity weights for ranking
 *
 * FEATURES:
 * - Insert words with optional popularity scores
 * - Prefix-based autocomplete suggestions
 * - Case-insensitive search
 * - Weighted results (more popular items rank higher)
 * - Maximum suggestion limit
 * - Support for multi-word phrases
 *
 * BUG FIX (word-level tokenization):
 * Previously, "Blue Cotton Shirt" was only reachable by the prefix "bl".
 * Typing "cotton" or "shirt" returned nothing because those are not prefixes
 * of the full concatenated string — they are interior words.
 *
 * Fix: ProductSearchTrie.addProduct() now tokenizes the product name into
 * individual words ("blue", "cotton", "shirt") and inserts each word
 * separately into the nameTrie, all pointing back to the same product data.
 * This makes every word in a product name individually searchable via prefix.
 * The deduplication step in ProductSearchTrie.search() ensures a product
 * only appears once even if multiple of its words match the query.
 *
 * USAGE:
 * const trie = new SearchTrie();
 * trie.insert('shirt', { id: '123', popularity: 100 });
 * trie.insert('shampoo', { id: '124', popularity: 80 });
 * const suggestions = trie.autocomplete('sh'); // ['shirt', 'shampoo']
 * ============================================================================
 */

// ─── Types & Interfaces ─────────────────────────────────────────────────────

export interface TrieNodeData {
  id: string
  name: string
  category?: string
  popularity: number
  image_url?: string | null
  in_stock: boolean
}

export interface TrieNode {
  children: Map<string, TrieNode>
  isEndOfWord: boolean
  data: TrieNodeData | null
}

export interface AutocompleteResult {
  text: string
  data: TrieNodeData
  score: number
}

export interface TrieConfig {
  maxSuggestions: number
  minPrefixLength: number
  caseSensitive: boolean
}

// ─── TrieNode Factory ───────────────────────────────────────────────────────

function createTrieNode(): TrieNode {
  return {
    children: new Map(),
    isEndOfWord: false,
    data: null,
  }
}

// ─── SearchTrie Class ───────────────────────────────────────────────────────

export class SearchTrie {
  private root: TrieNode
  private config: TrieConfig
  private size: number

  constructor(config: Partial<TrieConfig> = {}) {
    this.root = createTrieNode()
    this.config = {
      maxSuggestions: config.maxSuggestions ?? 10,
      minPrefixLength: config.minPrefixLength ?? 2,
      caseSensitive: config.caseSensitive ?? false,
    }
    this.size = 0
  }

  /**
   * Insert a word into the Trie with associated data.
   *
   * Time Complexity: O(m) where m = length of word
   * Space Complexity: O(m) in worst case (no shared prefixes)
   *
   * @param word - The word to insert
   * @param data - Associated metadata (id, name, popularity, etc.)
   */
  insert(word: string, data: TrieNodeData): void {
    if (!word || word.length < this.config.minPrefixLength) return

    const normalizedWord = this.config.caseSensitive ? word : word.toLowerCase()
    let current = this.root

    for (const char of normalizedWord) {
      if (!current.children.has(char)) {
        current.children.set(char, createTrieNode())
      }
      current = current.children.get(char)!
    }

    // Only update data if:
    // 1. The node is not yet an end-of-word, OR
    // 2. The incoming data has higher popularity (so best item wins on conflict)
    if (!current.isEndOfWord || (current.data && data.popularity > current.data.popularity)) {
      current.isEndOfWord = true
      current.data = data
    } else if (!current.isEndOfWord) {
      current.isEndOfWord = true
      current.data = data
    }

    this.size++
  }

  /**
   * Insert multiple words at once (batch insertion).
   *
   * @param words - Array of [word, data] tuples
   */
  insertBatch(words: Array<[string, TrieNodeData]>): void {
    for (const [word, data] of words) {
      this.insert(word, data)
    }
  }

  /**
   * Check if a word exists in the Trie.
   *
   * Time Complexity: O(m) where m = length of word
   *
   * @param word - The word to search for
   * @returns true if word exists, false otherwise
   */
  has(word: string): boolean {
    const normalizedWord = this.config.caseSensitive ? word : word.toLowerCase()
    let current = this.root

    for (const char of normalizedWord) {
      if (!current.children.has(char)) return false
      current = current.children.get(char)!
    }

    return current.isEndOfWord
  }

  /**
   * Check if any word in the Trie starts with the given prefix.
   *
   * Time Complexity: O(m) where m = length of prefix
   *
   * @param prefix - The prefix to check
   * @returns true if prefix exists, false otherwise
   */
  startsWith(prefix: string): boolean {
    const normalizedPrefix = this.config.caseSensitive ? prefix : prefix.toLowerCase()
    let current = this.root

    for (const char of normalizedPrefix) {
      if (!current.children.has(char)) return false
      current = current.children.get(char)!
    }

    return true
  }

  /**
   * Get autocomplete suggestions for a given prefix.
   *
   * This is the core method for search autocomplete. It traverses the Trie
   * to the node representing the prefix, then collects all words below it,
   * sorted by popularity score.
   *
   * Time Complexity: O(m + k) where m = prefix length, k = number of suggestions
   * Space Complexity: O(k) for storing results
   *
   * @param prefix - The prefix to autocomplete
   * @param limit - Maximum number of suggestions (overrides config)
   * @returns Array of autocomplete results sorted by popularity
   */
  autocomplete(prefix: string, limit?: number): AutocompleteResult[] {
    if (prefix.length < this.config.minPrefixLength) return []

    const normalizedPrefix = this.config.caseSensitive ? prefix : prefix.toLowerCase()
    let current = this.root

    // Traverse to the node representing the prefix
    for (const char of normalizedPrefix) {
      if (!current.children.has(char)) return []
      current = current.children.get(char)!
    }

    // Collect all words below this node
    const results: AutocompleteResult[] = []
    this.collectSuggestions(current, normalizedPrefix, results)

    // Sort by popularity (descending) and limit results
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit ?? this.config.maxSuggestions)
  }

  /**
   * Helper method to recursively collect all words from a node.
   *
   * @param node - Current TrieNode
   * @param currentPrefix - Prefix built so far
   * @param results - Array to collect results
   */
  private collectSuggestions(
    node: TrieNode,
    currentPrefix: string,
    results: AutocompleteResult[]
  ): void {
    if (node.isEndOfWord && node.data) {
      results.push({
        text: currentPrefix,
        data: node.data,
        score: node.data.popularity,
      })
    }

    for (const [char, childNode] of node.children) {
      this.collectSuggestions(childNode, currentPrefix + char, results)
    }
  }

  /**
   * Delete a word from the Trie.
   *
   * Time Complexity: O(m) where m = length of word
   *
   * @param word - The word to delete
   * @returns true if word was deleted, false if not found
   */
  delete(word: string): boolean {
    const normalizedWord = this.config.caseSensitive ? word : word.toLowerCase()

    const deleteHelper = (node: TrieNode, index: number): boolean => {
      if (index === normalizedWord.length) {
        if (!node.isEndOfWord) return false
        node.isEndOfWord = false
        node.data = null
        this.size--
        return true
      }

      const char = normalizedWord[index]
      const childNode = node.children.get(char)
      if (!childNode) return false

      const shouldDeleteChild = deleteHelper(childNode, index + 1)

      // Remove child node if it's not end of word and has no children
      if (shouldDeleteChild && !childNode.isEndOfWord && childNode.children.size === 0) {
        node.children.delete(char)
        return true
      }

      return false
    }

    return deleteHelper(this.root, 0)
  }

  /**
   * Get the number of words in the Trie.
   */
  getSize(): number {
    return this.size
  }

  /**
   * Clear all words from the Trie.
   */
  clear(): void {
    this.root = createTrieNode()
    this.size = 0
  }

  /**
   * Get all words in the Trie (for debugging/testing).
   */
  getAllWords(): string[] {
    const words: string[] = []
    const collectAll = (node: TrieNode, prefix: string) => {
      if (node.isEndOfWord) words.push(prefix)
      for (const [char, childNode] of node.children) {
        collectAll(childNode, prefix + char)
      }
    }
    collectAll(this.root, '')
    return words
  }
}

// ─── Product Search Trie (Specialized for E-commerce) ───────────────────────

/**
 * Specialized Trie for product search with additional features:
 * - Category-based filtering
 * - Stock-aware suggestions (can exclude out-of-stock items)
 * - Multi-field search (searches name and category)
 * - FIXED: Word-level tokenization so "cotton" finds "Blue Cotton Shirt"
 *
 * BUG FIX EXPLANATION:
 * The original implementation only inserted the full product name as a single
 * string. This meant the name "Blue Cotton Shirt" was only reachable via the
 * prefix chain b→l→u→e→(space)→c→o→t→t→o→n... — i.e., only by typing "bl".
 *
 * The fix tokenizes each product name into words on insert:
 *   "Blue Cotton Shirt" → ["blue", "cotton", "shirt"]
 * Each word is inserted separately, all pointing to the same product data.
 * This is the standard production approach used by search engines.
 *
 * Deduplication: The search() method uses a Map keyed by product.id so a
 * product matching both "blue" and "bl" (if query is "bl") only appears once.
 */
export class ProductSearchTrie {
  private nameTrie: SearchTrie
  private categoryTrie: SearchTrie
  // Map from product ID to the original product data for deduplication
  private products: Map<string, TrieNodeData>

  constructor(config: Partial<TrieConfig> = {}) {
    this.nameTrie = new SearchTrie(config)
    this.categoryTrie = new SearchTrie(config)
    this.products = new Map()
  }

  /**
   * Add a product to the search index.
   *
   * BUG FIX: now also tokenizes product name into individual words so
   * mid-name words are reachable as prefixes. E.g., "Blue Cotton Shirt"
   * is findable by "blue", "cot", "shirt", "sh", etc.
   *
   * @param product - Product data to index
   */
  addProduct(product: TrieNodeData): void {
    // Store the full product record for deduplication during search
    this.products.set(product.id, product)

    // 1. Insert the full product name (existing behavior — covers full-phrase prefix)
    this.nameTrie.insert(product.name, product)

    // 2. BUG FIX: Tokenize name into individual words and index each one.
    //    This ensures "cotton" finds "Blue Cotton Shirt".
    //    We skip single-character tokens — they are noise.
    const words = product.name
      .toLowerCase()
      .split(/[\s\-_\/\\,\.]+/)  // Split on space, hyphen, underscore, slash, comma, period
      .filter((w) => w.length >= 2)

    for (const word of words) {
      // Don't re-insert if this word is just the full name lowercased (already inserted above)
      if (word !== product.name.toLowerCase()) {
        this.nameTrie.insert(word, product)
      }
    }

    // 3. Index category if available (existing behavior)
    if (product.category) {
      this.categoryTrie.insert(product.category, {
        ...product,
        name: product.category,
      })
    }
  }

  /**
   * Add multiple products at once.
   *
   * @param products - Array of products to index
   */
  addProducts(products: TrieNodeData[]): void {
    for (const product of products) {
      this.addProduct(product)
    }
  }

  /**
   * Search for products by prefix.
   *
   * BUG FIX: Uses a Map keyed by product.id to deduplicate results. Without
   * this, a product whose name has multiple words matching the query (e.g.,
   * "shampoo" matching both the full name insert and the tokenized word insert)
   * would appear multiple times in results.
   *
   * When deduplicating, keeps the entry with the highest score.
   *
   * @param query - Search query/prefix
   * @param options - Search options
   * @returns Array of matching products, deduplicated and sorted by popularity
   */
  search(
    query: string,
    options: {
      limit?: number
      includeCategories?: boolean
      inStockOnly?: boolean
    } = {}
  ): AutocompleteResult[] {
    const {
      limit = 10,
      includeCategories = false,
      inStockOnly = false,
    } = options

    // Get all suggestions from the name trie (may contain duplicates if multiple
    // words in the same product name matched)
    const nameSuggestions = this.nameTrie.autocomplete(query, limit * 3) // Fetch extra to allow dedup

    // Deduplicate by product.id, keeping the highest-scoring entry per product
    const seen = new Map<string, AutocompleteResult>()
    for (const result of nameSuggestions) {
      const pid = result.data.id
      const existing = seen.get(pid)
      if (!existing || result.score > existing.score) {
        // Use the original product name (not the matched word) in the result
        // so the UI shows "Blue Cotton Shirt", not "cotton"
        const originalProduct = this.products.get(pid)
        seen.set(pid, {
          text: originalProduct?.name ?? result.data.name,
          data: originalProduct ?? result.data,
          score: result.score,
        })
      }
    }

    // Convert back to array
    let filteredSuggestions = Array.from(seen.values())

    // Filter by stock if requested
    if (inStockOnly) {
      filteredSuggestions = filteredSuggestions.filter((s) => s.data.in_stock)
    }

    // Sort by score descending
    filteredSuggestions.sort((a, b) => b.score - a.score)

    // Add category suggestions if requested
    if (includeCategories) {
      const categorySuggestions = this.categoryTrie.autocomplete(query, 3)
      return [...filteredSuggestions, ...categorySuggestions].slice(0, limit)
    }

    return filteredSuggestions.slice(0, limit)
  }

  /**
   * Remove a product from the search index.
   *
   * @param productId - ID of product to remove
   */
  removeProduct(productId: string): void {
    const product = this.products.get(productId)
    if (!product) return

    // Delete full-name entry
    this.nameTrie.delete(product.name)

    // Delete each tokenized word entry
    const words = product.name
      .toLowerCase()
      .split(/[\s\-_\/\\,\.]+/)
      .filter((w) => w.length >= 2)

    for (const word of words) {
      if (word !== product.name.toLowerCase()) {
        this.nameTrie.delete(word)
      }
    }

    if (product.category) {
      this.categoryTrie.delete(product.category)
    }

    this.products.delete(productId)
  }

  /**
   * Get the total number of indexed products.
   */
  getProductCount(): number {
    return this.products.size
  }
}

// ─── Factory Functions ──────────────────────────────────────────────────────

/**
 * Create a new SearchTrie instance with default configuration.
 */
export function createSearchTrie(config?: Partial<TrieConfig>): SearchTrie {
  return new SearchTrie(config)
}

/**
 * Create a new ProductSearchTrie instance.
 */
export function createProductSearchTrie(config?: Partial<TrieConfig>): ProductSearchTrie {
  return new ProductSearchTrie(config)
}