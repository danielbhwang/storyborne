# Storyborne — LESSONS (read this first)

The team lead reads this file at the start of every run. Each rule came from a real bug. A change that breaks a rule is the top bug in the digest.

LATEST ZIP: 2026-11-17c
(The live index.html should load app.js?v=2026-11-17c. If it shows an older version, that zip hasn't been uploaded yet. If this file and index.html show different versions, an upload was partial.)

## Rules (accepted fix → rule derived → where it is checked)

1. **World layers.** Bug: the house kept jumping in front of the tree swing. Rule: a new or moved world item goes on the top layer (`z = max + 1`), and Front/Behind renumbers the layers. Checked by: units.js, "every new world item goes on the top layer".
2. **Both kids, always.** Bug: Miles didn't get the new dragons. Rule: any feature, reward table or art set added for one track is checked on the other track too. Checked by: asserts.js, "son: collection is all real dragons", plus QA rule (a).
3. **Sync never undoes a kid.** Bug: a removed planet came back, and taken-off armor came back. Rule: what a kid removed, sold or took off stays that way after a sync (the latest edit wins). What a kid earned (relics, bosses beaten, real books logged, refunds) is combined from both iPads and never lost. Checked by: units.js, the `merge-*` checks.
4. **Saved numbers stay within the game's real limits.** Bug: a save at rank 13 stranded the kid. Rule: level, chapter and other saved indexes are clamped when the save loads and when it syncs. Checked by: asserts.js, "level-13 save shows level 12" (both kids).
5. **Books end.** Bug: the Bookshelf said "Chapter 100". Rule: a bookmark at or past the last chapter counts as a finished book. Checked by: asserts.js, "bookmark past the end shows finished".
6. **Stars for a grown-up's OK need the PIN.** Bug: kids could tap "✓ Grown-up heard it" themselves. Rule: every button that pays for a grown-up's approval goes through `grownUp()`. Checked by: units.js, "every grown-up approve button is PIN-gated".

## Run the checks
`node qa-units.js` (no browser) and `node qa-screens.js 8799` (with the app served on port 8799, Playwright installed). Each line is GREEN or RED with expected vs got. Exit 0 = all green.

## Gates (every zip, all must be GREEN)
- The test suite exits 0. It checks expected results, not just "no errors".
- The changed files match the plan's file list exactly.
- Every report also carries an UNTESTED line. Real iPad Safari, the microphone and two-iPad sync are never covered by these tests.

## Open items (waiting on Dan)
- REFRESH button text spills out of the update banner on phones (cosmetic).
- Gia: an optional retry on story-detail questions, her weakest type.
- Miles: the mic misses short words; so far only the weekly report allows for it.
- Stories in the daily digest are written by Opus 5.5. Fable 5.2 is available if Dan wants it.
- Real-iPad check of the 2026-11-17c fixes: rank, Bookshelf, phone Grown-ups button, grown-up PIN pop-up.
