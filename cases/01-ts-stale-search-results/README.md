# Search shows results for what I typed a moment ago

> When I type quickly in the product search in our admin panel, the list sometimes shows results for the start of the word. I type "chai" and get every product that starts with "c". If I type one more letter it sorts itself out. It happens a lot on the shop wifi and almost never at home.

## Cause

Every keystroke sends a search request and renders whatever comes back. Nothing checks whether a response still belongs to what is in the box. Short queries like "c" match more products and take longer, so on a slow connection they often answer last and overwrite the right list. On a fast connection the answers arrive in order and the bug hides.

## Fix

Number each call and render a response only if it belongs to the latest one. The previous request is also aborted, which saves the server some work, but the number check is what makes it correct: a response can already be on its way back when the abort happens. Clearing the box counts as a call, so a late response cannot refill an empty list.

```diff
 export function createProductSearch(api: SearchApi, render: Render) {
+  let latest = 0;
+  let inFlight: AbortController | undefined;
+
   return async function onInput(query: string): Promise<void> {
+    const call = ++latest;
+    inFlight?.abort();
+    inFlight = undefined;
 ...
-      const results = await api(trimmed);
+      const results = await api(trimmed, controller.signal);
+      // A newer keystroke owns the list now. Abort alone is not enough:
+      // the response may already be on its way back.
+      if (call !== latest) return;
       render(results);
```

## Test

`productSearch.test.ts` uses a fake API where the test decides the order the responses arrive in. On the original code, 3 of the 4 tests fail. The fourth, responses arriving in order, passes on both versions.

```sh
bun test ./cases/01-ts-stale-search-results                 # fixed
VARIANT=buggy bun test ./cases/01-ts-stale-search-results   # original
```
