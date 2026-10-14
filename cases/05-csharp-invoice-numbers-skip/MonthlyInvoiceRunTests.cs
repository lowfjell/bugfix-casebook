using Casebook.Invoicing;

public class MonthlyInvoiceRunTests
{
    private sealed class Ledger : IInvoiceStore
    {
        public List<Invoice> Booked { get; } = [];
        public void Save(Invoice invoice) => Booked.Add(invoice);
    }

    private sealed class Outbox : IInvoiceMailer
    {
        public List<Invoice> Emailed { get; } = [];
        public void Send(IEnumerable<Invoice> invoices) => Emailed.AddRange(invoices);
    }

    private static readonly Order[] October =
    [
        new("C-1001", 1200m),
        new("C-1002", 0m), // nothing billable this month
        new("C-1003", 349.50m),
        new("C-1004", 89m),
    ];

    private readonly Ledger _ledger = new();
    private readonly Outbox _outbox = new();
    private readonly InvoiceNumbers _numbers = new(first: 1);

    private MonthlyInvoiceRun NewRun() => new(_numbers, _ledger, _outbox);

    [Fact]
    public void Returns_the_number_of_invoices_created()
    {
        Assert.Equal(3, NewRun().Run(October));
    }

    [Fact]
    public void Emailed_invoices_carry_the_same_numbers_as_the_books()
    {
        NewRun().Run(October);

        Assert.Equal(
            _ledger.Booked.Select(i => (i.Number, i.Customer)),
            _outbox.Emailed.Select(i => (i.Number, i.Customer)));
    }

    [Fact]
    public void Invoice_numbers_have_no_gaps_from_one_month_to_the_next()
    {
        NewRun().Run(October);
        NewRun().Run([new("C-1001", 1200m), new("C-1005", 75m)]);

        Assert.Equal(
            ["INV-00001", "INV-00002", "INV-00003", "INV-00004", "INV-00005"],
            _ledger.Booked.Select(i => i.Number));
    }
}
