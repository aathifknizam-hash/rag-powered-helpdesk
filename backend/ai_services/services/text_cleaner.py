# ai_services/services/text_cleaner.py

import re


def clean_text(text):

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()