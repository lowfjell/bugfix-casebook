namespace Casebook.Import;

public sealed record CustomerRow(string AccountNo, string Company);
public sealed record ImportResult(int Imported, IReadOnlyList<string> Errors);

public interface ICustomerStore
{
    Task UpsertAsync(CustomerRow row);
}

public sealed class CustomerImporter(ICustomerStore store)
{
    // Behind the "Import CSV" button. The page shows the result as soon as this returns.
    public async Task<ImportResult> ImportAsync(IReadOnlyList<CustomerRow> rows)
    {
        var errors = new List<string>();

        // A plain foreach, so each upsert is awaited before we count anything.
        // List<T>.ForEach takes an Action, which turns an async lambda into async void.
        foreach (var row in rows)
        {
            try
            {
                await store.UpsertAsync(row);
            }
            catch (Exception ex)
            {
                errors.Add($"{row.AccountNo}: {ex.Message}");
            }
        }

        return new ImportResult(rows.Count - errors.Count, errors);
    }
}
