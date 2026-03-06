# Change Log

**2/21/2026**: Create Repository

**3/6/2026**: Reread and refactor code

**3/6/2026**: - Fixed a bug where running byteSize on Uint8 will return NaN
              - Fixed a bug in vvset variable in toBuffer method (createState variable in bint  factory function) where we would directly use vsset() instead of vsset.call(view,...)