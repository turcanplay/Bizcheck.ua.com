"""Admin service — business logic for admin dashboard statistics."""

from models.user import User
from models.block import Block
from models.question import Question
from models.result import Result
from models.submission import Submission


def get_stats():
    """
    Get dashboard statistics: total users, total attempts, avg scores per block.

    Returns:
        Dict with total_users, total_results, total_questions, avg_per_block.
    """
    return {
        "total_users": User.count(),
        "total_blocks": Block.count(),
        "total_questions": Question.count(),
        "total_results": Result.count(),
        "total_submissions": Submission.count(),
        "avg_per_block": _serialize_decimals(Result.avg_score_per_block()),
    }


def get_users_with_scores():
    """
    Get all users with their aggregated quiz scores.

    Returns:
        List of user dicts with total_attempts and avg_score.
    """
    users = Result.users_with_scores()
    return _serialize_decimals(users)


def _serialize_decimals(data):
    """Convert Decimal values to float for JSON serialization."""
    if isinstance(data, list):
        return [_serialize_decimals(item) for item in data]
    if isinstance(data, dict):
        return {
            k: float(v) if hasattr(v, "as_tuple") else (str(v) if hasattr(v, "isoformat") else v)
            for k, v in data.items()
        }
    return data
