# Billing alerts show up in the shipping channel

> Since we added a third on-call channel last week, some billing alerts land in the shipping team's channel instead of billing. Nobody touched the alert code. Staging still has two on-call channels and looks fine.

## Cause

`Channels` returns `append(r.oncall, team...)`. When the on-call slice has spare capacity, `append` writes the team channel into the router's own backing array and returns a slice that shares it. The next call writes its team channel into the same slot. The dispatcher builds the billing list, then the shipping list, then posts both, and by then the billing list ends in "shipping".

That is why the number of channels matters. Building the slice one `append` at a time grows its capacity 1, 2, 4, 8. With 1, 2, or 4 channels there is no spare room, so `append` copies and everything works. With 3 or 5 there is room, and the lists overwrite each other. The same sharing meant that a caller sorting its list in place reordered the router's on-call channels.

## Fix

Return a new slice every time with `slices.Concat`. A three-index slice, `append(r.oncall[:n:n], team...)`, would stop the overwrite, but with no team channels it would still return the router's own array, and the sort problem would stay.

```diff
 func (r *Router) Channels(team ...string) []string {
-	return append(r.oncall, team...)
+	return slices.Concat(r.oncall, team)
 }
```

## Test

The suite builds two alerts back to back with 1 to 5 on-call channels, and sorts a returned list. On the original code the 3- and 5-channel cases fail, as does the sort test. No race detector is needed: this happens on a single goroutine.

```sh
go test ./cases/03-go-alerts-sent-to-wrong-team               # fixed
go test -tags buggy ./cases/03-go-alerts-sent-to-wrong-team   # original
```
