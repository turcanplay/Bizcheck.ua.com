"""Submission service — business logic for quiz submissions."""
import json
from models.submission import Submission
from models.test import Test


def create_submission(first_name, last_name, email, phone, consent, test_id=None, test_slug=None):
    """Create a partial submission. Contact info is now collected after the quiz,
    so all personal fields are optional at creation time.

    Either test_id or test_slug identifies the test. test_id takes priority.
    """
    resolved_test_id = None
    if test_id is not None:
        if not Test.find_by_id(test_id):
            raise ValueError("Test not found")
        resolved_test_id = test_id
    elif test_slug:
        t = Test.find_by_slug(test_slug)
        if not t:
            raise ValueError("Test not found")
        resolved_test_id = t["id"]

    sub = Submission.create(first_name, last_name, email, phone, consent, test_id=resolved_test_id)
    sub["created_at"] = str(sub["created_at"])
    return sub


def update_submission(submission_id, data):
    """Update a submission with partial data (company info, answers, scores, status)."""
    existing = Submission.find_by_id(submission_id)
    if not existing:
        raise ValueError("Submission not found")

    # Convert answers dict/list to JSON string if provided
    if "answers_json" in data and not isinstance(data["answers_json"], str):
        data["answers_json"] = json.dumps(data["answers_json"])
    if "block_scores_json" in data and not isinstance(data["block_scores_json"], str):
        data["block_scores_json"] = json.dumps(data["block_scores_json"])
    if "selected_answers_json" in data and not isinstance(data["selected_answers_json"], str):
        data["selected_answers_json"] = json.dumps(data["selected_answers_json"])

    sub = Submission.update(submission_id, **data)
    sub["created_at"] = str(sub["created_at"])
    return sub


def save_submission_pdf(submission_id, pdf_bytes):
    existing = Submission.find_by_id(submission_id)
    if not existing:
        raise ValueError("Submission not found")
    Submission.save_pdf(submission_id, pdf_bytes)


def get_all_submissions(test_id=None):
    subs = Submission.find_all(test_id=test_id)
    for s in subs:
        s["created_at"] = str(s["created_at"])
    return subs


def get_submission_detail(submission_id):
    """Get a single submission with full details including answers."""
    sub = Submission.find_by_id(submission_id)
    if not sub:
        raise ValueError("Submission not found")
    sub["created_at"] = str(sub["created_at"])
    return sub


def delete_submission(submission_id):
    """Delete a single submission."""
    existing = Submission.find_by_id(submission_id)
    if not existing:
        raise ValueError("Submission not found")
    Submission.delete(submission_id)


def delete_all_submissions():
    """Delete all submissions."""
    Submission.delete_all()


def get_submission_pdf(submission_id):
    pdf = Submission.get_pdf(submission_id)
    if not pdf:
        raise ValueError("PDF not found")
    return pdf
