//go:build buggy

package shipping_test

import subject "github.com/lowfjell/bugfix-casebook/cases/04-go-checkout-goroutine-leak/buggy"

type Quote = subject.Quote
type Carrier = subject.Carrier

var FirstQuote = subject.FirstQuote
