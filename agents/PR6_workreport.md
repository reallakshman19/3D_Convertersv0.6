# PR6 — restore XML229 browser CI execution after PR #5

HANDOVER_READINESS: COORDINATION_REQUIRED
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: RESTRICTED_TO_CI_RUNNER_CONFIGURATION
CRITICALITY: STANDARD (CI infrastructure only; engineering acceptance remains HOLD)
WORK_INTENT: IMPLEMENT / VALIDATE / OPEN_DRAFT
WORKING_BRANCH: codex/pr5-ci-browser-recovery
MAIN_HEAD_LAST_CHECKED: fa54925905c42e2591ca42e5ddafe4ea1f2952aa
CURRENT_STAGE: REBASED_SCOPE_CI_REPAIR_VERIFIED_PRODUCT_HOLD
PREDECESSOR: PR5 (merged); preserve source-census and JSON admission changes
APPENDIX_A_STATUS: NOT_APPLICABLE to production takeover; no production mutation authorized
MERGE_AUTHORITY: OWNER_ONLY

## 2026-11-15 owner correction and revised incident baseline (supersedes older incident hypotheses)

- Owner confirmed original cross-PC PS-4102 discrepancy was due to "Use JSON/support mapper for restraints" being OFF. JSON indexing success did not mean mapper was enabled. Do not describe the original case as a proved classification, geometry or runtime defect. Configuration awareness is the preventive requirement. No release approval implied.
- Owner supplied a new issue document, "Unable to download Audit Json still". Three product requirements: (R1) actual audit JSON download remains broken; (R2) turn JSON restraint mapping ON by default when JSON is loaded; (R3) PS-4131 REST/GT570/ST570 case reports all REST and lacks expected GUI/LIM. Do not conflate R3 with the resolved PS-4102 configuration cause. No private raw document contents or sharing URL copied to the repository.
- R3 evidence (owner-reported audit): distinct co-located source occurrences at nodes 3760/3770/3780; PIPE-REST -> REST; GT570 -> REST with rule builtin-gt5-mds; ST570 -> REST with rule generated-label. All three expectations are +Y on all three targets. Expected engineering kinds per owner: REST/GUI/LIM. These observations establish a discrepancy; the exact consumed Step 7 table is not yet available. PR1 explicitly preserves saved GT5 REST edits; first verify whether the GT570 result is a saved intentional/incorrect rule, not a default-rule or writer defect. The v045 closure returns governedSupportKind before MDSSUPPTYPE GT/ST fallback; generated REST can preempt code fallback, which is a concrete ST570 hypothesis, not yet reproduced with actual config.
- R1 inspect actual current vs recorded-diagnostic download, currency code, browser download event and nonempty parseable JSON. Main adapted DOM helper revokes its object URL immediately; PR7/PR4 propose delayed revoke. This is a candidate fix, not proof of the reported real-browser failure. Preserve stale-report guard and diagnostic-only watermark.
- R2 default config migration already enables missing booleans, but persisted explicit false survives. Need test fresh and previously-OFF PCs on committed valid JSON, reload/restore, XML-only without JSON and intentional per-run OFF. Capture effective config and display it before Run. Owner explicitly requested default ON on JSON load; do not silently overwrite a deliberate current-run choice after loading.
- R3 reproduce with JSON mapper ON and record exact config, matched rule kind, original source occurrence, enriched XML and native CII slots. Independent expected codes 14/8/9; no hardcoded production node numbers; no invented gaps. Verify independent source coverage cannot mark REST as evidence for GUI/LIM. Preserve owner NODETYPE precedence, existing XML preservation and unit/topology/runtime authority.

## Live Git reconciliation and CI outcome

