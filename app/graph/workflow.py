"""
Verdicts AI - LangGraph Workflow Orchestrator.
Constructs and compiles the multi-agent cyclic graph.
"""

from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from app.graph.state import VerdictState
from app.graph.nodes import (
    discover_node,
    deduplicate_node,
    research_node,
    writer_node,
    seo_node,
    image_node,
    quality_node,
    revision_node,
    publisher_node,
)
from app.utils.logging import logger


def route_after_deduplication(state: VerdictState) -> str:
    """Routes to END if topic/news is duplicate, else proceeds to research."""
    if state.get("is_duplicate", False):
        return END
    return "research_node"


def route_after_quality(state: VerdictState) -> str:
    """
    Quality gate conditional router:
    - If passed (score >= 8.0) -> publisher_node
    - If failed but revision_count < max_revisions -> revision_node
    - If revisions exhausted -> publisher_node (saves with IN_REVIEW status)
    """
    evaluation = state.get("evaluation", {})
    passed = evaluation.get("passed", False)
    rev_count = state.get("revision_count", 0)
    max_rev = state.get("max_revisions", 2)

    if passed:
        logger.info(f"[Workflow] Quality score {evaluation.get('overall_score')}/10 PASSED. Proceeding to publisher.")
        return "publisher_node"
    
    if rev_count < max_rev:
        logger.info(f"[Workflow] Score {evaluation.get('overall_score')}/10 below threshold. Routing to revision ({rev_count + 1}/{max_rev}).")
        return "revision_node"

    logger.warning(f"[Workflow] Max revisions reached. Routing to publisher for Admin Review.")
    return "publisher_node"


def build_verdicts_graph():
    """Builds and compiles the complete LangGraph state machine."""
    workflow = StateGraph(VerdictState)

    # Register Nodes
    workflow.add_node("discover_node", discover_node)
    workflow.add_node("deduplicate_node", deduplicate_node)
    workflow.add_node("research_node", research_node)
    workflow.add_node("writer_node", writer_node)
    workflow.add_node("seo_node", seo_node)
    workflow.add_node("image_node", image_node)
    workflow.add_node("quality_node", quality_node)
    workflow.add_node("revision_node", revision_node)
    workflow.add_node("publisher_node", publisher_node)

    # Add Edges
    workflow.add_edge(START, "discover_node")
    workflow.add_edge("discover_node", "deduplicate_node")

    workflow.add_conditional_edges(
        "deduplicate_node",
        route_after_deduplication,
        {"research_node": "research_node", END: END}
    )

    workflow.add_edge("research_node", "writer_node")
    workflow.add_edge("writer_node", "seo_node")
    workflow.add_edge("seo_node", "image_node")
    workflow.add_edge("image_node", "quality_node")

    workflow.add_conditional_edges(
        "quality_node",
        route_after_quality,
        {"publisher_node": "publisher_node", "revision_node": "revision_node"}
    )

    workflow.add_edge("revision_node", "quality_node")
    workflow.add_edge("publisher_node", END)

    return workflow.compile()


async def run_verdict_pipeline(
    topic_name: Optional[str] = None,
    target_jurisdiction: Optional[str] = None,
    target_category: Optional[str] = None,
    article_type: str = "VERDICT_BRIEF",
    news_angle: Optional[str] = None,
    max_revisions: int = 2
) -> Dict[str, Any]:
    """Entrypoint to execute the compiled LangGraph pipeline."""
    graph = build_verdicts_graph()

    initial_state: VerdictState = {
        "article_type": article_type,
        "news_angle": news_angle,
        "max_revisions": max_revisions,
        "revision_count": 0,
        "errors": []
    }

    if topic_name:
        initial_state["topic"] = {
            "name": topic_name,
            "category": target_category or "Constitutional & Democratic Law",
            "jurisdiction": target_jurisdiction or "United States",
            "court_name": "Apex Court",
            "case_citation": "Standard Law Citation",
            "article_type": article_type,
        }
    else:
        if target_jurisdiction:
            initial_state["target_jurisdiction"] = target_jurisdiction
        if target_category:
            initial_state["target_category"] = target_category

    logger.info(f"Triggering Verdicts AI LangGraph Pipeline: type={article_type}, topic={topic_name or 'Auto-Discovery'}")
    result = await graph.ainvoke(initial_state)
    return result
