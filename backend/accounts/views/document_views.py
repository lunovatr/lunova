# accounts/views/document_views.py
import uuid
from accounts.serializers.document_serializers import DocumentSerializer
from accounts.models import Document, DocumentType
from accounts.storage import storage
from rest_framework.generics import ListCreateAPIView, DestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status


permission_classes = [IsAuthenticated]

class DocumentListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSerializer

    def get_queryset(self):
        return Document.objects.filter(
            user=self.request.user,
            is_current=True
        )

    def get_serializer_context(self):
        return {"request": self.request}


class DocumentPresignUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Frontend buradan presigned upload URL alır.
        Dosya backend'e gelmez.
        """
        doc_type = request.data.get("type")

        if not all([doc_type]):
            return Response(
                {"detail": "type zorunludur."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # bu kontrolü hem burada, hem de dosya finalize ederken yapıyoruz
        count = Document.objects.filter(user=request.user, type=doc_type, is_current=True).count()
        if count >= 3 and doc_type != DocumentType.PROFILE_PHOTO:
            return Response(
                {"detail": f"Aynı tipte ({doc_type}) en fazla 3 dosya yükleyebilirsiniz."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Belge tipi kontrolü
        valid_types = [c[0] for c in DocumentType.choices]
        if doc_type not in valid_types:
            return Response(
                {"detail": "Geçersiz belge tipi."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # UID backend tarafından üretilir
        uid = uuid.uuid4()

        # file_key backend tarafından belirlenir
        role_path = "experts" if request.user.role == "expert" else "clients"
        file_key = f"{role_path}/{request.user.id}/{doc_type}/{uid}"

        presigned = storage.presign_upload(
            key=file_key
        )

        return Response({
            "uid": str(uid),
            "file_key": file_key,
            "upload": presigned
        })
        

class DocumentDeleteView(DestroyAPIView):
    lookup_field = "uid"
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Document.objects.filter(
            user=self.request.user,
            is_current=True
        )
    
    def perform_destroy(self, instance):
        """"Silme" burada bir DEACTIVATE - dosya storage'dan hiç kaldırılmıyor,
        sadece is_current=False'a çekiliyor (kullanıcının kendi belge
        listesinden ve profil yanıtından kaybolur, bkz. get_queryset() /
        profileSerializers.py, ama admin panelinde is_current=Pasif olarak
        görünmeye ve yeniden aktifleştirilmeye devam eder). `status` (onay/red
        kararı) buna dokunulmadan korunur - admin geçmişi görebilir, istenirse
        yeniden aktifleştirebilir.

        Onaylanmış belgeler ÖNCEDEN burada engelleniyordu (kullanıcı talebiyle
        21. turda kaldırıldı) - o kısıtlama "silme" gerçek/geri dönüşsüz bir
        DELETE olduğu döneme aitti; artık geri alınabilir bir deactivate
        olduğu için gerekçesi kalmadı."""
        if instance.is_primary:
            raise ValidationError("Birincil belge silinemez.")

        instance.is_current = False
        instance.is_primary = False
        instance.save(update_fields=["is_current", "is_primary", "updated_at"])
