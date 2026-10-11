# PostgreSQL integrity acceptance

Every PR runs all numbered migrations against a disposable PostgreSQL 18 service, re-checks their checksums, and exercises immutable published videos, questions, assessed answers, policy hashes, and the append-only record in a fictional transaction that is always rolled back. This is not yet a browser/media integration test.
