# MoneyKeel CashFlow independent audit

Start with **MoneyKeel_CashFlow_Claude_Code_Brief.md**. The result files are in `audit_results/`;the unchanged input packet is in `source_packet/`.

This is a written-specification audit,not a code review or live-app certification. Formula verdicts:114RIGHT,26WRONG,75INCOMPLETE,4CANNOT TELL. All219cards have five fixtures (1,095total),including numeric expectations,refusals,missing-contract witnesses and permitted simulation/relational checks. Some fixtures require a missing public contract before execution. Expected results were not fitted to app outputs.

JSON decimals/rationals may be strings to retain precision. A component object can hold `exact`,`shown`and a declared display-policy note. Use exact values for arithmetic comparisons and the screen register's actual unit for formatting. Numerical search outputs use a stated tolerance,not binary equality. `formula_gives`means the supplied written formula's result,not an observed app result.

Screen PASS means the declared contract meets that check. FAIL with `finding_kind:evidence_gap`means compliance cannot be established from the supplied declarations;it does not allege an observed bug. Owner decisions remain in force. Unresolved product semantics remain RULE UNCLEAR.

The audit-generation and output-QA scripts are independent arithmetic aids written for this review. They contain no MoneyKeel implementation or existing tests. To reproduce the JSON and checks with Python3,run `python3 build_audit.py`,then `python3 verify_outputs.py`from this extracted folder. The original input packet and normalized input data needed by these scripts are included. Regeneration preserves exact expectations but may omit the extra component display-policy enrichment applied when packaging.

`source_manifest.json`gives SHA-256hashes for original files. `audit_results/MoneyKeel_CashFlow_Audit_Validation.json`contains coverage checks;`..._Output_QA.json`contains29output-row reconciliation checks and independent selected arithmetic witnesses. These checks are not app test runs.
