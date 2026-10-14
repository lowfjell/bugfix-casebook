import { expect, test } from "bun:test";
import type * as Subject from "./fixed/productSearch.ts";

// VARIANT=buggy runs this suite against the original code.
const variant = process.env.VARIANT === "buggy" ? "buggy" : "fixed";
const { createProductSearch } = (await import(`./${variant}/productSearch.ts`)) as typeof Subject;

const catalog = ["Chair", "Chaise lounge", "Cherry side table", "Coat hook", "Cushion"];

// A search API where the test decides when each request answers.
function slowApi() {
  const calls = new Map<string, { answer: () => void; signal?: AbortSignal }>();
  const api: Subject.SearchApi = (query, signal) =>
    new Promise((resolve) => {
      const hits = catalog.filter((name) => name.toLowerCase().startsWith(query.toLowerCase()));
      calls.set(query, { answer: () => resolve(hits.map((name) => ({ id: name, name }))), signal });
    });
  return { api, calls };
}

function setup() {
  const { api, calls } = slowApi();
  const screens: string[][] = [];
  const onInput = createProductSearch(api, (results) => screens.push(results.map((p) => p.name)));
  const shown = () => screens.at(-1);
  return { onInput, calls, shown };
}

test("responses that arrive in order render normally", async () => {
  const { onInput, calls, shown } = setup();
  const typing = onInput("cu");
  calls.get("cu")!.answer();
  await typing;
  expect(shown()).toEqual(["Cushion"]);
});

test("a slow response for an earlier keystroke does not replace newer results", async () => {
  const { onInput, calls, shown } = setup();
  const typing = ["c", "ch", "chai"].map((q) => onInput(q));

  // The server answers the short, expensive queries last.
  calls.get("chai")!.answer();
  calls.get("ch")!.answer();
  calls.get("c")!.answer();
  await Promise.all(typing);

  expect(shown()).toEqual(["Chair", "Chaise lounge"]);
});

test("clearing the box is not undone by a response that was still in flight", async () => {
  const { onInput, calls, shown } = setup();
  const typing = onInput("co");
  await onInput("");
  calls.get("co")!.answer();
  await typing;

  expect(shown()).toEqual([]);
});

test("a new keystroke aborts the request it replaces", async () => {
  const { onInput, calls } = setup();
  void onInput("ch");
  void onInput("che");

  expect(calls.get("ch")!.signal?.aborted).toBe(true);
  expect(calls.get("che")!.signal?.aborted).toBe(false);
});
