# Satisfaction Metric Validation Report

## Methodology
The satisfaction metric is calculated precisely once per candidate POI evaluation per family, combining the base POI importance with a weighted average of the family's interest vector against the POI's tags. It is then penalized for high travel times and budget overruns.

## Normalization
Formula: `Satisfaction = (Base_Score + Interest_Score) / 2` scaled to a maximum of 100. Fatigue penalties act as a multiplier (e.g. 0.8x) preventing unbounded scores.

## Variance Statistics
- **Min**: 38.50
- **Max**: 74.83
- **Mean (non-zero)**: 56.17