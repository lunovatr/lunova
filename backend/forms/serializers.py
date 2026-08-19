from rest_framework import serializers
from .models import Form, Question, QuestionOption, FormResponse, Answer


class FormMinimalSerializer(serializers.ModelSerializer):
    """Client-safe minimal form info."""

    class Meta:
        model = Form
        fields = ['id', 'title', 'stage']


class FormResponseClientSummarySerializer(serializers.ModelSerializer):
    """Client view for a submitted form response.

    NOTE: Does not expose answers or scoring/interpretation fields.
    """

    form = FormMinimalSerializer(read_only=True)

    class Meta:
        model = FormResponse
        fields = ['id', 'form', 'submitted_at']


class FormResponseExpertSummarySerializer(serializers.ModelSerializer):
    """Expert view for a client's form response summary - includes scoring information."""

    form = FormMinimalSerializer(read_only=True)

    class Meta:
        model = FormResponse
        fields = ['id', 'form', 'submitted_at', 'total_score', 'risk_level', 'percentage_score']


class AnswerDetailSerializer(serializers.Serializer):
    """Cevap detayları için serializer"""
    question_id = serializers.IntegerField()
    question_text = serializers.CharField()
    question_type = serializers.CharField()
    text_answer = serializers.CharField(required=False, allow_blank=True)
    numeric_answer = serializers.FloatField(required=False, allow_null=True)
    selected_options = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )


class FormListSerializer(serializers.ModelSerializer):
    """Form listesi için kısa serializer"""

    has_responded = serializers.SerializerMethodField()

    class Meta:
        model = Form
        fields = [
            'id', 'version', 'title', 'description', 'is_active', 'created_at',
            'updated_at', 'instructions', 'disclaimer', 'stage', 'max_score',
            'min_score', 'scoring_type', 'has_responded',
        ]

    def get_has_responded(self, obj):
        """İstek yapan kullanıcı bu form (bu spesifik versiyon) için zaten
        cevap göndermiş mi? Grup bazlı değil, tam form satırı bazlı - yeni bir
        versiyon açıldığında bilinçli olarak 'doldurulmamış' sayılsın diye
        (kullanıcı kararı, bkz. forms/versioning.py)."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return FormResponse.objects.filter(form=obj, user=request.user).exists()


class FormResponseClientDetailSerializer(serializers.ModelSerializer):
    """Client için detaylı form response serializer - tüm cevapları içerir"""
    form = FormMinimalSerializer(read_only=True)
    questions = serializers.SerializerMethodField()
    answers = serializers.SerializerMethodField()

    class Meta:
        model = FormResponse
        fields = ['id', 'form', 'submitted_at', 'questions', 'answers']

    def get_questions(self, obj):
        """Formun tüm sorularını getir - Client için scoring/ağırlık bilgileri olmadan"""
        questions = obj.form.questions.all().prefetch_related('options').order_by('order')
        question_data = []
        for question in questions:
            q_data = {
                'id': question.id,
                'question_text': question.question_text,
                'question_type': question.question_type,
                'order': question.order,
                'is_required': question.is_required,
                'options': [
                    {
                        'id': opt.id,
                        'option_text': opt.option_text,
                        'order': opt.order
                    }
                    for opt in question.options.all().order_by('order')
                ]
            }
            
            # Scale soruları için sadece min/max değerleri (scoring için değil, görüntüleme için)
            if question.question_type == 'scale':
                q_data['min_scale_value'] = question.min_scale_value
                q_data['max_scale_value'] = question.max_scale_value
                q_data['scale_labels'] = question.scale_labels
            
            question_data.append(q_data)
        
        return question_data

    def get_answers(self, obj):
        """Client'ın verdiği tüm cevapları getir"""
        answers = []
        for answer in obj.answers.all().select_related('question').prefetch_related('selected_options'):
            answer_data = {
                'question_id': answer.question.id,
                'question_text': answer.question.question_text,
                'question_type': answer.question.question_type,
            }
            
            if answer.text_answer:
                answer_data['text_answer'] = answer.text_answer
            
            if answer.numeric_answer is not None:
                answer_data['numeric_answer'] = answer.numeric_answer
            
            if answer.selected_options.exists():
                answer_data['selected_options'] = [
                    {'id': opt.id, 'text': opt.option_text, 'order': opt.order}
                    for opt in answer.selected_options.all().order_by('order')
                ]
            
            answers.append(answer_data)
        
        return answers


