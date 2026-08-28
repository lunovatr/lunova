from django.urls import path

from . import views

app_name = 'catalog'

urlpatterns = [
    path('session-offerings/', views.SessionOfferingListView.as_view(), name='session_offering_list'),
]
