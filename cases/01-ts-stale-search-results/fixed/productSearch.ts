export type Product = { id: string; name: string };
export type SearchApi = (query: string, signal?: AbortSignal) => Promise<Product[]>;
export type Render = (results: Product[]) => void;

// Wired to the admin product search box; called on every keystroke.
export function createProductSearch(api: SearchApi, render: Render) {
  let latest = 0;
  let inFlight: AbortController | undefined;

  return async function onInput(query: string): Promise<void> {
    const call = ++latest;
    inFlight?.abort();
    inFlight = undefined;

    const trimmed = query.trim();
    if (trimmed === "") {
      render([]);
      return;
    }

    const controller = new AbortController();
    inFlight = controller;
    try {
      const results = await api(trimmed, controller.signal);
      // A newer keystroke owns the list now. Abort alone is not enough:
      // the response may already be on its way back.
      if (call !== latest) return;
      render(results);
    } catch (err) {
      if (call !== latest) return;
      console.error("product search failed", err);
      render([]);
    }
  };
}
