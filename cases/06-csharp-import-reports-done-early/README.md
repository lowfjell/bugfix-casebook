# CSV import says it is done, but rows are missing

> When we import our customer CSV, the page says "120 imported, 0 errors" right away, but some customers are not there. If we refresh a minute later, more of them have appeared. Rows with no company name used to show an error. Now they just disappear.

## Cause

Someone tidied a `foreach` loop into `rows.ToList().ForEach(async row => ...)`. `List<T>.ForEach` takes an `Action<T>`, so the async lambda becomes `async void`. `ForEach` starts every upsert, has nothing to wait on, and returns at once. `ImportAsync` then counts the rows before any are saved, and reports no errors because the failures have not happened yet. When they do, they go into a list nobody reads anymore, from several threads at once. If one of those lambdas ever threw past its `catch`, `async void` would crash the process.

## Fix

Go back to a plain `foreach` with `await`, so each row is saved or rejected before the result is built. If the import ever needs to run in parallel, use `Task.WhenAll` or `Parallel.ForEachAsync`, not `ForEach` with an async lambda.

```diff
-        rows.ToList().ForEach(async row =>
+        foreach (var row in rows)
         {
             try
             {
                 await store.UpsertAsync(row);
             }
 ...
-        });
+        }
```

## Test

The fake store takes 20 ms per row and rejects a row with no company name. On the original code, no rows have been saved when `ImportAsync` returns, and the rejected row is counted as imported. Both tests fail.

```sh
dotnet test cases/06-csharp-import-reports-done-early                    # fixed
dotnet test cases/06-csharp-import-reports-done-early -p:Variant=buggy   # original
```
