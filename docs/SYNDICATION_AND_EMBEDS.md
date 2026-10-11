# Independent syndication and read-only campaign embeds

The public feed at /feed.xml reports only exact-version joint policy acceptances and links to the permanent full record. This does not send an email, push media to a social account or imply endorsement from any publisher.

The read-only embed at /embed/debates/{debate-id} shows the originating public video and links to the complete record, including competing responses and disputes. Embeds cannot edit or suppress opponent publications.

To integrate from a campaign page, use an iframe pointing to the public embed path, but always provide an independent "View full public debate" link. The iframe neither authenticates campaigns nor sends participant information to the candidate.

The sitemap indexes public debate and verified-candidate pages only. robots.txt discourages indexing private routes but does not control access. All private resources require actual authentication.
