import requests
from django.conf import settings

def verify_recaptcha(token):
    payload = {
        "secret": settings.RECAPTCHA_SECRET_KEY,
        "response": token
    }

    response = requests.post(
        "https://www.google.com/recaptcha/api/siteverify",
        data=payload,
        timeout=5
    )

    result = response.json()
    return result.get("success", False)
