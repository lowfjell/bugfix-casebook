// Package shipping fetches a shipping price for the checkout page.
package shipping

import "context"

type Quote struct {
	Carrier    string
	PriceCents int64
}

// Carrier asks one shipping company's rate API for a price.
type Carrier func(ctx context.Context) (Quote, error)

// FirstQuote asks every carrier at once, so checkout never waits on the slowest one.
func FirstQuote(ctx context.Context, carriers []Carrier) (Quote, error) {
	// Once we have an answer, tell the carriers that lost the race to stop.
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// One slot per carrier, so a late answer never blocks with nobody reading.
	results := make(chan Quote, len(carriers))
	for _, c := range carriers {
		go func() {
			if q, err := c(ctx); err == nil {
				results <- q
			}
		}()
	}

	select {
	case q := <-results:
		return q, nil
	case <-ctx.Done():
		return Quote{}, ctx.Err()
	}
}
