from rest_framework import generics, permissions

from .models import SessionOffering
from .serializers import SessionOfferingSerializer


class SessionOfferingListView(generics.ListAPIView):
    """GET /api/v1/catalog/session-offerings/?group=true - Faz 4 (Frontend
    Yapılandırması planı), uzmanın grup seansı oluşturma formunun (ve
    ileride paket satın alma ekranlarının) tek veri kaynağı. ?group=true
    verilirse sadece requires_multi_participant=True olanlar döner."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SessionOfferingSerializer

    def get_queryset(self):
        qs = SessionOffering.objects.filter(is_active=True).prefetch_related('variants')
        if self.request.query_params.get('group') == 'true':
            qs = qs.filter(requires_multi_participant=True)
        return qs
