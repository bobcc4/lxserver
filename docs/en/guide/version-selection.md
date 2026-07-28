# V1 Support Status

This documentation applies to V1, published as `bobcc4/lxserver:v1`.

## Current Recommendation

- V1 is actively maintained for personal NAS installations and small user groups.
- V1 stores music and cache files with readable names, so downloaded source files can be viewed, copied, and backed up directly.
- V2 has been permanently discontinued. Do not use it for new installations.

## Data Compatibility

The historical V2 release used a different persistent-data layout. V1 and V2 cannot share a data directory, and V2 databases or content-addressed media repositories cannot be mounted directly into V1.

To move music from another release into V1, deploy V1 separately, import the playlists you need, place audio under `/music/<username>`, and scan the local library again.
