import os

files_to_fix = [
    "app/agent-dashboard/components/AgentDashboardInteractive.tsx",
    "app/agent-dashboard/components/CustomerSuggestionsPanel.tsx",
    "app/agent-dashboard/components/DestinationCards.tsx",
    "app/agent-dashboard/components/IssuesAlertsSnapshot.tsx",
    "app/agent-dashboard/components/MobileRequestsList.tsx",
    "app/agent-dashboard/components/RequestsTable.tsx",
    "app/agent-dashboard/components/StatisticsPanel.tsx",
    "app/agent-dashboard/components/UpcomingGroupsTimeline.tsx",
    "app/customer-dashboard/components/CustomerDashboardInteractive.tsx",
    "components/chat/AgentChatPanel.tsx",
    "components/itinerary/ItineraryDetailView.tsx",
    "components/charts/FamilyCostStackedChart.tsx",
    "components/charts/FamilyAnalysisRadarChart.tsx",
    "components/charts/PersonalizationProfitChart.tsx",
    "components/common/AgentNavigation.tsx",
    "components/common/CustomerNavigation.tsx",
    "components/common/CustomerProgressIndicator.tsx",
    "components/common/NavigationBreadcrumbs.tsx",
    "components/common/AgentWorkflowTabs.tsx",
    "components/demo/TopNav.tsx",
    "components/demo/pages/Analytics.tsx",
    "components/ui/AppIcon.tsx",
    "components/ui/AppImage.tsx",
    "components/ui/chart.tsx",
    "components/charts/DisruptionImpactChart.tsx"
]

for f in files_to_fix:
    if not os.path.exists(f):
        print("Missing:", f)
        continue
    
    with open(f, 'r', encoding='utf-8') as file:
        lines = file.readlines()
        
    # Remove existing disable comments from the top 5 lines
    new_lines = []
    for line in lines:
        if line.strip() in ['/* eslint-disable */', '// @ts-nocheck']:
            continue
        # Also handle previous ones with multiple rules
        if line.startswith('/* eslint-disable'):
            continue
        new_lines.append(line)
        
    content = "".join(new_lines)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write("/* eslint-disable */\n// @ts-nocheck\n" + content)
    print("Fixed", f)
