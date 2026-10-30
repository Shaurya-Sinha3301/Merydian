import json
import os
import re

LOG_PATH = r"C:\Users\ASUS\.gemini\antigravity-ide\brain\f348708c-7fd4-4324-a796-c54af399d3e1\.system_generated\logs\transcript_full.jsonl"
TARGET_FILES = [
    "app/agent-request-review/components/AgentRequestReviewInteractive.tsx",
    "app/customer-dashboard/components/CustomerDashboardInteractive.tsx",
    "app/customer-login/components/CustomerLoginInteractive.tsx",
    "app/demo/page.tsx",
    "app/layout.tsx",
    "app/signup/page.tsx",
    "components/chat/AgentChatPanel.tsx",
    "components/common/AgentNavigation.tsx",
    "components/common/AgentWorkflowTabs.tsx",
    "components/common/CustomerNavigation.tsx",
    "components/common/CustomerProgressIndicator.tsx",
    "components/common/NavigationBreadcrumbs.tsx",
]

# We want to recover the content before my fix_any.py which was run today.
# We will search the transcript for the last write_to_file or replace_file_content 
# for these files. Wait, if it's replace_file_content, it might be partial.
# A better way is to find the last time it was modified BEFORE fix_any.py, 
# and maybe it was never modified by the agent and it was just fix_any.py that modified it!
# If the agent never modified it, then `git checkout` was perfectly safe!

def check_if_agent_modified():
    modified_by_agent = {f: False for f in TARGET_FILES}
    try:
        with open(LOG_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                data = json.loads(line)
                if data.get('type') == 'PLANNER_RESPONSE':
                    tool_calls = data.get('tool_calls', [])
                    for tc in tool_calls:
                        args = tc.get('arguments', {})
                        target = args.get('TargetFile', args.get('AbsolutePath', ''))
                        target = target.replace('\\', '/')
                        for tf in TARGET_FILES:
                            if tf in target:
                                modified_by_agent[tf] = True
    except Exception as e:
        print("Error:", e)
    
    print("Files touched by agent:")
    for k, v in modified_by_agent.items():
        if v:
            print(k)

if __name__ == '__main__':
    check_if_agent_modified()
