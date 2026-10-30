import os
import sys

print("Loading modules...")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from backend.scripts.benchmark.report_generator import (
    BenchmarkAnalyzer,
    generate_benchmark_report,
    generate_engineering_report,
    generate_optimization_report,
    generate_leaderboard_report,
    generate_comparison_report,
    generate_research_summary,
    generate_constraint_validation_report,
    generate_configuration_comparison,
    generate_reproducibility_report,
    generate_satisfaction_validation_report,
    generate_leaderboard_analysis,
    generate_pairwise_comparison_csv,
    generate_resume_metrics,
    generate_resume_evidence,
    generate_resume_bullets
)

db_path = "backend/scripts/benchmark/benchmark.db"
out_dir = "backend/scripts/benchmark"

print("Init analyzer...")
analyzer = BenchmarkAnalyzer(db_path)
print("Leaderboard...")
leaderboard = analyzer.generate_leaderboard()

print("Phase 4F reports...")
print("1 benchmark report")
generate_benchmark_report(analyzer, out_dir)
print("2 eng report")
generate_engineering_report(analyzer, out_dir)
print("3 opt report")
generate_optimization_report(analyzer, out_dir)
print("4 lead report")
generate_leaderboard_report(analyzer, out_dir)
print("5 comp report")
generate_comparison_report(analyzer, out_dir)
print("6 res sum")
generate_research_summary(analyzer, out_dir)
print("7 const val")
generate_constraint_validation_report(analyzer, out_dir)
print("8 config comp")
generate_configuration_comparison(analyzer, out_dir)
print("9 reprod")
generate_reproducibility_report(analyzer, out_dir)
print("10 sat val")
generate_satisfaction_validation_report(analyzer, out_dir)
print("11 lead ana")
generate_leaderboard_analysis(analyzer, out_dir)
print("12 pairwise csv")
generate_pairwise_comparison_csv(analyzer, out_dir)

print("Phase 4G Resume metrics...")
generate_resume_metrics(db_path, os.path.join(out_dir, "resume_metrics.json"))
print("Phase 4G Resume evidence...")
generate_resume_evidence(db_path, os.path.join(out_dir, "resume_evidence.json"))
print("Phase 4G Resume bullets...")
generate_resume_bullets(os.path.join(out_dir, "resume_metrics.json"), os.path.join(out_dir, "resume_evidence.json"), os.path.join(out_dir, "resume_bullets.json"))
print("DONE")
