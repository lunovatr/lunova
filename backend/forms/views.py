from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from accounts.models import UserRole, ClientProfile, ExpertProfile
from .models import Form, FormResponse, Answer, Question, QuestionOption
from .serializers import (
    FormSerializer,
    FormListSerializer,
    FormSubmitSerializer,
    QuestionSerializer,
    QuestionOptionSerializer,
    FormResponseClientSummarySerializer,
    FormResponseExpertSummarySerializer,
    FormResponseClientDetailSerializer,
    FormResponseExpertDetailSerializer,
)

# --------------------------------------------------
# Public / authenticated
# --------------------------------------------------

class FormListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            forms = Form.objects.all()
        else:
            forms = Form.objects.filter(is_active=True)

        serializer = FormListSerializer(forms, many=True, context={"request": request})
        return Response(serializer.data)


class FormDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, form_id):
        form = get_object_or_404(Form, id=form_id, is_active=True)
        has_responded = FormResponse.objects.filter(
            form=form, user=request.user
        ).exists()

        data = FormSerializer(form).data
        data["has_responded"] = has_responded

        questions = Question.objects.filter(form=form)
        q_data = QuestionSerializer(questions, many=True).data

        for q in q_data:
            options_qs = QuestionOption.objects.filter(question_id=q["id"])
            options = QuestionOptionSerializer(options_qs, many=True).data
            q_type = q.get("question_type")

            if q_type in {"single_choice", "multiple_choice", "test"}:
                q["options"] = options

            elif q_type == "yes_no":
                q["options"] = options or [
                    {"value": 1, "text": "Evet"},
                    {"value": 0, "text": "Hayır"},
                ]

            elif q_type == "scale":
                q["options"] = [
                    {
                        "type": "scale",
                        "min": q.get("min_scale_value", 0),
                        "max": q.get("max_scale_value", 4),
                        "step": 1,
                    }
                ]

            elif q_type == "number":
                q["options"] = [{"type": "number"}]

            elif q_type == "date":
                q["options"] = [{"type": "date", "format": "YYYY-MM-DD"}]

            elif q_type == "textarea":
                q["options"] = [{"type": "textarea"}]

            else:
                q["options"] = [{"type": "text"}]

        data["questions"] = q_data
        return Response(data)

# --------------------------------------------------
# Client
# --------------------------------------------------

class FormSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FormSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        form_id = serializer.validated_data["form_id"]
        answers = serializer.validated_data["answers"]

        if FormResponse.objects.filter(form_id=form_id, user=request.user).exists():
            return Response(
                {"detail": "Bu form zaten dolduruldu."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_obj = FormResponse.objects.create(
            form_id=form_id, user=request.user
        )

        total_score = 0.0
        for a in answers:
            answer = Answer.objects.create(
                form_response=response_obj,
                question_id=a["question_id"],
                text_answer=a.get("text_answer", ""),
                numeric_answer=a.get("numeric_answer"),
            )
            if a.get("selected_option_ids"):
                answer.selected_options.set(a["selected_option_ids"])
            # calculate_score() seçilen seçeneklerin puanlarını okuduğu için
            # selected_options.set() SONRASINDA çağrılmalı.
            total_score += answer.calculate_score()
            answer.save(update_fields=["answer_score"])

        # FormResponse ilk oluşturulduğunda total_score henüz 0.0 (model
        # varsayılanı) olduğu için save() içindeki risk_level/percentage_score
        # hesaplaması o an anlamsız bir sonuç üretmişti - cevaplar puanlandıktan
        # SONRA gerçek toplamla tekrar save() çağırmak zorunlu.
        response_obj.total_score = total_score
        response_obj.save()

        return Response(
            {"response_id": response_obj.id},
            status=status.HTTP_201_CREATED,
        )


class UserResponsesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != UserRole.CLIENT:
            return Response(status=status.HTTP_403_FORBIDDEN)

        responses = FormResponse.objects.filter(user=request.user)
        serializer = FormResponseClientSummarySerializer(responses, many=True)
        return Response(serializer.data)


class UserResponseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, response_id):
        if request.user.role != UserRole.CLIENT:
            return Response(status=status.HTTP_403_FORBIDDEN)

        response_obj = get_object_or_404(
            FormResponse, id=response_id, user=request.user
        )
        # Client kullanıcılar için detaylı serializer - tüm cevapları içerir
        serializer = FormResponseClientDetailSerializer(response_obj)
        return Response(serializer.data)

# --------------------------------------------------
# Expert
# --------------------------------------------------

class FormClientResponsesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        if request.user.role != UserRole.EXPERT:
            return Response(status=status.HTTP_403_FORBIDDEN)

        expert = get_object_or_404(ExpertProfile, user=request.user)

        # client_id her zaman User.id'dir (bkz. accounts.ClientListView ve
        # expert/src/features/client-forms/api.ts - tek gerçek çağıran taraf
        # her zaman user_id gönderiyor). Önceden burada "önce ClientProfile.id
        # olarak dene, olmazsa User.id'ye düş" şeklinde belirsiz bir sıralı
        # deneme vardı - User.id, TAMAMEN ALAKASIZ bir ClientProfile'ın kendi
        # PK'sıyla sayısal olarak çakışırsa (iki ayrı auto-increment dizisi,
        # gerçekten olabiliyor) bu, yanlış danışanın profiline sessizce
        # eşleşmeye yol açıyordu - en iyi ihtimalle yanlış bir 403, en kötü
        # ihtimalle (çakışan profil AYNI uzmana aitse) yanlış danışanın
        # verisini doğru danışanmış gibi döndürmek. `get_object_or_404` ile
        # doğrudan `user_id` üzerinden aramak bu belirsizliği ortadan kaldırır.
        client_profile = get_object_or_404(ClientProfile, user_id=client_id)

        # Expert kontrolü: sadece bu danışana gerçekten atanmış uzman erişebilir.
        # (Önceden client_profile.expert None olduğunda -yani danışana henüz
        # kimse atanmamışken- HERHANGİ bir uzman erişebiliyordu - düzeltildi.)
        if client_profile.expert != expert:
            return Response(
                {"detail": "Bu danışana erişim yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )

        responses = FormResponse.objects.filter(user_id=client_id)
        serializer = FormResponseExpertSummarySerializer(responses, many=True)
        return Response(serializer.data)


class FormClientResponseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id, response_id):
        if request.user.role != UserRole.EXPERT:
            return Response(status=status.HTTP_403_FORBIDDEN)

        expert = get_object_or_404(ExpertProfile, user=request.user)

        # client_id her zaman User.id'dir - bkz. FormClientResponsesView'daki
        # aynı düzeltmenin gerekçesi (üstteki yorum).
        client_profile = get_object_or_404(ClientProfile, user_id=client_id)

        # Expert kontrolü: sadece bu danışana gerçekten atanmış uzman erişebilir.
        # (Önceden client_profile.expert None olduğunda -yani danışana henüz
        # kimse atanmamışken- HERHANGİ bir uzman erişebiliyordu - düzeltildi.)
        if client_profile.expert != expert:
            return Response(
                {"detail": "Bu danışana erişim yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )

        response_obj = get_object_or_404(
            FormResponse, id=response_id, user_id=client_id
        )
        # Expert kullanıcılar için detaylı serializer - cevaplar + scoring + interpretation + recommendations
        serializer = FormResponseExpertDetailSerializer(response_obj)
        return Response(serializer.data)
