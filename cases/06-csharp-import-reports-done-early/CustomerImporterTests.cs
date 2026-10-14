using Casebook.Import;

public class CustomerImporterTests
{
    // Behaves like the real database client: every call takes a little while,
    // and a row with no company name is rejected.
    private sealed class SlowStore : ICustomerStore
    {
        private readonly List<string> _saved = [];

        public IReadOnlyList<string> Saved
        {
            get { lock (_saved) return _saved.ToList(); }
        }

        public async Task UpsertAsync(CustomerRow row)
        {
            await Task.Delay(20);
            if (string.IsNullOrWhiteSpace(row.Company))
                throw new ArgumentException("company name is required");
            lock (_saved) _saved.Add(row.AccountNo);
        }
    }

    private static readonly CustomerRow[] Csv =
    [
        new("C-2001", "Harbour Bakery"),
        new("C-2002", ""),
        new("C-2003", "North Pier Cafe"),
    ];

    [Fact]
    public async Task Every_valid_row_is_saved_before_the_result_is_shown()
    {
        var store = new SlowStore();
        await new CustomerImporter(store).ImportAsync(Csv);

        Assert.Equal(["C-2001", "C-2003"], store.Saved);
    }

    [Fact]
    public async Task A_rejected_row_is_reported_instead_of_counted_as_imported()
    {
        var result = await new CustomerImporter(new SlowStore()).ImportAsync(Csv);

        Assert.Equal(2, result.Imported);
        var error = Assert.Single(result.Errors);
        Assert.Equal("C-2002: company name is required", error);
    }
}