- main remains fa54925905c42e2591ca42e5ddafe4ea1f2952aa. At pre-rebaseline PR6 head 8b851faaf6c56cda667064e4db060012b1f4304d, compare shows 2 ahead / 0 behind, merge base equals current main. No Git history rewrite necessary. This checkpoint is scope/decision rebaseline only.
- PR7 (draft, head 9fe6b0df362ebe16d91a27439f31bb22d14b9945) overlaps all three PR6 workflow files, pins additional nonbrowser jobs and other workflows; also changes audit Blob lifetime, source ownership, diagnostic allowlist and branch-format mirror. PR4 overlaps its audit changes; PR1 owns mapper precedence changes. Classification: COORDINATION_REQUIRED. Do not merge PR6 and PR7 blindly or alter their branches without coordination. Recommend one integration owner select/compose changes; PR6 stays draft as isolated CI evidence until disposition.
- Exact pre-rebaseline head CI: 32 runs, 13 success, 19 failure. [HOLD audit](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43698471620) PASS (Node 22/24 and actual Chromium). [Full regression](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43698471724) FAIL; both Node engineering gates and both Chromium installations PASS; both real-browser application jobs FAIL. BC4 log [132764192782](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43698471724/job/132764192782) times out waiting for data-action=xml229-output-participation in scripts/xml229-issue376-ui-click-e2e.mjs:14 on XML-only flow. This is separate from reported PS-4131. Published smoke not run on draft. New metadata-only head must not inherit exact-head qualification automatically.

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

## PR allocation and exact candidate

PR: https://github.com/reallakshman19/3D_Convertersv0.6/pull/6 (open draft; not merged). Implementation commit 01533f4bbdf6959f12c53cf70e087d751112f6ff; native compare against main shows one commit, three workflow edits and three recovery records. All three remote candidate workflow blob SHAs match the locally checked bytes. Remote workflow snapshot on implementation head: HOLD run [43698424072](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43698424072) in progress; full regression run [43698424126](https://github.com/reallakshman19/3D_Convertersv0.6/actions/runs/43698424126) queued. No successful Chromium execution observed. The post-allocation commit changes only recovery metadata and will have a new head; verify final-head receipts separately.

## Validation
- PASS / LOCAL_EXECUTION / independent structural oracle: parsed original and candidate YAML using PyYAML; restored candidate runner label to old value in parsed representation and asserted entire structures equal for each of three workflows. Verified candidate label and original Git blob IDs. No assertions changed.
- PASS / SOURCE_INSPECTION: Playwright documentation confirms Ubuntu 24.04 compatibility in earlier release; failure logs confirm 26.04 installation incompatibility.
- SUPERSEDED HISTORICAL SNAPSHOT / REMOTE_EXECUTION: initial checks were pending; see live CI outcome above for the exact implementation-equivalent pre-rebaseline head. Published smoke remains NOT_RUN. Full clone blocked by container DNS; local source checkout limited to exact workflow bytes and backup utility.
- NOT_RUN / ENGINEERING: actual PSI-02/STF benchmark, cross-PC equivalence, independent engineering acceptance. Original cross-PC cause corrected by owner; new product issues and engineering acceptance remain HOLD.

## Outstanding recovery work (not addressed by this PR)
- WP-01 remaining: classify all historic pinned-base and scope-only workflows and extend runner repair to other applicable jobs after inspecting each contract; do not disable genuine regression protection.
- WP-02: reconcile root/docs/v045 authority without blindly copying engineering code; known branch-format mirror mismatch and Preview bore/weight divergence.
- WP-03: native BM2 Node3430 Tab7 propagation and conflict rejection failures; unmapped NATIVE_PREFINAL_RESTRAINT_MODE_DRIFT. Coordinate draft #1, preserve authoritative policy and tests.
- WP-04: actual PSI-02/STF two-PC benchmark, independent source/slot ownership, release gate coordination with draft #4. No engineering release acceptance claimed.

HIGHEST_RISK: restored browser execution may reveal genuine engineering regressions; do not equate runner compatibility or successful deployment with engineering acceptance.

EXACT_NEXT_ACTION: coordinate PR1/4/7 before production mutation; first reproduce R3 using the actual saved Step 7 table with mapper ON, capturing GT570 and ST570 rule decisions separately, then isolate wrong configuration versus code fallback and verify R1/R2 in the active browser path. Keep PR6 draft as CI-only evidence until owner decides integration disposition. Do not merge without owner authorization.
