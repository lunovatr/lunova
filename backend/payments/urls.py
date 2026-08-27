from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    path('appointments/<int:appointment_id>/checkout/', views.AppointmentCheckoutView.as_view(), name='appointment_checkout'),
    path('appointments/<int:appointment_id>/confirm-free-trial/', views.AppointmentFreeTrialConfirmView.as_view(), name='appointment_confirm_free_trial'),
    path('free-trial-eligibility/', views.FreeTrialEligibilityView.as_view(), name='free_trial_eligibility'),
    path('callback/', views.checkout_callback, name='checkout_callback'),
]
