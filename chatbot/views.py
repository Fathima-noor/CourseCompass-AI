
import csv
import logging
from pathlib import Path

import httpx

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from course_rag import (
    get_all_courses,
    get_course_recommendation,
)


logger = logging.getLogger(__name__)

CSV_PATH = Path(settings.BASE_DIR) / "courses.csv"


@api_view(["GET"])
def course_list(request):
    """Return all courses to the Angular frontend."""

    try:
        courses = get_all_courses()

        return Response(
            courses,
            status=status.HTTP_200_OK,
        )

    except Exception:
        logger.exception("Failed to load course dataset.")

        return Response(
            {"error": "Unable to load courses. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def chat(request):
    """Receive a question and return an AI-generated answer."""

    question = request.data.get("question", "")

    if not isinstance(question, str) or not question.strip():
        return Response(
            {"error": "Please enter a question."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        answer = get_course_recommendation(question)

        if not isinstance(answer, str):
            logger.error("The AI returned a non-text answer.")

            return Response(
                {"error": "The AI returned an invalid response."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"answer": answer},
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Course recommendation request failed.")

        provider_code = getattr(exc, "code", None)
        if provider_code == 504 or isinstance(
            exc,
            (TimeoutError, httpx.TimeoutException),
        ):
            return Response(
                {
                    "error": (
                        "The AI service took too long to respond. "
                        "Please try again."
                    )
                },
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        if provider_code == 429:
            return Response(
                {
                    "error": (
                        "The AI service is busy. "
                        "Please try again in a moment."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if provider_code in (401, 403):
            return Response(
                {
                    "error": (
                        "The AI service is not available. "
                        "Please contact the administrator."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if provider_code == 404:
            return Response(
                {
                    "error": (
                        "The configured AI model is unavailable. "
                        "Please contact the administrator."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if isinstance(exc, httpx.RequestError):
            error_message = (
                "Could not connect to the AI service. "
                "Please try again shortly."
            )
        else:
            error_message = (
                "The AI service could not complete your request. "
                "Please try again."
            )

        return Response(
            {"error": error_message},
            status=status.HTTP_502_BAD_GATEWAY,
        )
