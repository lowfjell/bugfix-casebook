namespace Casebook.Invoicing;

public sealed record Order(string Customer, decimal Amount);
public sealed record Invoice(string Number, string Customer, decimal Amount);

public interface IInvoiceStore { void Save(Invoice invoice); }
public interface IInvoiceMailer { void Send(IEnumerable<Invoice> invoices); }

// Hands out invoice numbers. The accountant needs them gap-free.
public sealed class InvoiceNumbers(int first)
{
    private int _next = first;
    public string Next() => $"INV-{_next++:D5}";
}

public sealed class MonthlyInvoiceRun(InvoiceNumbers numbers, IInvoiceStore store, IInvoiceMailer mailer)
{
    // Creates one invoice per billable order, books it, and emails the batch to customers.
    public int Run(IEnumerable<Order> orders)
    {
        // ToList runs the query once. Without it, every loop over `invoices`
        // re-runs Select and takes a fresh set of invoice numbers.
        var invoices = orders
            .Where(o => o.Amount > 0)
            .Select(o => new Invoice(numbers.Next(), o.Customer, o.Amount))
            .ToList();

        foreach (var invoice in invoices)
            store.Save(invoice);

        mailer.Send(invoices);
        return invoices.Count;
    }
}
