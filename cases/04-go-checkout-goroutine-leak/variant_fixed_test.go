//go:build !buggy

package shipping_test

import subject "github.com/lowfjell/bugfix-casebook/cases/04-go-checkout-goroutine-leak/fixed"

type Quote = subject.Quote
type Carrier = subject.Carrier

var FirstQuote = subject.FirstQuote
