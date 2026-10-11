# Published-state transition regression fix

The original BEFORE UPDATE triggers returned OLD for draft records. That silently discarded a legal draft-to-published transition. The corrected trigger returns NEW before publication, and raises a permanent immutability error after publication. PostgreSQL CI now asserts the actual stored timestamps and status change before testing non-deletion. The fix must be applied to every database environment before publishing any debate.
