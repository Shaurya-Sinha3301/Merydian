"""
FeedbackProcessor — Explainability-Based Itinerary Change Orchestrator

Replaces the missing stub. Orchestrates:
  1. run_optimizer()      — runs the CP-SAT ItineraryOptimizer on a baseline + preferences
  2. process_feedback()   — runs the full explainability pipeline on two itinerary versions
                            and calls an LLM (Gemini → Groq fallback) to generate human-
                            readable per-POI change explanations.

Pipeline (process_feedback):
    DiffEngine → CausalTagger → DeltaEngine → PayloadBuilder → LLM
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
#  LLM helper
# ---------------------------------------------------------------------------

def _call_llm(prompt: str) -> str:
    """
    Call Gemini (preferred) falling back to Groq.
    Returns the model's text response, or an empty string on failure.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    groq_key   = os.environ.get("GROQ_API_KEY", "")

    # --- Gemini ---
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            # Try latest model first, fall back to 1.5-flash
            for model_name in ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"):
                try:
                    model = genai.GenerativeModel(model_name)
                    resp = model.generate_content(prompt)
                    return resp.text.strip()
                except Exception:
                    continue
            raise RuntimeError("All Gemini models failed")
        except Exception as e:
            logger.warning("Gemini LLM call failed: %s", e)

    # --- Groq fallback ---
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.warning("Groq LLM call failed: %s", e)

    logger.warning("No LLM available — returning empty explanation")
    return ""


# ---------------------------------------------------------------------------
#  Build locations_map from itinerary JSON
# ---------------------------------------------------------------------------

def _build_locations_map(itinerary: Dict) -> Dict[str, Dict[str, Any]]:
    """
    Extract {poi_id: {name, cost}} from the itinerary's days array.
    Works with both optimizer output format (location_id) and backend format (poi_id).
    """
    locations = {}
    for day in itinerary.get("days", []):
        # Handle both top-level POIs and per-family POIs
        pois = day.get("pois", [])
        if not pois and "families" in day:
            for fam_data in day["families"].values():
                pois.extend(fam_data.get("pois", []))

        for poi in pois:
            lid = poi.get("location_id") or poi.get("poi_id") or poi.get("id")
            if lid and lid not in locations:
                locations[lid] = {
                    "name": poi.get("name", lid),
                    "cost": float(poi.get("entrance_fee") or poi.get("cost") or 0),
                }
    return locations


# ---------------------------------------------------------------------------
#  Build LLM prompt per family payload
# ---------------------------------------------------------------------------

def _build_family_prompt(payload: Dict) -> str:
    """Build a prompt that asks the LLM to explain all changes for one family."""
    changes_text = []
    for c in payload.get("changes", []):
        poi_name   = c.get("poi", {}).get("name", c.get("poi", {}).get("id", "Unknown"))
        change_type = c.get("change_type", "")
        day        = c.get("day", "?")
        tags       = c.get("causal_tags", [])
        cost_d     = c.get("cost_delta", {})
        sat_d      = c.get("satisfaction_delta", {})

        # Friendly cost string
        cost_str = ""
        if cost_d.get("extra_cost"):
            cost_str = f"+₹{cost_d['extra_cost']} extra cost"
        elif cost_d.get("saved_cost"):
            cost_str = f"-₹{cost_d['saved_cost']} saved"

        # Friendly sat string
        sat_str = ""
        if sat_d.get("gain"):
            sat_str = f"satisfaction gain +{sat_d['gain']:.1f}"
        elif sat_d.get("loss"):
            sat_str = f"satisfaction loss -{sat_d['loss']:.1f}"

        tag_descriptions = [
            payload.get("system_definitions", {}).get(t, t) for t in tags
        ]

        line = (
            f"- Day {day}: {poi_name} was {change_type.replace('_', ' ')}."
        )
        if tag_descriptions:
            line += f" Reason: {'; '.join(tag_descriptions[:2])}."
        if cost_str:
            line += f" {cost_str}."
        if sat_str:
            line += f" {sat_str}."
        changes_text.append(line)

    user_input = payload.get("user_input", "")
    user_line = f'\nThe traveller requested: "{user_input}"\n' if user_input else ""

    prompt = (
        "You are a friendly travel assistant. A family's trip itinerary has been updated.\n"
        f"{user_line}"
        "Explain each change below in 1 warm, conversational sentence. "
        "Be specific about which POI changed and why. Do not use bullet points — "
        "write a separate sentence per change, joined naturally.\n\n"
        "Changes:\n" + "\n".join(changes_text) + "\n\nExplanation:"
    )
    return prompt


