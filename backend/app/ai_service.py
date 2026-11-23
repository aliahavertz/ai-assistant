
import os
import time
import logging

from google import genai
from google.genai import errors


logger = logging.getLogger(__name__)


# ==================================
# GEMINI CONFIGURATION
# ==================================

API_KEY = os.getenv("GEMINI_API_KEY")

MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.8-flash"
)


# ==================================
# CREATE GEMINI CLIENT
# ==================================

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured")

client = genai.Client(api_key=API_KEY)


# ==================================
# GENERATE AI RESPONSE
# ==================================

def generate_ai_response(prompt: str) -> str:

    max_retries = 3

    for attempt in range(max_retries):

        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )

            if not response.text:
                raise RuntimeError(
                    "Gemini returned an empty response"
                )

            return response.text

        except errors.APIError as error:

            if error.code in (429, 500, 503) and attempt < max_retries - 1:

                wait_time = 2 ** (attempt + 1)

                logger.warning(
                    "Gemini API temporarily unavailable. "
                    "Retrying in %s seconds. Attempt %s/%s",
                    wait_time,
                    attempt + 1,
                    max_retries
                )

                time.sleep(wait_time)

            else:
                raise

    raise RuntimeError(
        "Gemini failed after multiple retry attempts"
    )
