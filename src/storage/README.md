# `storage/`

Persistence adapter over `localStorage`.

All reads and writes go through here so there is exactly one place that
knows the storage keys, one place that handles quota errors and
corrupted JSON, and one place to implement "reset progress".

`localStorage` throws outright in some browser privacy modes — code here
must survive that rather than take the page down with it.
