from datetime import datetime, timedelta
import requests
from django.conf import settings
from base64 import b64encode


def get_zoom_access_token():
    """Get Zoom API access token"""
    auth = b64encode(f"{settings.ZOOM_CLIENT_ID}:{settings.ZOOM_CLIENT_SECRET}".encode()).decode()

    response = requests.post(
        url="https://zoom.us/oauth/token",
        params={"grant_type": "account_credentials", "account_id": settings.ZOOM_ACCOUNT_ID},
        headers={"Authorization": f"Basic {auth}"}
    )

    response.raise_for_status()
    return response.json()["access_token"]


def create_zoom_meeting(topic, start_time=None, duration=45):
    """Create a new Zoom meeting"""
    access_token = get_zoom_access_token()

    if start_time is None:
        start_time = datetime.utcnow() + timedelta(minutes=5)

    zoom_payload = {
        "topic": topic,
        "type": 2,  # scheduled meeting
        "start_time": start_time.isoformat() + "Z",
        "duration": duration,
        "timezone": "Europe/Istanbul",
        "settings": {
            "join_before_host": False,
            "waiting_room": True
        }
    }

    response = requests.post(
        url="https://api.zoom.us/v2/users/me/meetings",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json=zoom_payload
    )

    response.raise_for_status()
    return response.json()  # içinde start_url ve join_url var


def create_mock_zoom_meeting(appointment_id):
    """Production dışı ortamlarda gerçek Zoom API'si çağrılmadan kullanılan
    placeholder toplantı bilgisi. Geçerli bir https://zoom.us/j/... formatında
    URL döner (literal "mock url" string'i yerine) — frontend window.open() ile
    doğrudan açtığında React Router'ın kendi 404 sayfasına düşmez, gerçek
    Zoom sitesine gider."""
    meeting_id = str(appointment_id).zfill(10)
    join_url = f"https://zoom.us/j/{meeting_id}"
    return {
        "start_url": join_url,
        "join_url": join_url,
        "id": meeting_id,
    } 