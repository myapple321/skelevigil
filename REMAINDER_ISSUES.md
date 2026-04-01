# Remainder issues (SkeleVigil)

Tracked for follow-up; not blocking current tasks unless noted.

## 1. Login screen — top-right gear / settings control (Debug)

- **Observed:** A circular control (described as blue) appears top-right on the SkeleVigil **login landing** in dev.
- **Context:** Auth stack uses `headerShown: false`; no `headerRight` in current auth code. Old Expo tabs `headerRight` (modal link) was removed with `(tabs)`.
- **Hypothesis:** Likely **Expo Dev Client** or other dev-only UI (color does not match app neon cyan theme).
- **Resolve later:**
  - [ ] Run **Release** build on device and confirm whether the control appears.
  - [ ] If it appears in Release: trace which navigator/header renders it and remove or hide.
  - [ ] If it only appears in Debug: document as expected dev behavior; no app change needed.

---

_Add new items below with date or short id when useful._