# ---------------------------------------------------------------------------
#  Main class
# ---------------------------------------------------------------------------

class FeedbackProcessor:
    """
    Orchestrates itinerary optimization and explainability.

    Usage (as called by optimizer_service.py):
        processor = FeedbackProcessor()

        # Parse user text to POI IDs for constraints
        parsed = processor.parse_user_feedback("Add Akshardham", [("AKSHARDHAM", "Akshardham Temple")])

        # Initial optimization (file-based)
        result = processor.run_optimizer(
            baseline_path="...", preferences_path="...", output_dir="..."
        )

        # Explain itinerary diff
        explanation = processor.process_feedback(
            trip_id, family_id, old_itinerary, new_itinerary,
            user_message, locations_map
        )
    """

    def parse_user_feedback(self, user_message: str, available_pois: List[tuple]) -> Dict[str, List[str]]:
        """
        Use LLM to determine which POIs the user wants to add or remove.
        available_pois is a list of tuples: (location_id, name).
        Returns: {"add": ["LOC_001"], "remove": ["LOC_002"]}
        """
        if not user_message or not available_pois:
            return {"add": [], "remove": []}

        poi_list_str = "\n".join([f"- {lid}: {name}" for lid, name in available_pois])
        
        prompt = (
            "You are a routing assistant. A user wants to modify their travel itinerary.\n"
            f"User message: \"{user_message}\"\n\n"
            "Below is the list of available points of interest (POIs) with their IDs:\n"
            f"{poi_list_str}\n\n"
            "Analyze the user message and identify which POI IDs they want to add and which they want to remove.\n"
            "Return ONLY a raw JSON object with two keys: 'add' and 'remove', containing the corresponding location_ids as lists of strings.\n"
            "Example: {\"add\": [\"AKSHARDHAM\"], \"remove\": []}"
        )
        try:
            resp_text = _call_llm(prompt)
            # Find JSON block in text
            import re
            match = re.search(r'\{.*\}', resp_text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                
                # Make sure we got valid IDs, even if the LLM returned names
                def map_to_id(items: List[str]) -> List[str]:
                    valid_ids = []
                    for item in items:
                        item_up = item.upper()
                        # direct match
                        if any(lid == item for lid, _ in available_pois):
                            valid_ids.append(item)
                        else:
                            # Try to match by name
                            for lid, name in available_pois:
                                if item_up in name.upper() or name.upper() in item_up:
                                    valid_ids.append(lid)
                                    break
                    return valid_ids

                return {
                    "add": map_to_id(parsed.get("add", [])),
                    "remove": map_to_id(parsed.get("remove", []))
                }
        except Exception as e:
            logger.warning("FeedbackProcessor.parse_user_feedback failed: %s", e)
        
        return {"add": [], "remove": []}

    def run_optimizer(
        self,
        baseline_path: str,
        preferences_path: str,
        output_dir: str,
    ) -> Dict[str, Any]:
        """
        Run the CP-SAT ItineraryOptimizer on the given baseline + preferences files.

        Returns a dict with:
          - optimized_itinerary: dict (or None if failed)
          - optimizer_ran: bool
          - output_path: str
        """
        try:
            # ItineraryOptimizer expects its data files via constructor params.
            # We point families file → preferences_path, base_itinerary → baseline_path.
            # Other data files are resolved relative to ml_or/data/ (standard layout).
            ml_or_root = Path(__file__).parent.parent.parent  # ml_or/
            data_dir   = ml_or_root / "data"

            # Step 0: Run HotelSkeletonOptimizer to produce a fresh backbone
            # (hotel assignments, skeleton routes, restaurant selections)
            from ml_or.hotel_optimizer import HotelSkeletonOptimizer

            backbone_path = Path(output_dir) / "optimized_backbone.json"
            logger.info("Running HotelSkeletonOptimizer (Step 0)...")
            hotel_opt = HotelSkeletonOptimizer(
                locations_file=str(data_dir / "locations.json"),
                hotels_file=str(data_dir / "hotels.json"),
                base_itinerary_file=baseline_path,
                family_prefs_file=preferences_path,
            )
            hotel_result = hotel_opt.optimize(output_file=str(backbone_path))
            if hotel_result:
                logger.info("HotelSkeletonOptimizer completed — backbone saved to %s", backbone_path)
            else:
                logger.warning("HotelSkeletonOptimizer returned no solution, using empty backbone")
                # Create empty backbone so ItineraryOptimizer doesn't crash
                backbone_path.parent.mkdir(parents=True, exist_ok=True)
                with open(backbone_path, "w") as bf:
                    json.dump({"hotel_assignments": {}, "skeleton_routes": {}, "daily_restaurants": {}}, bf)

            # Step 1: Run ItineraryOptimizer with the fresh backbone
            from ml_or.itinerary_optimizer import ItineraryOptimizer

            optimizer = ItineraryOptimizer(
                locations_file=str(data_dir / "locations.json"),
                hotels_file=str(data_dir / "hotels.json"),
                transport_file=str(data_dir / "transport_graph.json"),
                base_itinerary_file=baseline_path,
                family_prefs_file=preferences_path,
                optimized_backbone_file=str(backbone_path),
            )

            result = optimizer.optimize_trip()  # full multi-family, multi-day solve
            output_path = Path(output_dir) / "optimized_itinerary.json"
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w") as f:
                json.dump(result, f, indent=2)

            logger.info("FeedbackProcessor.run_optimizer: wrote %s", output_path)
            return {
                "optimized_itinerary": result,
                "optimizer_ran": True,
                "output_path": str(output_path),
            }

        except Exception as e:
            logger.error("FeedbackProcessor.run_optimizer failed: %s", e)
            return {"optimized_itinerary": None, "optimizer_ran": False, "output_path": None}

    def process_feedback(
        self,
        trip_id: str,
        family_id: str,
        old_itinerary: Dict[str, Any],
        new_itinerary: Dict[str, Any],
        user_message: str = "",
        locations_map: Optional[Dict[str, Any]] = None,
        decision_traces: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Generate per-POI change explanations by comparing two itinerary versions.

        Args:
            trip_id:        Trip identifier
            family_id:      Primary family being explained (used for filtering)
            old_itinerary:  Previous itinerary dict ({"days": [...]})
            new_itinerary:  New/updated itinerary dict
            user_message:   The feedback message that triggered this update
            locations_map:  {poi_id: {"name": str, "cost": float}} for delta calc
            decision_traces: Optimizer decision logs ({day_idx: trace_dict}).
                             Pass {} if optimizer did not run.

        Returns:
            {
              "diffs":        enriched diff dict (family → day → [changes]),
              "payloads":     {"families": [...], "travel_agent": {...}},
              "explanations": [{"family_id", "day", "poi_id", "change_type",
                                "causal_tags", "cost_delta", "satisfaction_delta",
                                "llm_explanation"}]
            }
        """
        from ml_or.explainability.diff_engine import ItineraryDiffEngine
        from ml_or.explainability.causal_tagger import CausalTagger
        from ml_or.explainability.delta_engine import DeltaEngine
        from ml_or.explainability.payload_builder import ExplanationPayloadBuilder

        traces = decision_traces or {}

        # --- Build locations map from itinerary data if not provided ---
        if not locations_map:
            locations_map = _build_locations_map(old_itinerary)
            locations_map.update(_build_locations_map(new_itinerary))

        # Fallback: load master locations.json so POI names are always available
        try:
            master_path = Path(__file__).parent.parent.parent / "data" / "locations.json"
            if master_path.exists():
                with open(master_path, "r") as f:
                    master_locs = json.load(f)
                for loc in master_locs:
                    lid = loc.get("location_id")
                    if lid:
                        existing = locations_map.get(lid, {})
                        existing_name = existing.get("name", "")
                        # Overwrite if missing or if name is just the raw ID
                        if not existing or existing_name == lid or existing_name.startswith("LOC_"):
                            locations_map[lid] = {
                                "name": loc.get("name", lid),
                                "cost": float(loc.get("cost", 0)),
                            }
        except Exception as e:
            logger.warning("Could not load master locations.json: %s", e)

        # --- Step 1: Diff ---
        diff_engine = ItineraryDiffEngine()
        try:
            diffs = diff_engine.compare_optimized_solutions(
                baseline_optimized=old_itinerary,
                new_optimized=new_itinerary,
                decision_traces=traces,
            )
        except Exception as e:
            logger.warning("DiffEngine failed (%s), using empty diffs", e)
            diffs = {}

        if not diffs:
            logger.info("No diffs found between old and new itinerary for trip %s", trip_id)
            return {"diffs": {}, "payloads": {"families": [], "travel_agent": {}}, "explanations": []}

        # --- Step 2: Causal tagging ---
        try:
            diffs = CausalTagger().tag_changes(diffs, traces)
        except Exception as e:
            logger.warning("CausalTagger failed (%s), skipping tags", e)

        # --- Step 3: Delta computation ---
        try:
            diffs = DeltaEngine().compute_deltas(
                diffs=diffs,
                decision_traces=traces,
                locations_map=locations_map,
                baseline_solution=old_itinerary,
                new_solution=new_itinerary,
            )
        except Exception as e:
            logger.warning("DeltaEngine failed (%s), skipping deltas", e)

        # --- Step 4: Build payloads ---
        try:
            payloads = ExplanationPayloadBuilder().build_payloads(
                enriched_diffs=diffs,
                locations_map=locations_map,
                user_input=user_message,
            )
        except Exception as e:
            logger.warning("PayloadBuilder failed (%s), using empty payloads", e)
            payloads = {"families": [], "travel_agent": {}}

        # --- Step 5: LLM explanation per family ---
        explanations: List[Dict[str, Any]] = []

        for family_payload in payloads.get("families", []):
            fid = family_payload.get("family_id", family_id)
            try:
                prompt = _build_family_prompt(family_payload)
                llm_text = _call_llm(prompt)
            except Exception as e:
                logger.warning("LLM call failed for family %s: %s", fid, e)
                llm_text = ""

            # Map each change to a flat explanation record
            changes = family_payload.get("changes", [])
            for i, change in enumerate(changes):
                # Split the LLM text by sentence for per-change granularity
                sentences = [s.strip() for s in llm_text.replace("。", ".").split(".") if s.strip()]
                sentence = sentences[i] + "." if i < len(sentences) else llm_text

                explanations.append({
                    "family_id":         fid,
                    "day":               change.get("day"),
                    "poi_id":            change.get("poi", {}).get("id"),
                    "poi_name":          change.get("poi", {}).get("name"),
                    "change_type":       change.get("change_type"),
                    "causal_tags":       change.get("causal_tags", []),
                    "cost_delta":        change.get("cost_delta", {}),
                    "satisfaction_delta": change.get("satisfaction_delta", {}),
                    "llm_explanation":   sentence,
                    "raw_payload":       change,
                })

        logger.info(
            "FeedbackProcessor.process_feedback: trip=%s, %d explanations generated",
            trip_id, len(explanations)
        )
        return {
            "diffs": diffs,
            "payloads": payloads,
            "explanations": explanations,
        }
