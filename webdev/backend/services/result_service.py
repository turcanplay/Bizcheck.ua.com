"""Result service — business logic for saving and retrieving quiz results."""

from models.result import Result


def save_result(user_id, block_id, score, total_questions):
    """
    Save a user's quiz result for a specific block.

    Args:
        user_id: The authenticated user's ID.
        block_id: The block the result belongs to.
        score: Number of correct answers.
        total_questions: Total questions in the block.

    Returns:
        The created result dict.

    Raises:
        ValueError: If score exceeds total_questions.
    """
    if score < 0 or score > total_questions:
        raise ValueError("Score must be between 0 and total_questions")
    if total_questions <= 0:
        raise ValueError("total_questions must be positive")

    result = Result.create(user_id, block_id, score, total_questions)
    result["completed_at"] = str(result["completed_at"])
    return result


def get_user_results(user_id):
    """
    Get all quiz results for the current user.

    Args:
        user_id: The authenticated user's ID.

    Returns:
        List of result dicts ordered by completion date.
    """
    results = Result.find_by_user(user_id)
    for r in results:
        r["completed_at"] = str(r["completed_at"])
    return results


def get_all_results():
    """
    Get all quiz results across all users (admin view).

    Returns:
        List of result dicts with user info.
    """
    results = Result.find_all()
    for r in results:
        r["completed_at"] = str(r["completed_at"])
    return results
