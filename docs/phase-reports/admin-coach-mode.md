# Admin coach mode + sheet inputs losing focus (2026-11-27)

## Summary
1. **The admin can coach.** Roles were already an array (`User.roles`), so admin + coach on one account was always
   valid — what was missing was a way to add `coach` to an existing account: admin-created coaches must be new
   emails (`createCoach` refuses a taken one), and sign-up refuses the ADMIN_EMAIL address. New: the admin page
   button "הפעלת מצב מאמנת לחשבון שלי" → `POST /api/admin/me/coach-mode` (admin only, acts on req.userId only,
   idempotent, logged as `admin_action` / `own_coach_mode`). It adds the coach role + CoachProfile (name = account
   name, no photo, empty defaults) + primary community, then sends her to the coach dashboard.
2. **Inputs in dashboard side sheets lost focus on every letter.** `SideSheet` ran its "Esc + give the focus back to
   the opener" effect with `onClose` as a dependency. `CreateCoachSheet` (name + email) passes a new `close`
   function each render, so every keystroke re-ran the effect, whose cleanup focused the opener button. Fixed
   in `SideSheet` (latest-handler ref, effect depends on `isOpen` only — the pattern `useDialogFocus` already used).

## Scoping check (coach queries)
Every `/api/coach` route reads by `req.userId` (`loadCoachTrainee` = a live Coaching with `coachId: req.userId`;
trainees / today / activity / stats / archive / messages / invites all take `req.userId`). No server code gives the
admin role extra access outside `/api/admin` (which is identity-only). New test: as a coach the admin lists only her
own trainees, and another coach's trainee answers 404.

## Same focus pattern elsewhere
- Fixed: dashboard `SideSheet` (covers CreateCoachSheet, InviteSheet, ChangeEmailSheet, DeleteAccountSheet, FoodSheet,
  TemplateRenameSheet, TraineePickerSheet, LibrarySheet, AiDraftSheet, AdminUserSearch, CoachesPage link sheet);
  dashboard `trainees/AchievementModal`; mobile `achievements/AchievementModal` (mirror) — same restore-focus effect
  keyed on `onClose`, which a parent re-render would trigger.
- Checked, fine: `useDialogFocus`, `useBottomSheet` (mobile sheets incl. the invite sheet, already ref-based),
  NewPlanPopover, notifications panel, CommandPalette. Effects keyed on `onClose` that only re-add a key listener
  (no focus move): FamilySheet, TraineeQuickView, mobile Modal, PhotoViewer — harmless, left as is.
- No components defined inside render, no changing `key` on inputs or sheets.

## Mobile
An admin + coach account opens the mobile app in coach mode (`resolveAppMode`: coach role → coach). The existing mode
switch only appears with coach + trainee roles; the admin tools have no mobile side, so there is nothing to switch to.

## Production
No script. After deploying server + dashboard, sign in to the production dashboard as the admin and press the button
once. Pressing it again changes nothing.

## Files
- Added: `apps/server/src/features/admin/__tests__/adminOwnCoachMode.test.ts`, `apps/dashboard/src/features/admin/hooks/useOwnCoachMode.ts`, this report
- Modified: server `admin.service.ts` / `admin.controller.ts` / `admin.routes.ts`; `packages/types/src/accounts.ts`;
  `packages/api-client/src/accountsApi.ts`; dashboard `services/admin/adminService.ts`, `features/admin/copy/{he,en}.ts`,
  `features/admin/pages/CoachesPage/CoachesPage.{tsx,css}`, `components/common/SideSheet/SideSheet.tsx`,
  `features/trainees/components/AchievementModal/AchievementModal.tsx`; mobile
  `features/achievements/components/AchievementModal/AchievementModal.tsx`; `docs/PRD.md` (§3).
- Dependencies: none.

## How to test
- `npm test` (new: admin own coach mode — 4 tests), `npm run lint`, `npm run build`.
- Dashboard as an admin-only account: Coaches page → "הפעלת מצב מאמנת לחשבון שלי" → lands on the overview; the nav has
  the admin link; the button is gone from the admin page; invite a trainee, build a plan.
- Focus: admin page "+ מאמנת" → type a full name and email without the cursor leaving the field; same in
  "+ Invite a trainee" (email) and the change-email sheet. Repeat in iPhone Safari (`npm run dev:phone`).

## Known issues
- `coachArchive.test.ts` "ends the coaching…" failed once in a full run and passed 3/3 alone (timing; unrelated).
- The English button label is a translation of the owner's Hebrew; mark for review.
- Not tested in a real browser / iPhone Safari by me — please run the manual focus check above.
