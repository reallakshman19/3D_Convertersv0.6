# XML to CII 2019 Standalone restraint audit

The Output/Run restraint audit links the original XML occurrence and JSON member to the actual mapping rule, before/after values and emitted CII block/slot/line. JSON, CSV and HTML downloads retain the input/configuration/output identities. Existing runs without a recorded audit are labelled accordingly; changing the inputs/configuration/output invalidates current-run evidence.

Step 7 Test and Save use the same effective rules. Explicit source fields execute, saved row edits survive migration, generated labels remain fallback-only, and Preview separates descriptive labels from actual XML/CII types. Configured type profiles apply when source NODETYPE is absent; valid source NODETYPE after configured mutation retains priority.

The optional `xml229PhysicalVertexPrefinal` path preserves each original JSON restraint member, including same-kind and same-value occurrences, on its connected original source vertex. It has a six-slot limit and independent original-source native Python replay. It retains source geometry, mass owners and authored XML restraint authority. Its default is OFF. It is not a general legacy-path cutover.

For qualified coordinate bases, the existing support configuration accepts an explicit query policy:

```json
{
  "xml229SourceCoordinatePolicy": {
    "schema": "XML229.SourceCoordinatePolicy.v1",
    "positionField": "POS",
    "translationMm": ["0", "0", "0"],
    "xmlQuantumMm": "0.01",
    "identityMode": "exact-branch-member"
  }
}
```

POS/POSI selection and translation are explicit. This qualified profile checks a closed half-quantum envelope against the unchanged original XML, using exact arithmetic. It requires exact branch/member identity and preserves disconnected revisits. Invalid policies, competing legacy datum settings, missing/duplicate identities and out-of-envelope values hold. The audit records and independently challenges the coordinate witness.

Generic source attachments can additionally delegate to the existing original-XML ATTA default route:

```json
{
  "xml229SourceAttachmentPolicy": {
    "schema": "XML229.SourceAttachmentPolicy.v1",
    "unclassifiedAtta": "existing-xml-default"
  }
}
```

This requires the explicit coordinate policy. Only source-identified generic ATTA records without explicit stress fields/semantic descriptions qualify. Configured classifications win. ANCI, invalid source codes, duplicate original-object reuse and overlap with projected restraint vertices hold. Original authored restraints survive. Default-derived restraints remain configuration authority, with the JSON attachment retained as corroboration. The audit census accounts for every projected or delegated source member; hash-recomputed omissions and relabelling are rejected.

These policies do not activate the optional path. Qualification is source-specific. Actual native CII delegation was exercised on a zero-datum fixture; nonzero translation has separate pre-Final/source-replay coverage. General translated mandatory-attachment CII acceptance is not established. A private input qualification remains held by native original-authored/configured-profile differences and downstream staged-position constraints. Retain all holds and keep the optional path disabled for unqualified inputs.

Validation for this change includes 304 local checks with real native Python/CII, independent source reconstruction and deliberate corruption/forgery cases. Literal fixtures, explicitly configured lightweight DOM/transport fixtures, real native execution and browser observations are distinct evidence classes. No distinct-author review, accepted native Final UI or CAESAR II application acceptance is claimed. The pull-request work report records the delivery candidate, reproducible suite and remaining limitations.
