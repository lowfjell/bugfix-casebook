//go:build !buggy

package alerts_test

import subject "github.com/lowfjell/bugfix-casebook/cases/03-go-alerts-sent-to-wrong-team/fixed"

var NewRouter = subject.NewRouter
