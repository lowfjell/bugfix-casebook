package alerts_test

import (
	"slices"
	"sort"
	"testing"
)

var oncallSettings = []string{
	"ops-oncall",
	"ops-oncall, platform",
	"ops-oncall, platform, security", // the setting in production when the bug was reported
	"ops-oncall, platform, security, db",
	"ops-oncall, platform, security, db, network",
}

func TestEachAlertKeepsItsOwnChannels(t *testing.T) {
	for _, setting := range oncallSettings {
		t.Run(setting, func(t *testing.T) {
			r := NewRouter(setting)
			oncall := r.Channels()

			// The dispatcher builds both lists first, then posts them.
			billing := r.Channels("billing")
			shipping := r.Channels("shipping")

			if want := append(slices.Clone(oncall), "billing"); !slices.Equal(billing, want) {
				t.Errorf("billing alert goes to %v, want %v", billing, want)
			}
			if want := append(slices.Clone(oncall), "shipping"); !slices.Equal(shipping, want) {
				t.Errorf("shipping alert goes to %v, want %v", shipping, want)
			}
		})
	}
}

func TestSortingTheResultDoesNotReorderTheRouter(t *testing.T) {
	r := NewRouter("security, platform, ops-oncall")

	// The chat client sorts channels before posting.
	sort.Strings(r.Channels())

	want := []string{"security", "platform", "ops-oncall"}
	if got := r.Channels(); !slices.Equal(got, want) {
		t.Errorf("on-call channels changed to %v, want %v", got, want)
	}
}
