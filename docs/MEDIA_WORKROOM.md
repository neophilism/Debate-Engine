# Reviewable media workflow

A verified branch participant may view private draft derivatives and explicit owner-authorized clip grants. A visitor can view only already released summary metadata. The preview endpoint returns a short-lived signed URL to actual rendered media, and only a verified candidate from either side can open it before release.

Rendering must not be queued until each selected original-video clip has a matching grant from its original owner. A permission to archive or include an unedited video is NOT editing permission. A draft/manifest hash is NOT an approval of actual rendered bytes. Both candidates must approve the actual SHA-256 of a reviewed video before release.

The isolated FFmpeg worker remains a separately gated deployment. Frontend controls and database rows alone do not demonstrate successful media production or consent.
