export type Product = { id: string; name: string };
export type SearchApi = (query: string, signal?: AbortSignal) => Promise<Product[]>;
export type Render = (results: Product[]) => void;

// Wired to the admin product search box; called on every keystroke.
export function createProductSearch(api: SearchApi, render: Render) {
  return async function onInput(query: string): Promise<void> {
    const trimmed = query.trim();
    if (trimmed === "") {
      render([]);
      return;
    }

    try {
      const results = await api(trimmed);
      render(results);
    } catch (err) {
      console.error("product search failed", err);
      render([]);
    }
  };
}
