# Multimodal publication implementation

The candidate starting a debate chooses a fixed nonempty subset of video, audio and writing. Existing debates remain video-only. Any verified same-office candidate may answer in a permitted medium on each turn.

Audio originals use FFprobe validation and private original-byte storage. Writing is stored as immutable public text with `char:N` source references. Audio/video use timestamps. The same reciprocal-answer qualification and full public record apply to every medium. Written responses use the explicitly disclosed 150-words/minute equivalent of the shared video/audio response time. Disallowed mediums are rejected before publication.

This PR supplies server publication support; the new candidate composer and the private preflight/final assessment gate are separate, required PRs before release. Existing direct publication endpoints must not remain able to bypass the candidate's explicit post-assessment confirmation in the finished application.
