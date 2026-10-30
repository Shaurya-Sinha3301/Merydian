"""
A full agent-handles-a-customer run on the real (non-demo) flow, recorded as two videos
(the agent's screen and the customer's screen) plus numbered screenshots.

Run:  python demo-run/record_walkthrough.py [--video]   (app on :5173, API on :8000, DEV_OUTBOX=true)
"""
import pathlib
import re
import time
import uuid

import requests
from playwright.sync_api import sync_playwright

APP = "http://localhost:5173"
API = "http://127.0.0.1:8000/api/v1"
OUT = pathlib.Path(__file__).parent
SHOTS = OUT / "shots"
VIDEOS = OUT / "videos"
SHOTS.mkdir(exist_ok=True)
VIDEOS.mkdir(exist_ok=True)
for old in list(SHOTS.glob("*.png")) + list(VIDEOS.glob("*.webm")):
    old.unlink()

s = uuid.uuid4().hex[:4]
AGENT_EMAIL = f"meera.iyer.{s}@lotusjourneys.example"
CUSTOMER_EMAIL = f"priya.nair.{s}@example.com"
STEP = [0]
WITH_VIDEO = "--video" in __import__("sys").argv  # needs Playwright's ffmpeg: `playwright install ffmpeg`

CURSOR = """
document.addEventListener('DOMContentLoaded', () => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;z-index:2147483647;width:22px;height:22px;border:3px solid #c4231a;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);left:-50px;top:-50px;background:rgba(196,35,26,.15)';
  document.body.appendChild(d);
  addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
});
"""


def beat(pg, ms=900):
    pg.wait_for_timeout(ms)


def shot(pg, label):
    STEP[0] += 1
    pg.screenshot(path=str(SHOTS / f"{STEP[0]:02d}-{label}.png"))
    print(f"  [{STEP[0]:02d}] {label}")


def tap(pg, selector, **kw):
    loc = pg.locator(selector).first
    loc.wait_for(state="visible", timeout=kw.pop("timeout", 30000))
    box = loc.bounding_box()
    if box:
        pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=18)
    beat(pg, 250)
    loc.click(**kw)


def type_into(pg, selector, text, delay=28):
    loc = pg.locator(selector).first
    loc.wait_for(state="visible", timeout=30000)
    box = loc.bounding_box()
    if box:
        pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=14)
    loc.click()
    loc.fill("")
    loc.type(text, delay=delay)


def invite_token(to):
    for _ in range(40):
        msgs = requests.get(f"{API}/dev/outbox", params={"to": to}).json()["messages"]
        for m in msgs:
            if m["kind"] == "invite":
                return re.search(r"token=([\w\-]+)", m["body"]).group(1)
        time.sleep(0.5)
    raise RuntimeError("the invitation email never arrived")


