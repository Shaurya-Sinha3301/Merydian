# Agent System Testing & Rate Limiting

## Rate Limiting Implementation

The Gemini API free tier allows **2 requests per minute (RPM)**. To prevent 429 TooManyRequests errors, we've implemented automatic rate limiting in both LLM-powered agents.

### How It Works

Both `feedback_agent.py` and `explainability_agent.py` now include:

```python
self.last_request_time = 0
self.min_request_interval = 30  # 30 seconds between requests (2 RPM)

# Before each API call:
time_since_last = time.time() - self.last_request_time
if time_since_last < self.min_request_interval:
    wait_time = self.min_request_interval - time_since_last
    logger.info(f"Rate limiting: waiting {wait_time:.1f}s before API call...")
    time.sleep(wait_time)
```

This ensures:
- ✅ Maximum 2 requests per minute (complies with free tier)
- ✅ Automatic wait time calculation
- ✅ Clear logging of wait times
- ✅ No manual intervention needed

### Demo Scenario Impact

With the demo's 4 scenarios:
- Each scenario makes 2 API calls (Feedback + Explainability)
- Total: 8 API calls
- With rate limiting: ~4 minutes total runtime
- **Without rate limiting**: 429 errors after 2 requests ❌

### Adjusting Rate Limits

To change the rate limit (e.g., for paid tier):

```python
# In feedback_agent.py and explainability_agent.py
self.min_request_interval = 1  # For 60 RPM
# OR
self.min_request_interval = 0.1  # For 600 RPM
```

### For Production

For production with higher quotas:
1. Upgrade to paid tier
2. Adjust `min_request_interval` in both agent files
3. Or remove rate limiting entirely if using enterprise quotas

---

## Test Output Configuration

### New Folder Structure

```
agents/
└── tests/
    ├── run_20260201_013600/
    │   ├── optimized_solution.json
    │   ├── decision_traces.json
    │   └── enriched_diffs.json
    ├── run_20260201_140530/
    │   └── ...
    └── ...
```

### How It Works

The `optimizer_agent.py` now:
1. Creates timestamped subdirectories for each run
2. Saves all optimizer outputs there
3. Logs the exact save location

```python
# In optimizer_agent.py
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
run_dir = self.output_dir / f"run_{timestamp}"
run_dir.mkdir(exist_ok=True)
```

### Benefits

- ✅ Each agent run is preserved
- ✅ Easy to compare different optimization results
- ✅ Timestamped for tracking
- ✅ Won't overwrite previous results
- ✅ Clear separation from ml_or test data

---

## Testing Instructions

### Running Demo with API Key

```bash
# Make sure your API key is in .env
python run_demo.py
```

**Expected behavior**:
- First scenario: Immediate execution
- Scenario 2-4: 30-second waits between API calls
- Total runtime: ~2-4 minutes
- No 429 errors ✅

### Running in Demo Mode (No API)

Set in `.env`:
```env
GEMINI_API_KEY=your_api_key_here
```

- Instant execution
- No rate limits needed
- Perfect for development

### Monitoring API Usage

Check your usage at: https://aistudio.google.com/app/apikey

Free tier limits:
- **2 RPM** (Requests Per Minute)
- **1,500 RPD** (Requests Per Day)

---

## Output Verification

After running the demo, check:

```bash
ls agents/tests/
```

You should see timestamped folders with optimizer outputs.

---

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `feedback_agent.py` | Added rate limiting (30s interval) | Prevent 429 errors |
| `explainability_agent.py` | Added rate limiting (30s interval) | Prevent 429 errors |
| `optimizer_agent.py` | Save to `agents/tests/run_*/` | Organized test outputs |
| `agents/tests/` | Created directory | Storage for optimizer outputs |

**Result**: System now respects API limits and organizes outputs properly! ✅
