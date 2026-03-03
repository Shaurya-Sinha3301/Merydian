import sys
from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor

def test_llm():
    print("=== Testing Explainability Pipeline with LLM ===")
    old_it = {'days': [{'day': 1, 'families': {'FAM_001': {'pois': [{'location_id': 'RED_FORT', 'name': 'Red Fort'}]}}}]}
    new_it = {'days': [{'day': 1, 'families': {'FAM_001': {'pois': [{'location_id': 'RED_FORT', 'name': 'Red Fort'}, {'location_id': 'AKSHARDHAM', 'name': 'Akshardham Temple'}]}}}]}
    locs = {'RED_FORT': {'name': 'Red Fort', 'cost': 100}, 'AKSHARDHAM': {'name': 'Akshardham Temple', 'cost': 200}}
    
    fp = FeedbackProcessor()
    res = fp.process_feedback('trip1', 'FAM_001', old_it, new_it, 'Add Akshardham', locs)
    
    for i, exp in enumerate(res.get('explanations', [])):
        print(f"Change: {exp['poi_name']} -> {exp['change_type']}")
        print(f"LLM Explanation: {exp['llm_explanation']}")

    if not res.get('explanations'):
        print("No explanations generated.")

if __name__ == '__main__':
    test_llm()
