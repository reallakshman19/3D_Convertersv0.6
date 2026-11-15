# WIP-PR5-CI-RECOVERY-20261115 — restore XML229 browser CI execution after PR #5

HANDOVER_READINESS: READY_FOR_REVIEW_CHECKS_PENDING
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: RESTRICTED_TO_CI_RUNNER_CONFIGURATION
CRITICALITY: STANDARD (CI infrastructure only; engineering acceptance remains HOLD)
WORK_INTENT: IMPLEMENT / VALIDATE / OPEN_DRAFT
WORKING_BRANCH: codex/pr5-ci-browser-recovery
MAIN_HEAD_LAST_CHECKED: fa54925905c42e2591ca42e5ddafe4ea1f2952aa
CURRENT_STAGE: RUNNER_PIN_LOCALLY_VALIDATED_REMOTE_NOT_RUN
PREDECESSOR: PR5 (merged); preserve source-census and JSON admission changes
APPENDIX_A_STATUS: NOT_APPLICABLE to production takeover; no production mutation authorized
MERGE_AUTHORITY: OWNER_ONLY

## Mission and isolation

Owner requested a new recovery PR following the read-only PR5 failure audit. Scope is WP-01 first bounded tranche: restore the three proven post-merge browser workflows to a compatible OS, without altering the pinned Playwright version, test assertions, fixtures, triggers, release checks, or production code. No changes to historical qualification applicability in this tranche; do not mask those failures.

Actual pre/post-PR browser jobs failed before application execution: [pre-PR](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43686946345/job/132729353077), [post-PR](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43693251237/job/132748178889), [full regression](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43693198403), [HOLD](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43693198383). Playwright 1.52.0 cannot install Chromium on ubuntu26.04-x64. Ubuntu 24.04 support predates 1.52 (https://playwright.dev/docs/release-notes#version-146). Hypothesis: explicitly selecting ubuntu-24.04 allows installation and reaches the existing real tests. Falsifier: installation still fails on the pinned runner, or tests do not execute. A successful install alone is not an application PASS.

## Change ledger and invariants

- .github/workflows/xml229-output-run-audit.yml: only chromium runner label changed; original blob a8eb9b1dda3abb7775c36de4ac1531507ff8a7dc; locally calculated candidate blob 725c25e9c7cd0b45b81461ff0a20154b851de9c9.
- .github/workflows/xml229-postmerge-full-regression.yml: only original-browser-41-branch-native-output runner label changed; original blob 2edd38edd6ab1018224b078ea9f45c66f8efc68a; locally calculated candidate blob 860d5c8c1f7b9d2c68ddf466ab9f4ddf63492883.
- .github/workflows/xml229-published-pages-smoke.yml: only published-bc4-real-browser runner label changed; original blob 30b057c10d7eb73b16c9b0c06215122cb6e9adde; locally calculated candidate blob 1c9db1c05e57c5a1ff90a51fbc1f712f1b49e62a.
- Work report and status/claim metadata are recovery-only.
- No production code, test oracle, fixture, source/master data, audit policy, engineering semantics, V2 activation, or deployment configuration changed.
- Main fa54925905c42e2591ca42e5ddafe4ea1f2952aa and open drafts #1 (mapper authority) / #4 (gap-audit authority) inspected. Exact-file overlap with these drafts: none. Shared CI infrastructure coordination required for any broader workflow changes. Neither draft is modified or merged.
- Repository root and .agents instructions loaded; canonical Common delivery skill returned 404 via connector. Followed local repository instructions; no engineering implementation takeover.
- Exact original workflow bytes and backup utility were reconstructed in isolated local workspace, verified against Git blob SHAs, then each workflow backed up using node utils/backup.js save before editing. Original blobs retained in the base commit; no backup logs or private data published.

## Validation
- PASS / LOCAL_EXECUTION / independent structural oracle: parsed original and candidate YAML using PyYAML; restored candidate runner label to old value in parsed representation and asserted entire structures equal for each of three workflows. Verified candidate label and original Git blob IDs. No assertions changed.
- PASS / SOURCE_INSPECTION: Playwright documentation confirms Ubuntu 24.04 compatibility in earlier release; failure logs confirm 26.04 installation incompatibility.
- NOT_RUN / REMOTE_EXECUTION: GitHub Actions on candidate head, actual Chromium installation, root/docs browser tests, published smoke after eventual authorized merge. Full clone blocked by container DNS; local source checkout limited to exact workflow bytes and backup utility.
- NOT_RUN / ENGINEERING: actual PSI-02/STF benchmark, cross-PC equivalence, independent engineering acceptance. Original issue remains HOLD.

## Outstanding recovery work (not addressed by this PR)
- WP-01 remaining: classify all historic pinned-base and scope-only workflows and extend runner repair to other applicable jobs after inspecting each contract; do not disable genuine regression protection.
- WP-02: reconcile root/docs/v045 authority without blindly copying engineering code; known branch-format mirror mismatch and Preview bore/weight divergence.
- WP-03: native BM2 Node3430 Tab7 propagation and conflict rejection failures; unmapped NATIVE_PREFINAL_RESTRAINT_MODE_DRIFT. Coordinate draft #1, preserve authoritative policy and tests.
- WP-04: actual PSI-02/STF two-PC benchmark, independent source/slot ownership, release gate coordination with draft #4. No engineering release acceptance claimed.

HIGHEST_RISK: restored browser execution may reveal genuine engineering regressions; do not equate runner compatibility or successful deployment with engineering acceptance.

EXACT_NEXT_ACTION: open a draft PR against main, verify exact changed-file ledger and candidate blob SHAs, inspect its actual HOLD and full-regression workflow jobs after they execute; keep draft until reviewed. Published smoke is workflow_run after an authorized main deployment and cannot be claimed passed premerge. Do not merge without owner authorization.
