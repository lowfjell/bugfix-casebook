package shipping_test

import (
	"context"
	"runtime"
	"sync/atomic"
	"testing"
	"time"
)

// fakeCarrier answers after a delay, or stops early once its context is canceled.
type fakeCarrier struct {
	name     string
	delay    time.Duration
	canceled atomic.Bool
}

func (f *fakeCarrier) Quote(ctx context.Context) (Quote, error) {
	select {
	case <-time.After(f.delay):
		return Quote{Carrier: f.name, PriceCents: 990}, nil
	case <-ctx.Done():
		f.canceled.Store(true)
		return Quote{}, ctx.Err()
	}
}

// checkout asks one fast and two slow carriers, and expects the fast one to win.
func checkout(t *testing.T) (slow []*fakeCarrier) {
	fast := &fakeCarrier{name: "QuickShip", delay: 5 * time.Millisecond}
	slow = []*fakeCarrier{{name: "SlowFreight", delay: 3 * time.Second}, {name: "LateParcel", delay: 3 * time.Second}}
	q, err := FirstQuote(context.Background(), []Carrier{fast.Quote, slow[0].Quote, slow[1].Quote})
	if err != nil || q.Carrier != "QuickShip" {
		t.Fatalf("got %+v, %v; want the QuickShip quote", q, err)
	}
	return slow
}

// eventually polls cond for up to a second.
func eventually(cond func() bool) bool {
	for i := 0; i < 100 && !cond(); i++ {
		time.Sleep(10 * time.Millisecond)
	}
	return cond()
}

func TestSlowCarriersAreToldToStop(t *testing.T) {
	slow := checkout(t)
	if !eventually(func() bool { return slow[0].canceled.Load() && slow[1].canceled.Load() }) {
		t.Error("slow carriers were never told to stop; their API calls keep running")
	}
}

func TestCheckoutLeavesNoGoroutinesBehind(t *testing.T) {
	before := runtime.NumGoroutine()
	for range 20 {
		checkout(t)
	}
	if !eventually(func() bool { return runtime.NumGoroutine() <= before }) {
		t.Errorf("%d goroutines still running after 20 checkouts", runtime.NumGoroutine()-before)
	}
}
