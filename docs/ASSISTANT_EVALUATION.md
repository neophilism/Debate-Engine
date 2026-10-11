# Assistant quality and feedback evaluation

The Debate Assistant is an optional, private, probabilistic reasoning analysis. Preliminary and final calls are separately generated; neither run is a score and neither affects qualifying debate sequence membership.

- Every suggestion containing an excerpt is checked against the original provided text. If the model supplies an invented quotation, that finding is omitted and limitations disclose the omission.
- Feedback on a finding is accepted only if its ID appears in the candidate's actual private report and the candidate owns the report.
- Aggregate improvement metrics deliberately return no result for fewer than five feedback items; they never contain candidate identity or raw private content.
- Provider configuration and candidate consent remain mandatory. Neither this code nor any prior feature authorizes external model-training exports. Nondeterministic disagreement between preliminary and final assessments is not automatically treated as a product defect.

Remaining acceptance: manually rated blinded fixtures, independent false-positive review across varied legitimate styles, bias calibration, provider contract/privacy evaluation and privacy-protective retention.
