# Candidate-controlled, independently revocable AI provider consent

The account owner can grant or withdraw **provider access consent** and **feedback-improvement consent** independently, through an authenticated same-origin endpoint:

`POST /api/private/drafts/{draftId}/consent` with `{"providerConsent":false,"improvementConsent":false}`.

Only the owner can change these flags. Changes are audit-recorded without placing a draft, assessment or personal information in the public debate record. The private workbench has explicit buttons to withdraw provider access, withdraw assistant-improvement consent, and erase private assessment data. Revisions in the composer reconcile the user's checkbox state with the database before running any new optional model call.

In-flight model/transcription processing validates consent **again inside its final database transaction**. If consent was withdrawn during an external request, no result is written to the account. However, a request already sent to a third-party model cannot be withdrawn retroactively: configure a provider with appropriate processing, retention and deletion terms before enabling it.

Consent revocation and private report deletion never edit the immutable public debate record, suppress a contender, or remove the original candidate's published contribution. Final approval of the actual source remains a separate deliberate candidate action.
