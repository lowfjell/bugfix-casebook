# Checkout service memory grows all day

> Our checkout service gets slower through the day, and memory climbs until the host restarts it at night. The only recent change is the new shipping price lookup. The goroutine count on our metrics page goes up with every order and never comes back down.

## Cause

`FirstQuote` asks every carrier at once and returns the first price. Answers go through an unbuffered channel, and after the first one nobody reads from it again. Every slower carrier finishes its request and then blocks forever on the send. With three carriers, that is two stuck goroutines per checkout, each holding on to its request and response. The losing requests also ran to completion, because nothing canceled their context.

## Fix

Give the channel one slot per carrier, so every send completes and every goroutine exits. Then derive a context that is canceled when `FirstQuote` returns, so the slower carriers drop their HTTP calls instead of finishing them. The buffer is what stops the leak. The cancel stops the wasted work.

```diff
 func FirstQuote(ctx context.Context, carriers []Carrier) (Quote, error) {
-	results := make(chan Quote)
+	// Once we have an answer, tell the carriers that lost the race to stop.
+	ctx, cancel := context.WithCancel(ctx)
+	defer cancel()
+
+	// One slot per carrier, so a late answer never blocks with nobody reading.
+	results := make(chan Quote, len(carriers))
```

## Test

The fake carriers behave like an HTTP client: they answer after a delay, or stop early if their context is canceled. The suite counts goroutines before and after 20 checkouts, and checks that the slow carriers were told to stop. On the original code both tests fail, with 40 goroutines still running after 20 checkouts. Every checkout in the suite also checks that the fastest quote wins, and that part works on both versions, which is why the bug looked fine in review.

```sh
go test ./cases/04-go-checkout-goroutine-leak               # fixed
go test -tags buggy ./cases/04-go-checkout-goroutine-leak   # original
```