with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    size = {"width": 1280, "height": 760}

    def context(name):
        extra = {"record_video_dir": str(VIDEOS / name), "record_video_size": size} if WITH_VIDEO else {}
        ctx = browser.new_context(viewport=size, reduced_motion="reduce", **extra)
        ctx.add_init_script(CURSOR)
        return ctx

    agent_ctx, cust_ctx = context("agent"), context("customer")
    ag, cu = agent_ctx.new_page(), cust_ctx.new_page()

    # ------------------------------------------------------------------ 1. the agent signs up
    print("1. The agent starts an agency")
    ag.goto(f"{APP}/signup?as=agent", wait_until="networkidle")
    beat(ag, 1200)
    type_into(ag, "#name", "Meera Iyer")
    type_into(ag, "#email", AGENT_EMAIL)
    type_into(ag, "#password", "walkthrough-pass-1")
    type_into(ag, "#code", "merydian-agency")
    type_into(ag, "#agency", "Lotus Journeys")
    shot(ag, "agent-signup-form")
    tap(ag, "button[type=submit]")
    try:
        ag.wait_for_url("**/app/overview", timeout=8000)
    except Exception:
        # the agency name is taken from an earlier take: add a marker and go again
        type_into(ag, "#agency", f"Lotus Journeys {s}")
        tap(ag, "button[type=submit]")
        ag.wait_for_url("**/app/overview")
    beat(ag, 1500)
    shot(ag, "agent-overview-empty")

    # ------------------------------------------------------------------ 2. the customer arrives
    print("2. A new customer is added and invited")
    tap(ag, "a:has-text('Customers')")
    ag.wait_for_selector("text=Add a customer")
    type_into(ag, "#c-email", CUSTOMER_EMAIL)
    type_into(ag, "#c-name", "Priya Nair")
    ag.fill("#c-members", "3")
    ag.fill("#c-children", "1")
    beat(ag, 600)
    tap(ag, "button:has-text('Add customer')")
    ag.wait_for_selector("text=emailed them an invitation")
    beat(ag, 1500)
    shot(ag, "agent-customer-invited")

    # ------------------------------------------------------------------ 3. preferences
    print("3. The agent sets what the family likes")
    tap(ag, "a:has-text('Priya Nair')")
    ag.wait_for_selector("text=Saved preferences")
    beat(ag, 1200)
    tap(ag, "button:has-text('Relaxed')")
    for label, value in (("Nature", 85), ("History", 45)):
        slider = ag.locator(f"label:has(span:text-is('{label.lower()}')) input[type=range], label:has(span:has-text('{label}')) input[type=range]").first
        slider.evaluate("(el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }", value)
    beat(ag, 800)
    tap(ag, "button:has-text('Save preferences')")
    ag.wait_for_selector("text=Saved.")
    shot(ag, "agent-preferences-saved")

    # ------------------------------------------------------------------ 4. the first plan
    print("4. The agent builds and approves the first plan")
    tap(ag, "a:has-text('Plan a trip')")
    ag.wait_for_selector("text=Customers on this trip")
    beat(ag, 1000)
    type_into(ag, "#trip-name", "Nair family Delhi break")
    shot(ag, "agent-new-trip-form")
    tap(ag, "button[type=submit]")
    ag.wait_for_selector("text=First plan ready", timeout=240000)
    beat(ag, 1200)
    shot(ag, "agent-first-plan-ready")
    tap(ag, "button:has-text('Approve and publish')")
    ag.wait_for_selector("text=Approved", timeout=30000)
    beat(ag, 1000)
    tap(ag, "text=Open the trip")
    ag.wait_for_url("**/app/trip/**")
    ag.wait_for_selector("text=Day 1")
    beat(ag, 1500)
    shot(ag, "agent-trip-plan")
    trip_url = ag.url

    # ------------------------------------------------------------------ 5. the customer opens the invitation
    print("5. The customer accepts the invitation")
    token = invite_token(CUSTOMER_EMAIL)
    cu.goto(f"{APP}/reset?token={token}&invite=1", wait_until="networkidle")
    cu.wait_for_selector("text=Hello, Priya Nair")
    beat(cu, 1200)
    type_into(cu, "#password", "priya-pass-2026")
    type_into(cu, "#again", "priya-pass-2026")
    shot(cu, "customer-invitation")
    tap(cu, "button:has-text('Set password and continue')")
    cu.wait_for_url("**/login", timeout=15000)
    type_into(cu, "#email", CUSTOMER_EMAIL)
    type_into(cu, "#password", "priya-pass-2026")
    tap(cu, "button[type=submit]")
    cu.wait_for_url("**/app/trip/**", timeout=30000)
    cu.wait_for_selector("text=Day 1")
    beat(cu, 2000)
    shot(cu, "customer-sees-plan")
    customer_trip = cu.url

    # the agent keeps working on the overview while the customer acts
    ag.goto(f"{APP}/app/overview", wait_until="networkidle")
    beat(ag, 1500)

    # ------------------------------------------------------------------ 7. a specific place
    print("7. The customer asks for a specific place; the agent is told live")
    tap(cu, "a:has-text('Feedback')")
    cu.wait_for_selector("text=Ask for a specific place")
    asked = None
    options = [o for o in cu.locator("select[aria-label=Place] option").evaluate_all("els => els.map(e => e.value)") if o]
    print("   places not in the plan:", options)
    agent_token = ag.evaluate("localStorage.getItem('token')")
    AH = {"Authorization": f"Bearer {agent_token}"}
    for place in options[:6]:
        cu.select_option("select[aria-label=Place]", place)
        type_into(cu, "input[aria-label='Why you want it']", "Shopping for gifts")
        tap(cu, "button:has-text('Send to my agent')")
        try:
            cu.wait_for_selector("text=/is with your travel agent|could not fit/", timeout=90000)
        except Exception:
            pass
        if not cu.locator("text=is with your travel agent").count():
            print("   could not fit:", place)
            cu.reload(wait_until="networkidle")
            cu.wait_for_selector("text=Ask for a specific place")
            continue
        # a tidy story reads best: prefer a request that changes only a few stops
        pending = [d for d in requests.get(f"{API}/agent/decisions?status=pending", headers=AH).json()["decisions"] if (d["trip_name"] or "") == "Nair family Delhi break"]
        changes = max((len(o["details"].get("schedule_changes") or []) for d in pending for o in d["options"]), default=0)
        print(f"   {place}: {changes} stop changes")
        if changes <= 3 or place == options[:6][-1]:
            asked = place
            break
        requests.post(f"{API}/agent/itinerary/reject", headers=AH, json={"event_id": pending[0]["event_id"], "reason": "too disruptive for the take"})
        cu.reload(wait_until="networkidle")
        cu.wait_for_selector("text=Ask for a specific place")
    assert asked, "none of the candidate places could be requested"
    print("   asked for:", asked)
    beat(cu, 1000)
    shot(cu, "customer-asked-for-a-place")

    # the agent's screen shows the toast and the bell
    ag.wait_for_selector(f"text=Request: add {asked}", timeout=30000)
    beat(ag, 1500)
    shot(ag, "agent-live-notification")
    tap(ag, "button[aria-label^=Notifications]")
    beat(ag, 1500)
    shot(ag, "agent-bell")

    # ------------------------------------------------------------------ 8. the decision
    print("8. The agent decides")
    ag.keyboard.press("Escape")
    tap(ag, "nav[aria-label='Agent'] >> text=Desk")
    ag.wait_for_selector("text=Options against the current plan")
    tap(ag, "nav[aria-label=Requests] button:has-text('Nair family Delhi break')")
    ag.wait_for_selector(f"text=Add {asked}", timeout=20000)
    beat(ag, 1800)
    shot(ag, "agent-desk-decision")
    tap(ag, "button:has-text('Accept:')")
    ag.wait_for_selector("text=Accepted", timeout=30000)
    beat(ag, 2000)
    shot(ag, "agent-accepted")

    # ------------------------------------------------------------------ 9. the customer sees it
    print("9. The customer sees the result")
    cu.goto(customer_trip, wait_until="networkidle")
    cu.wait_for_selector("text=Day 1")
    beat(cu, 1500)
    cu.wait_for_selector("button[aria-label^=Notifications]")
    tap(cu, "button[aria-label^=Notifications]")
    beat(cu, 1800)
    shot(cu, "customer-notified")
    cu.keyboard.press("Escape")

    # ------------------------------------------------------------------ 6. the customer asks for changes
    print("9b. The customer says it in her own words")
    tap(cu, "a:has-text('Feedback')")
    cu.wait_for_selector("text=What would you")
    beat(cu, 800)
    type_into(cu, "#feedback", "We have a young child and get tired quickly. Can we keep the days shorter and add something outdoors?", delay=22)
    shot(cu, "customer-feedback-typed")
    tap(cu, "button:has-text('Send to the planner')")
    cu.wait_for_selector("text=See what changed and why", timeout=240000)
    beat(cu, 1500)
    shot(cu, "customer-replanned")
    tap(cu, "a:has-text('See what changed and why')")
    cu.wait_for_selector("text=/Version [0-9]+ to version [0-9]+/", timeout=30000)
    beat(cu, 2000)
    shot(cu, "customer-what-changed")

    # ------------------------------------------------------------------ 10. bookings and follow-ups
    print("10. The agent records a booking and a follow-up")
    ag.goto(trip_url.rstrip("/") + "/bookings", wait_until="networkidle")
    ag.wait_for_selector("text=Record a booking")
    beat(ag, 1000)
    tap(ag, "button:has-text('Hotel')")
    type_into(ag, "#b-title", "Hotel Lalit, 3 nights")
    type_into(ag, "#b-supplier", "The Lalit New Delhi")
    type_into(ag, "#b-ref", "LL-48213")
    type_into(ag, "#b-amount", "27600")
    shot(ag, "agent-booking-form")
    tap(ag, "button:has-text('Add booking')")
    ag.wait_for_selector("text=Hotel Lalit, 3 nights")
    beat(ag, 1000)
    tap(ag, "button:has-text('Confirm')")
    ag.wait_for_selector("text=Confirmed", timeout=15000)
    beat(ag, 1200)
    shot(ag, "agent-booking-confirmed")
    tap(ag, "a:has-text('Notes')")
    ag.wait_for_selector("text=Notes and tasks")
    type_into(ag, "textarea[aria-label=Text]", "Ask Priya whether the child needs a cot")
    ag.fill("input[type=date]", "2026-11-10")
    tap(ag, "button:has-text('Add task')")
    ag.wait_for_selector("text=needs a cot")
    beat(ag, 1200)
    shot(ag, "agent-task-added")

    # the customer's side of the booking
    cu.goto(customer_trip + "/bookings", wait_until="networkidle")
    cu.wait_for_selector("text=Hotel Lalit, 3 nights")
    beat(cu, 1800)
    shot(cu, "customer-sees-booking")

    # ------------------------------------------------------------------ 11. the business view
    print("11. The agent steps back and looks at the business")
    tap(ag, "a:has-text('Insights')") if ag.locator("a:has-text('Insights')").count() else ag.goto(f"{APP}/app/insights")
    ag.wait_for_selector("text=Trip performance", timeout=30000)
    beat(ag, 2500)
    shot(ag, "agent-insights")
    ag.goto(f"{APP}/app/agents", wait_until="networkidle")
    ag.wait_for_selector("text=Optimizer engine")
    beat(ag, 2500)
    shot(ag, "agent-agents-tab")

    agent_ctx.close()
    cust_ctx.close()
    browser.close()

for name in ("agent", "customer"):
    vids = sorted((VIDEOS / name).glob("*.webm"))
    if vids:
        target = VIDEOS / f"{name}.webm"
        vids[-1].replace(target)
        print("video:", target)
print("done; screenshots in", SHOTS)
