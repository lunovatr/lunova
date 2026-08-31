from django.urls import path, include

urlpatterns = [
    path('accounts/', include('accounts.urls')),
    path('zoom/', include('zoom.urls')),
    path('appointments/', include('appointments.urls')),
    path('forms/', include('forms.urls')),
    path('availability/', include('availability.urls')),
    path('notifications/', include('notifications.urls')),
    path('messaging/', include('messaging.urls')),
    path('payments/', include('payments.urls')),
    path('catalog/', include('catalog.urls')),
]
