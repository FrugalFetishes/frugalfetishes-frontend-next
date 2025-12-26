ROLLBACK TO STABLE DISCOVER (Noon EST today) — Step-by-step
========================================================

Goal
----
Get Discover swipe behavior back to the exact working state you had earlier today (~noon EST),
without touching other files. Then we can re-apply ONLY the theme/UI changes safely.

You said: it worked earlier today around noon EST.
So we will restore src/app/discover/page.tsx from a commit made around that time.

IMPORTANT
---------
Do NOT “fix forward” with more patches right now.
We only restore ONE file to a known-good version first.

PART A — Find the correct commit in GitHub (fastest)
----------------------------------------------------
1) Open your repo on GitHub:
   FrugalFetishes/frugalfetishes-frontend-next

2) Navigate to the file:
   src/app/discover/page.tsx

3) Click “History” (top right of the file view).
   You will see a list of commits that changed this file.

4) Use the timestamps:
   Find the commit from “today” around 12:00 PM EST (noon).
   (GitHub shows “X hours ago” — pick the one that matches when it worked.)

5) Click that commit.
   Confirm it’s the one: the app should have had working swipe overlays + expand profile + return to feed.

6) Copy the commit hash (short hash is fine, like abc1234).

PART B — Restore ONLY that file on GitHub (no local setup required)
-------------------------------------------------------------------
Option 1 (Recommended): “Browse files” on that commit and restore file content

1) While viewing the commit, click “Browse files”.
2) Navigate again to:
   src/app/discover/page.tsx
3) Open it and click the pencil (Edit).
4) Replace the current file content with the content from that commit version.

How to get the old content quickly:
- In the commit view of the file, click “Raw”
- Copy all
- Paste into the editor on main branch file view
- Commit the change to main with message:
  “Rollback discover/page.tsx to stable noon build”

This triggers Vercel automatically.

Option 2: “Revert commit” (ONLY if the commit is isolated to discover/page.tsx)
-------------------------------------------------------------------------------
If the commit around noon changed ONLY src/app/discover/page.tsx, you can simply press “Revert”
from the commit page. But if that commit touched multiple files, do NOT use this option,
because it will revert other unrelated work.

PART C — Verify on Vercel / in browser
--------------------------------------
1) Wait for the new deployment to finish.
2) Go to:
   https://frugalfetishes-frontend-next.vercel.app/discover

3) Confirm these 4 behaviors:
   A) Swipe left shows “PASS” overlay
   B) Swipe right shows “LIKE” overlay
   C) Swipe up expands profile (sheet)
   D) Swipe down closes sheet and returns to the same card stack

4) Confirm images are profile images (not branding).

PART D — If you can’t find the exact commit
-------------------------------------------
If you can’t confidently pick the noon commit, do this:

1) In GitHub History for src/app/discover/page.tsx
2) Open 2–3 likely commits around the right time
3) For each commit, click “Browse files” and check the discover/page.tsx version
4) Pick the one that still contains:
   - the Like/Pass overlay code
   - swipe up/down behavior
   - uses the feed photo field (not branding)

Then restore that version.

WHAT I NEED FROM YOU (so I can give you the exact rollback file)
---------------------------------------------------------------
Reply with ONE of these:
1) The commit hash you found for the working noon version, OR
2) The GitHub URL of that commit page, OR
3) The GitHub URL of the file-history entry you think is right

Then I will generate a single clean .txt replacement of discover/page.tsx
that matches that commit exactly (and we’ll re-apply theme changes safely afterward).