class FormResponseExpertDetailSerializer(serializers.ModelSerializer):
    """Expert için detaylı form response serializer - cevaplar + scoring + interpretation + recommendations"""
    form = FormListSerializer(read_only=True)
    questions = serializers.SerializerMethodField()
    answers = serializers.SerializerMethodField()
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = FormResponse
        fields = [
            'id', 'form', 'submitted_at', 'total_score', 'risk_level', 
            'percentage_score', 'interpretation', 'recommendations',
            'questions', 'answers', 'user_info'
        ]

    def get_questions(self, obj):
        """Formun tüm sorularını getir (expert için daha detaylı - score_weight, min/max scale değerleri dahil)"""
        questions = obj.form.questions.all().prefetch_related('options').order_by('order')
        question_data = []
        for question in questions:
            q_data = {
                'id': question.id,
                'question_text': question.question_text,
                'question_type': question.question_type,
                'order': question.order,
                'is_required': question.is_required,
                'score_weight': question.score_weight,
                'options': [
                    {
                        'id': opt.id,
                        'option_text': opt.option_text,
                        'order': opt.order,
                        'score_value': opt.score_value,
                        'is_correct': opt.is_correct
                    }
                    for opt in question.options.all().order_by('order')
                ]
            }
            
            # Scale soruları için ek bilgiler
            if question.question_type == 'scale':
                q_data['min_scale_value'] = question.min_scale_value
                q_data['max_scale_value'] = question.max_scale_value
                q_data['scale_labels'] = question.scale_labels
            
            question_data.append(q_data)
        
        return question_data

    def get_answers(self, obj):
        """Client'ın verdiği tüm cevapları ve scoring bilgilerini getir"""
        answers = []
        for answer in obj.answers.all().select_related('question').prefetch_related('selected_options'):
            answer_data = {
                'question_id': answer.question.id,
                'question_text': answer.question.question_text,
                'question_type': answer.question.question_type,
                'answer_score': answer.answer_score,
            }
            
            if answer.text_answer:
                answer_data['text_answer'] = answer.text_answer
            
            if answer.numeric_answer is not None:
                answer_data['numeric_answer'] = answer.numeric_answer
            
            if answer.selected_options.exists():
                answer_data['selected_options'] = [
                    {
                        'id': opt.id, 
                        'text': opt.option_text, 
                        'order': opt.order,
                        'score_value': opt.score_value,
                        'is_correct': opt.is_correct
                    }
                    for opt in answer.selected_options.all().order_by('order')
                ]
            
            answers.append(answer_data)
        
        return answers

    def get_user_info(self, obj):
        """Client kullanıcı bilgilerini getir"""
        user = obj.user
        return {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.get_full_name(),
        }


class QuestionOptionSerializer(serializers.ModelSerializer):
    """Soru seçenekleri için serializer"""
    
    class Meta:
        model = QuestionOption
        fields = ['id', 'option_text', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    """Sorular için serializer - seçenekleri de içerir"""
    options = QuestionOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'order', 'is_required', 'options']


class FormSerializer(serializers.ModelSerializer):
    """Form detayları için serializer - soruları da içerir"""
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Form
        fields = ['id', 'title', 'description', 'is_active', 'created_at', 'questions']


