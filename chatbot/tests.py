from unittest.mock import patch

import httpx
from django.test import TestCase
from rest_framework import status


class ChatEndpointTests(TestCase):
    @patch("chatbot.views.get_course_recommendation")
    def test_chat_returns_answer_json(self, recommend):
        recommend.return_value = "Consider MSc Data Science."

        response = self.client.post(
            "/api/chat/",
            {"question": "I want to become a data scientist."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.json(),
            {"answer": "Consider MSc Data Science."},
        )

    @patch("chatbot.views.get_course_recommendation")
    def test_timeout_returns_safe_error_json_and_logs_details(self, recommend):
        recommend.side_effect = TimeoutError("provider deadline")

        with self.assertLogs("chatbot.views", level="ERROR") as captured:
            response = self.client.post(
                "/api/chat/",
                {"question": "Recommend a course."},
                content_type="application/json",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_504_GATEWAY_TIMEOUT,
        )
        self.assertEqual(
            response.json(),
            {
                "error": (
                    "The AI service took too long to respond. "
                    "Please try again."
                )
            },
        )
        self.assertIn("provider deadline", captured.output[0])
        self.assertNotIn("provider deadline", response.json()["error"])

    def test_empty_question_returns_error_json(self):
        response = self.client.post(
            "/api/chat/",
            {"question": "  "},
            content_type="application/json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            response.json(),
            {"error": "Please enter a question."},
        )

    @patch("chatbot.views.get_course_recommendation")
    def test_network_failure_returns_safe_error_json(self, recommend):
        recommend.side_effect = httpx.ConnectError(
            "provider connection details",
            request=httpx.Request("POST", "https://example.test"),
        )

        with self.assertLogs("chatbot.views", level="ERROR"):
            response = self.client.post(
                "/api/chat/",
                {"question": "Recommend a course."},
                content_type="application/json",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_502_BAD_GATEWAY,
        )
        self.assertEqual(
            response.json(),
            {
                "error": (
                    "Could not connect to the AI service. "
                    "Please try again shortly."
                )
            },
        )
        self.assertNotIn(
            "provider connection details",
            response.json()["error"],
        )
