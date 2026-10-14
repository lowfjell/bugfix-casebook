# Invoice numbers in the email do not match the books

> The invoice numbers our customers get by email are not the ones in our accounting system. October's invoices are INV-00001 to 00003 in the books, but customers got 00004 to 00006. November then started at 00010. Our accountant needs the numbers without gaps.

## Cause

`invoices` is a LINQ query, not a list. Its `Select` runs again every time something loops over it, and each run calls `numbers.Next()`. `Run` loops over it three times: the `foreach` that books the invoices, the mailer, and `Count()`. That is three sets of numbers, and two of them are thrown away.

## Fix

End the query with `.ToList()`, so it runs once, and the same invoice objects are booked, emailed, and counted. As a rule, a query whose `Select` has side effects, such as numbering, IDs, timestamps, or database calls, should be turned into a list right away. The CA1851 analyzer flags this pattern, but it is off by default.

```diff
         var invoices = orders
             .Where(o => o.Amount > 0)
-            .Select(o => new Invoice(numbers.Next(), o.Customer, o.Amount));
+            .Select(o => new Invoice(numbers.Next(), o.Customer, o.Amount))
+            .ToList();
 ...
         mailer.Send(invoices);
-        return invoices.Count();
+        return invoices.Count;
```

## Test

The suite runs two months of orders and compares the numbers that were booked, the numbers that were emailed, and where the next month starts. On the original code, 2 of the 3 tests fail. The count test passes on both, because the count was never wrong.

```sh
dotnet test cases/05-csharp-invoice-numbers-skip                    # fixed
dotnet test cases/05-csharp-invoice-numbers-skip -p:Variant=buggy   # original
```
