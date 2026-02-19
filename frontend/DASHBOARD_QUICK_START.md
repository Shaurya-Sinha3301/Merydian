# Agent Dashboard Quick Start Guide

## 🚀 Getting Started

The agent dashboard has been completely redesigned with a modern, professional layout. Here's everything you need to know to get started.

## 📍 Access the Dashboard

Navigate to: **`/agent-dashboard`**

The dashboard will load in Overview mode by default, showing:
- Active destination cards
- Issues & alerts snapshot
- Revenue statistics with chart
- Upcoming groups timeline

## 🎯 Main Features at a Glance

### 1. View Toggle (Top Right)
Click the button to switch between:
- **Overview Mode**: Visual dashboard with cards and charts
- **Detailed Mode**: Traditional table view with all data

### 2. Destination Cards (Left, Top)
Shows your 4 most active travel groups:
- 🏖️ Beach destinations (amber/orange gradient)
- 🏔️ Mountain destinations (emerald/teal gradient)
- 🌴 Tropical destinations (green gradient)
- 🛶 Water destinations (blue/cyan gradient)

**What you see:**
- Destination name and group name
- Number of travelers
- Days remaining
- Trip progress bar

**What you can do:**
- Click any card to view full group details

### 3. Issues & Alerts (Left, Bottom)
Real-time monitoring of all groups:

**Alert Types:**
- 🔴 **Critical** (Red): Missing bookings, urgent issues
- 🟡 **Warning** (Amber): Departures soon, pending bookings
- 🔵 **Info** (Blue): Trips ending, general notifications
- 🟢 **Success** (Green): All bookings confirmed

**What you can do:**
- Click filter tabs to show specific alert types
- Click any alert to navigate to the affected group
- Scroll through all alerts

### 4. Statistics Panel (Right, Top)
Monthly revenue overview:

**What you see:**
- Current month revenue with trend
- 31-day bar chart
- Active groups count
- Average group size

**What you can do:**
- Hover over chart bars to see exact daily revenue
- Change month using dropdown (future feature)

### 5. Upcoming Groups Timeline (Right, Bottom)
Next 4 groups departing:

**What you see:**
- Timeline with connecting dots
- Member avatars with initials
- Days until departure badge
- Date range
- Quick action buttons

**What you can do:**
- Click any group card to view details
- Use quick action buttons:
  - 📧 Email the group
  - 📞 Call the group leader
  - 💬 Send a message

## 🎨 Understanding the Colors

### Alert Priority
| Color  | Meaning | Action Required |
|--------|---------|-----------------|
| 🔴 Red | Critical | Immediate attention |
| 🟡 Amber | Warning | Soon |
| 🔵 Blue | Info | Awareness |
| 🟢 Green | Success | All good |

### Destination Types
| Icon | Type | Color Theme |
|------|------|-------------|
| 🏖️ | Beach | Warm (amber/orange/rose) |
| 🏔️ | Mountain | Cool (emerald/teal/cyan) |
| 🌴 | Tropical | Green (green/emerald/teal) |
| 🛶 | Water | Blue (blue/cyan/teal) |

## 📱 Mobile Usage

On mobile devices (< 1024px width):
- All sections stack vertically
- Destination cards show one per row
- Alerts are scrollable
- Timeline is compact
- All features remain accessible

## ⌨️ Keyboard Navigation

- **Tab**: Move between interactive elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals (when implemented)

## 🔍 Common Tasks

### Check for Urgent Issues
1. Look at the Issues & Alerts section
2. Click the "Critical" tab (red)
3. Address any red alerts immediately

### Monitor Revenue
1. Check the Statistics Panel
2. Look for the trend arrow (↗ up or ↘ down)
3. Hover over chart bars for daily breakdown

### Prepare for Upcoming Departures
1. Check the Upcoming Groups Timeline
2. Look for "Today" or "Tomorrow" badges
3. Use quick action buttons to contact groups

### View All Group Details
1. Click "Detailed View" button (top right)
2. Use filters and search to find specific groups
3. Click any row to view full details

### Switch Back to Overview
1. Click "Overview" button (top right)
2. Dashboard returns to visual mode

## 🐛 Troubleshooting

### Dashboard Not Loading
- Check browser console for errors
- Ensure you're on `/agent-dashboard` route
- Refresh the page

### Cards Not Showing
- Verify data exists in `active_groups.json`
- Check that groups have valid dates
- Ensure bookings data is present

### Alerts Not Appearing
- Alerts are auto-generated based on group status
- Check group dates and booking status
- Verify alert generation logic

### Chart Not Rendering
- Ensure revenue data exists
- Check that bookings have cost values
- Verify chart container has height

## 💡 Tips & Tricks

### Efficient Workflow
1. Start with Overview mode each morning
2. Check Critical alerts first
3. Review upcoming departures
4. Monitor revenue trends
5. Switch to Detailed mode for deep work

### Alert Management
- Filter by type to focus on specific issues
- Critical alerts should be addressed within 24 hours
- Warning alerts within 48 hours
- Info alerts as time permits

### Revenue Tracking
- Current day is highlighted in the chart
- Above-average days show in lighter blue
- Below-average days show in gray
- Use trends to predict future revenue

### Timeline Usage
- Groups are sorted by departure date
- Use quick actions for fast communication
- Click "View All Groups" for complete list

## 📊 Data Refresh

Currently, data is loaded on page load. To see updates:
1. Refresh the page (F5 or Cmd+R)
2. Or navigate away and back to `/agent-dashboard`

Future versions will include:
- Real-time updates via WebSocket
- Auto-refresh every X minutes
- Manual refresh button

## 🎓 Learning Resources

### Documentation
- **Full Guide**: `AGENT_DASHBOARD_REDESIGN.md`
- **Layout Reference**: `DASHBOARD_LAYOUT_GUIDE.md`
- **Implementation Details**: `DASHBOARD_IMPLEMENTATION_SUMMARY.md`

### Video Tutorials (Coming Soon)
- Dashboard overview walkthrough
- Alert management best practices
- Revenue tracking and analysis
- Timeline and communication features

## 🆘 Getting Help

### Common Questions

**Q: How do I add a new group?**
A: Use the "Plan Trip" feature in the customer portal, or add directly to the database.

**Q: Can I customize alert rules?**
A: Not yet, but this is planned for a future update.

**Q: How do I export data?**
A: Use the Detailed View and browser print/export, or wait for the export feature.

**Q: Can I change the color scheme?**
A: Theme support is coming soon. Currently uses system theme.

**Q: How do I contact support?**
A: Check the main documentation or contact your system administrator.

## 🚀 Next Steps

1. **Explore the Dashboard**: Click around and familiarize yourself with the layout
2. **Check Alerts**: Review any critical or warning alerts
3. **Monitor Revenue**: Look at the statistics panel
4. **Review Timeline**: Check upcoming departures
5. **Try Detailed View**: Switch modes to see the table view

## 📝 Feedback

We'd love to hear your thoughts on the new dashboard:
- What features do you use most?
- What could be improved?
- What new features would you like?

Share your feedback with the development team!

---

**Happy Managing! 🎉**

The new dashboard is designed to make your job easier and more efficient. Take some time to explore all the features and find the workflow that works best for you.
