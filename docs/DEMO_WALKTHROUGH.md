# Walkthrough: an agent handles a customer, start to finish

About 8 minutes live. It uses real accounts, not the seeded demo, so everything on screen is created in front of the audience. Run it with two browser windows side by side: the agent on the left, the customer on the right.

`demo-run/shots/` holds a numbered screenshot of every step below, taken from a real run. `python demo-run/record_walkthrough.py` repeats the whole run on its own in about five minutes and rewrites the screenshots.

## Before you start

1. Docker Desktop running (it hosts Postgres and Redis), then the API on :8000 and the app on :5173.
2. Start the API with `DEV_OUTBOX=true` and `AGENT_SIGNUP_CODE=merydian-agency`. With no email provider set, the customer's invitation is recorded rather than sent; the script reads it from there. Live, you can show it in Settings under "Messages sent to you".
3. Open the agent window at `/signup?as=agent` and the customer window at `/`.

## The story

| # | Who | What you do | What to say | Shot |
|---|---|---|---|---|
| 1 | Agent | Sign up as an agent, start the agency "Lotus Journeys" | "An agency gets its own space. Its customers, trips and numbers are private to it." | 01, 02 |
| 2 | Agent | Customers, add Priya Nair, 3 travellers, 1 child | "I add the family and Merydian emails them an invitation to choose a password. No password is ever passed around." | 03 |
| 3 | Agent | Open Priya, set a relaxed pace, nature high, save | "These saved preferences drive the optimizer for every trip I plan for them." | 04 |
| 4 | Agent | Plan a trip, build the first plan, Approve and publish | "The optimizer builds three days from their preferences in seconds. Nothing reaches the family until I approve it: a person is in the loop." | 05, 06, 07 |
| 5 | Customer | Open the invitation, choose a password, sign in | "Priya lands straight on her plan: a timetable, photos, a real map." | 08, 09 |
| 6 | Customer | Feedback, "Ask for a specific place", pick Sarojini Nagar Market | "She wants one more stop. This does not change her plan; it asks me." | 10 |
| 7 | Agent | Point at the toast and the bell on the agent window | "I am told the moment it happens. No refresh. It travels over Redis pub/sub." | 11, 12 |
| 8 | Agent | Desk, compare the two options, Accept | "The optimizer has already checked it fits. I see the change, the cost difference (+₹668) and the fit, and I choose. I could decline and the plan stays as it is." | 13, 14 |
| 9 | Customer | Open the bell | "She is told her plan changed. Version 2 is published." | 15 |
| 10 | Customer | Feedback, type it in her own words (a young child, shorter days, something outdoors) | "She can also just say what she wants. An AI agent reads it, turns it into constraints and the optimizer re-plans." | 16, 17 |
| 11 | Customer | See what changed and why | "Every change is struck through or added, with a reason in plain words, and what it did to cost and fit." | 18 |
| 12 | Agent | The trip's Bookings tab: record Hotel Lalit, confirm. Notes tab: add a task | "I record what I booked; Priya sees it. Tasks and notes are private to my agency." | 19, 20, 21, 22 |
| 13 | Agent | Insights, then Agents | "Business view: value, acceptance rate, time to decide. The Agents tab shows the AI agents, their reliability and the optimizer's benchmark: 144 ms median over 10,000 simulated scenarios." | 23, 24 |

## Questions you may get

- **Is it all AI?** No. The plan comes from a constraint solver (OR-Tools CP-SAT). The language model only reads the customer's message and writes the explanations. People approve every change that needs a decision.
- **Where does the 144 ms come from?** An offline benchmark of 10,000 simulated trips, kept in `backend/scripts/benchmark`. The live feedback run takes longer (about 30 to 40 seconds) because it includes the language model.
- **Can several families share a trip?** Yes. Pick several customers when planning. The Group tab shows what is shared and what each family branched on, plus shared expenses and a checklist.
- **Does it send real email and texts?** The code does, once SMTP or Twilio details are set. Without them messages are recorded, never lost.
- **Can another system plug in?** Signed webhooks for events and personal API keys, both in the app.

## Things to know before you present

- **Delhi only, three days.** Plans are always three days, because that is what the optimizer's baseline holds.
- **Free-text re-plans can be noisy.** The optimizer re-solves the whole plan, so a message like "shorter days" can move many stops and even raise the cost slightly. If you want a calm story, lean on the specific-place request (steps 6 to 9), where one stop is added and the trade-off is clear. The explanation text is written by the language model and can occasionally name a place oddly.
- **Booking is a record**, not a supplier booking. Say so if asked.
- **Free hosting sleeps.** On Render's free tier the first request after a pause can take up to a minute. Open the app a few minutes before you present.
