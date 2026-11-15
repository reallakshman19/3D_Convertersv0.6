# WIP-STEP7-DYNAMIC-20261115 — generic dynamic Step 7 execution, current-main candidate

Criticality ENGINEERING_CRITICAL; owner explicitly requested dynamic Step 7 fix and proof. Base fa54925905c42e2591ca42e5ddafe4ea1f2952aa. PR1 2671f708bcd30013c954cfb5b39201c71d2b9d is 10 behind / 4 ahead, unmergeable. SALVAGE_PARTIAL: carry forward named-field and saved-priority approach, use current root as authority, port into active v045; no force push, no merge. PR4/7 own audit/export and PR6 CI; no changes to their branches. Coordination required; do not merge both mapper drafts.

Appendix A self-assessment (not independent review): A1 19/20: traced Step 7 UI applySupportMappingRowPatch -> migrated config -> parent index / active v045 closure and original source audit; Python table replay; Preview trace field projection. A2 20/20: original-source native baseline exact head e162a282372d02b57f810499cbc833acf84e8044, CI 43702052838 demonstrated shipped 14/8, reconstructed saved GT5 REST 14 only, mapper-generated 14/8/9 at node3760 block51. A3 19/20: retain lower numeric priority, source scope, saved kind/disabled/field, NODETYPE mutation and tie refusal, source-first before generated labels, no new geometry, writer, gap or unit authority; preserve CA100 composite default. A4 18/20: independent literal arbitrary-field and original input hash/CII slot oracles; no exact owner saved config or independent reviewer. A5 18/20: current-main config/evaluator/trace/Preview/parent resolver/Python parity and original-source regression; no workflow edits; no topology/physical-vertex switch. Total 94/100, minimum 18, same author only. Release HOLD.

Implementation: named and wildcard fields consume original scalar source attributes; generated labels fallback-only; default MDS rows visible before Test/Save, priorities 900–930 as existing mapper, saved edits preserved. Preview uses same serialized table; parent resolver consults owner rule before legacy fallback; v045 closure uses original attributes. Python mirrors table decisions. No PS-4131-specific production rules. Existing legacy no-match fallback preserved, not a qualified replacement of all non-governed mapping paths.

Validation NOT_RUN: test implementation next commit; no release claim. Original files backed up by exact original blob references under .backups/WIP-STEP7-DYNAMIC-20261115; local checkout/backup CLI unavailable (container DNS). Actual saved PC config unavailable. Reconstructed GT5 REST must stay REST, not silently overwritten.

Changed-file ledger:
- converters/xml-cii2019-core/support-kind-precedence.js original 3c5ae78a81bb2a0a6cb8344aca92880d01642769
- v045/converters/xml-cii2019-core/support-kind-precedence.js original 026b79eca40cb35e50411b761aa97e191aaab141
- converters/xml-cii2019-core/support-mapping-config.js original defb40e55435ea2e1ad8fd51b96cc4ff9034af51
- v045/converters/xml-cii2019-core/support-mapping-config.js original c24a9d4472e441a842da715d4d339ec0b0f0f320
- tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js original 2972da8e2ab08e20060792d05193dad00f0ee2e3
- v045/tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js original a687f704fbeedd1deb28f461c17d2302d5f968fd
- tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js original a21a52301308e772652e2142190a88ac2f4c2924
- v045/tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js original 3af0d8f297adc3f6761489d5c21807d08ea76936
- converters/scripts/xml229_support_type_mapper.py original 3d5dcdbe1999eadc2c4e611ef8e446e9862df15b
- converters/xml-cii2019-core/support-mapping-legacy.js original 33b36bd60d0f912cd0405b2cedddf94d606fc9ab
- v045/converters/xml-cii2019-core/support-mapping.js original 39f0180579a14ce5348a19b18fa23d3315836880
- v045/tabs/xml-cii-2019-standalone/xml-cii-mds-restraint-closure.js original 6cfbed7cba49e33bb844092e7563eb57063995ac
- docs/converters/xml-cii2019-core/support-kind-precedence.js original 3c5ae78a81bb2a0a6cb8344aca92880d01642769
- docs/converters/xml-cii2019-core/support-mapping-config.js original defb40e55435ea2e1ad8fd51b96cc4ff9034af51
- docs/tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js original 2972da8e2ab08e20060792d05193dad00f0ee2e3
- docs/tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js original a21a52301308e772652e2142190a88ac2f4c2924
- docs/converters/scripts/xml229_support_type_mapper.py original 3d5dcdbe1999eadc2c4e611ef8e446e9862df15b
- docs/converters/xml-cii2019-core/support-mapping-legacy.js original 33b36bd60d0f912cd0405b2cedddf94d606fc9ab

EXACT_NEXT_ACTION: add exact-source native regression and dynamic named/wildcard/priority JS-Python tests; run established CI without workflow edits. Do not merge.