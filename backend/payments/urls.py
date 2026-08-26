from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    path('appointments/<int:appointment_id>/checkout/', views.AppointmentCheckoutView.as_view(), name='appointment_checkout'),
    path('callback/', views.checkout_callback, name='checkout_callback'),
]
