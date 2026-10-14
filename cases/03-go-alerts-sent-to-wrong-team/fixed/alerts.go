// Package alerts decides which chat channels get a copy of each monitoring alert.
package alerts

import (
	"slices"
	"strings"
)

// Router holds the on-call channels that receive every alert.
type Router struct {
	oncall []string
}

// NewRouter parses the ALERT_ONCALL setting, e.g. "ops-oncall, platform".
func NewRouter(oncallSetting string) *Router {
	var oncall []string
	for _, ch := range strings.Split(oncallSetting, ",") {
		if ch = strings.TrimSpace(ch); ch != "" {
			oncall = append(oncall, ch)
		}
	}
	return &Router{oncall: oncall}
}

// Channels returns the on-call channels plus the channels of the team that owns the alert.
// The result is a new slice every time: callers may keep it, sort it, or append to it.
func (r *Router) Channels(team ...string) []string {
	return slices.Concat(r.oncall, team)
}
