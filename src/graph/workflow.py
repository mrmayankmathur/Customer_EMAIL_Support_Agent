"""
LangGraph workflow definition for the Customer Support Email Agent.

Flow:
    classify → retrieve → respond → check_escalation
                                           │
                                ┌──────────┴──────────┐
                             escalate              send_reply
                             (→ END)                   │
                                                check_follow_up
                                                       │
                                                      END
"""

from langgraph.graph import END, StateGraph

from src.nodes.classifier import classify_email
from src.nodes.escalation import check_escalation
from src.nodes.follow_up import check_follow_up
from src.nodes.responder import generate_response
from src.nodes.retriever import retrieve_context
from src.nodes.send_reply import send_email_reply
from src.schemas.state import SupportState


def should_escalate(state: SupportState) -> str:
    """Conditional edge: route to escalation (human review) or auto-send."""
    return "escalate" if state.needs_escalation else "send_reply"


def build_graph() -> StateGraph:
    """
    Construct and compile the support agent graph.

    The graph implements the full pipeline:
    1. Classify the email intent
    2. Retrieve relevant knowledge base context
    3. Generate a draft response
    4. Check if human review is needed
       - If yes: end (awaits human approval via API)
       - If no: send the reply automatically
    5. Check if a follow-up should be scheduled
    """
    graph = StateGraph(SupportState)

    # -- Add nodes --
    graph.add_node("classify", classify_email)
    graph.add_node("retrieve", retrieve_context)
    graph.add_node("respond", generate_response)
    graph.add_node("check_escalation", check_escalation)
    graph.add_node("send_reply", send_email_reply)
    graph.add_node("check_follow_up", check_follow_up)

    # -- Define edges --
    graph.set_entry_point("classify")
    graph.add_edge("classify", "retrieve")
    graph.add_edge("retrieve", "respond")
    graph.add_edge("respond", "check_escalation")

    # Conditional: escalate → END (human review), or auto-send
    graph.add_conditional_edges(
        "check_escalation",
        should_escalate,
        {
            "escalate": END,  # Stops here; human reviews via API
            "send_reply": "send_reply",
        },
    )

    # After sending, check for follow-up
    graph.add_edge("send_reply", "check_follow_up")
    graph.add_edge("check_follow_up", END)

    return graph.compile()


# Pre-built compiled graph instance
workflow = build_graph()
