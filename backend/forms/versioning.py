"""
Form versiyonlama servisi.

Bir Form zaten cevaplanmışsa (>=1 FormResponse), admin panelinden yapılan
düzenlemeler orijinal Form/Question/QuestionOption satırlarını DEĞİL, onların
yeni bir kopyasını (bir üst versiyonu) etkilemelidir - böylece geçmiş
FormResponse/Answer kayıtları hangi soruya/seçeneğe FK verdiyse, o satırlar
donmuş kalır ve sonradan asla mutasyona uğramaz.

Kullanım noktaları: forms/admin.py (VersionForkAdminMixin).
"""
import logging

from django.db import transaction

logger = logging.getLogger(__name__)


def form_has_responses(form) -> bool:
    return form.responses.exists()


def get_latest_version(form):
    """Verilen formla aynı group_key'e sahip en yüksek versiyon numaralı satırı döner."""
    from .models import Form
    return Form.objects.filter(group_key=form.group_key).order_by('-version').first()


def is_latest_version(form) -> bool:
    return get_latest_version(form).pk == form.pk


@transaction.atomic
def fork_form_version(form):
    """Formun grubunu kilitleyip (select_for_update; Postgres'te gerçek satır
    kilidi, SQLite'ta no-op ama SQLite zaten tek-yazarlı olduğu için dev
    ortamında sorun yaratmaz) güncel versiyonu TEKRAR okur - böylece iki
    eşzamanlı çağrı aynı formu iki kez forklayamaz (ikincisi kilidi
    bekledikten sonra artık forklanmış, cevapsız yeni versiyonu görür ve
    hiçbir şey yapmadan onu döner).

    Hâlâ cevabı varsa Form + tüm Question'ları + her Question'ın tüm
    Option'larını yeni PK'larla derin kopyalar, eski versiyonu
    is_active=False yapar, yeni versiyonu is_active=True olarak döner.

    Returns:
        (Form, dict) - yeni (veya zaten güncel/cevapsız) Form ve
        {'questions': {eski_pk: yeni_pk}, 'options': {eski_pk: yeni_pk}}
        şeklinde bir id_map (fork gerçekleşmediyse id_map boştur).
    """
    from .models import Form, Question, QuestionOption

    locked_latest = (
        Form.objects.select_for_update()
        .filter(group_key=form.group_key)
        .order_by('-version')
        .first()
    )

    if not form_has_responses(locked_latest):
        return locked_latest, {}

    old_questions = list(locked_latest.questions.all().prefetch_related('options'))

    # Yeni satırı is_active=True olarak eklemeden ÖNCE eskisini False'a çekmek
    # zorunludur: forms_form_one_active_per_group kısmi unique constraint'i
    # aynı group_key için aynı anda iki is_active=True satıra izin vermiyor -
    # sıra tersine çevrilirse INSERT anında IntegrityError alınır. İkisi de
    # aynı atomic blokta olduğu için ara adımda hata olursa transaction zaten
    # tamamen geri alınır, "grupta hiç aktif versiyon kalmadı" riski yok.
    locked_latest.is_active = False
    locked_latest.save(update_fields=['is_active'])

    new_form = Form.objects.create(
        # ÖNEMLİ: group_key elle set ediliyor. model_to_dict() gibi genel
        # kopyalama yardımcıları editable=False alanları (group_key tam
        # olarak budur) sessizce atlar - bu satır yanlışlıkla o kalıba
        # taşınırsa yeni form farkında olmadan kendi grubundan kopar.
        group_key=locked_latest.group_key,
        version=locked_latest.version + 1,
        title=locked_latest.title,
        description=locked_latest.description,
        is_active=True,
        instructions=locked_latest.instructions,
        disclaimer=locked_latest.disclaimer,
        stage=locked_latest.stage,
        max_score=locked_latest.max_score,
        min_score=locked_latest.min_score,
        scoring_type=locked_latest.scoring_type,
    )

    question_map = {}
    option_map = {}
    for q in old_questions:
        new_q = Question.objects.create(
            form=new_form,
            question_text=q.question_text,
            question_type=q.question_type,
            order=q.order,
            is_required=q.is_required,
            score_weight=q.score_weight,
            min_scale_value=q.min_scale_value,
            max_scale_value=q.max_scale_value,
            scale_labels=q.scale_labels,
        )
        question_map[q.id] = new_q.id

        for opt in q.options.all():
            new_opt = QuestionOption.objects.create(
                question=new_q,
                option_text=opt.option_text,
                order=opt.order,
                score_value=opt.score_value,
                is_correct=opt.is_correct,
            )
            option_map[opt.id] = new_opt.id

    # next_question self-referansını ikinci geçişte düzelt. Formun kendi
    # sorularının dışına işaret eden next_question değerleri (versiyonlamadan
    # bağımsız, var olan bir veri tutarlılığı hatası - next_question hiçbir
    # queryset kısıtı olmadan tanımlı) sessizce taşınmaz, loglanıp None
    # bırakılır.
    for q in old_questions:
        if q.next_question_id:
            if q.next_question_id in question_map:
                Question.objects.filter(pk=question_map[q.id]).update(
                    next_question_id=question_map[q.next_question_id]
                )
            else:
                logger.warning(
                    "fork_form_version: Question %s next_question formun dışına "
                    "işaret ediyor (next_question_id=%s), yeni versiyonda None bırakıldı.",
                    q.id, q.next_question_id,
                )

    return new_form, {'questions': question_map, 'options': option_map}
