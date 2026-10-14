# Bugfix casebook

Small bugs of the kind clients send: a date that is one day off, a search box that shows the wrong results, invoice numbers that do not line up. Each case has the original code, the fixed code, and one test suite that fails on the original and passes on the fix.

These are reconstructed examples, not client code. Each one is a common bug rebuilt as a small standalone program, so the whole cause and fix can be shown.

| Case | Language | What the client reported |
| --- | --- | --- |
| [01-ts-stale-search-results](cases/01-ts-stale-search-results) | TypeScript | Typing fast in the product search shows results for an earlier part of the word. |
| [02-ts-delivery-date-off-by-one](cases/02-ts-delivery-date-off-by-one) | TypeScript | US customers see their delivery date one day early. |
| [03-go-alerts-sent-to-wrong-team](cases/03-go-alerts-sent-to-wrong-team) | Go | After a third on-call channel was added, billing alerts land in the shipping channel. |
| [04-go-checkout-goroutine-leak](cases/04-go-checkout-goroutine-leak) | Go | Checkout service memory and goroutine count grow with every order. |
| [05-csharp-invoice-numbers-skip](cases/05-csharp-invoice-numbers-skip) | C# | Emailed invoice numbers do not match the books, and every month leaves a gap. |
| [06-csharp-import-reports-done-early](cases/06-csharp-import-reports-done-early) | C# | The CSV import reports success at once, but rows are missing and errors vanish. |

Each case folder has `buggy/`, `fixed/`, the test suite, and a README with the report, the cause, the fix, and the key diff. The suite runs against the fixed code by default. TypeScript switches with `VARIANT=buggy`, Go with `-tags buggy`, and C# with `-p:Variant=buggy`.

## Running the checks

You need Bun, Go 1.27 or newer, and the .NET 10 SDK.

```sh
./scripts/check.sh
```

It runs every suite against the fixed code, then against the buggy code, and prints one line per case. It exits non-zero if a fixed version fails a test, or if a buggy version passes or does not build. CI runs the same script on every push.

```
ok    01-ts-stale-search-results           TypeScript  fixed:  4/4  pass   buggy:  3/4  fail
ok    02-ts-delivery-date-off-by-one       TypeScript  fixed:  8/8  pass   buggy:  6/8  fail
ok    03-go-alerts-sent-to-wrong-team      Go          fixed:  2/2  pass   buggy:  2/2  fail
ok    04-go-checkout-goroutine-leak        Go          fixed:  2/2  pass   buggy:  2/2  fail
ok    05-csharp-invoice-numbers-skip       C#          fixed:  3/3  pass   buggy:  2/3  fail
ok    06-csharp-import-reports-done-early  C#          fixed:  2/2  pass   buggy:  2/2  fail
```

MIT licensed.