class AnswerSubmitSerializer(serializers.Serializer):
    """Form cevaplarını göndermek için serializer"""
    question_id = serializers.IntegerField()
    text_answer = serializers.CharField(required=False, allow_blank=True)
    numeric_answer = serializers.FloatField(required=False, allow_null=True)
    selected_option_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    def validate(self, data):
        """Cevap tipine göre validasyon - question_type'ın TÜM gerçek
        seçeneklerini (Question.QUESTION_TYPES) kapsar. Önceden sadece
        'text' ve var olmayan bir 'test' tipiyle 'multiple_choice' kontrol
        ediliyordu; yes_no/single_choice/scale/number/date/textarea hiç
        doğrulanmıyordu."""
        question_id = data.get('question_id')
        text_answer = data.get('text_answer')
        numeric_answer = data.get('numeric_answer')
        selected_option_ids = data.get('selected_option_ids', [])

        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            raise serializers.ValidationError(f"Question with id {question_id} does not exist")

        q_type = question.question_type

        if q_type in ('text', 'textarea', 'date'):
            if not text_answer or text_answer.strip() == '':
                raise serializers.ValidationError(f"Text answer is required for {q_type} questions")
            if selected_option_ids:
                raise serializers.ValidationError(f"{q_type} questions cannot have selected options")

        elif q_type in ('yes_no', 'single_choice', 'multiple_choice'):
            if not selected_option_ids:
                raise serializers.ValidationError("Selected options are required for choice questions")
            if q_type in ('yes_no', 'single_choice') and len(selected_option_ids) != 1:
                raise serializers.ValidationError(f"{q_type} questions require exactly one selected option")
            if text_answer:
                raise serializers.ValidationError("Choice questions cannot have text answers")

            # Seçilen seçeneklerin bu soruya ait olduğunu kontrol et
            valid_option_ids = set(question.options.values_list('id', flat=True))
            for option_id in selected_option_ids:
                if option_id not in valid_option_ids:
                    raise serializers.ValidationError(f"Invalid option id: {option_id}")

        elif q_type in ('scale', 'number'):
            if numeric_answer is None:
                raise serializers.ValidationError(f"Numeric answer is required for {q_type} questions")
            if selected_option_ids:
                raise serializers.ValidationError(f"{q_type} questions cannot have selected options")
            if q_type == 'scale' and not (question.min_scale_value <= numeric_answer <= question.max_scale_value):
                raise serializers.ValidationError(
                    f"Scale answer must be between {question.min_scale_value} and {question.max_scale_value}"
                )

        return data


class FormSubmitSerializer(serializers.Serializer):
    """Form gönderimi için serializer"""
    form_id = serializers.IntegerField()
    answers = AnswerSubmitSerializer(many=True)
    
    def validate(self, data):
        """Form ve cevaplar için validasyon"""
        form_id = data.get('form_id')
        answers = data.get('answers', [])
        
        try:
            form = Form.objects.get(id=form_id, is_active=True)
        except Form.DoesNotExist:
            raise serializers.ValidationError(f"Active form with id {form_id} does not exist")
        
        # Formun zorunlu sorularının cevaplanıp cevaplanmadığını kontrol et
        required_questions = form.questions.filter(is_required=True)
        answered_question_ids = [answer['question_id'] for answer in answers]
        
        for question in required_questions:
            if question.id not in answered_question_ids:
                raise serializers.ValidationError(f"Required question {question.id} is not answered")
        
        # Her soru için sadece bir cevap olmalı
        question_ids = [answer['question_id'] for answer in answers]
        if len(question_ids) != len(set(question_ids)):
            raise serializers.ValidationError("Duplicate question answers are not allowed")
        
        return data


class FormResponseSerializer(serializers.ModelSerializer):
    """Form cevaplarını görüntülemek için serializer"""
    form = FormListSerializer(read_only=True)
    answers = serializers.SerializerMethodField()
    
    class Meta:
        model = FormResponse
        fields = ['id', 'form', 'submitted_at', 'answers']
    
    def get_answers(self, obj):
        """Cevap detaylarını getir"""
        answers = []
        for answer in obj.answers.all():
            answer_data = {
                'question_id': answer.question.id,
                'question_text': answer.question.question_text,
                'question_type': answer.question.question_type,
            }
            
            if answer.text_answer:
                answer_data['text_answer'] = answer.text_answer
            elif answer.selected_options.exists():
                answer_data['selected_options'] = [
                    {'id': opt.id, 'text': opt.option_text} 
                    for opt in answer.selected_options.all()
                ]
            
            answers.append(answer_data)
        
        return answers


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = '__all__'
