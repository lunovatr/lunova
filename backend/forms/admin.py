from django.contrib import admin, messages
from django.contrib.admin.utils import unquote
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import Form, Question, QuestionOption, FormResponse, Answer, RiskLevelMapping
from .versioning import form_has_responses, get_latest_version, fork_form_version

# --------------------------------------------------
# Versiyonlama yardımcıları
# --------------------------------------------------


def _root_form_of(obj, kind: str) -> Form:
    if kind == 'form':
        return obj
    if kind == 'question':
        return obj.form
    if kind == 'option':
        return obj.question.form
    raise ValueError(kind)


def _directly_editable(obj, kind: str) -> bool:
    """Sadece grubun EN GÜNCEL versiyonu VE hiç cevabı yoksa True döner.
    Eski (stale) bir versiyon, cevap sayısından bağımsız HER ZAMAN salt-okunur -
    fork edilmiş bir formun eski hâli yanlışlıkla tekrar fork'a kaynak olamaz."""
    if obj is None:
        return True
    root = _root_form_of(obj, kind)
    latest = get_latest_version(root)
    if latest.pk != root.pk:
        return False
    return not form_has_responses(latest)


class VersionForkAdminMixin:
    """
    GET (change_view): obj, grubunun en güncel versiyonuna aitse VE zaten
    cevaplıysa, hemen fork'lar ve admin'i yeni (cevapsız) versiyondaki eşdeğer
    nesneye yönlendirir. Bu SADECE kullanıcı deneyimi kolaylığıdır - eski
    versiyonlar hiç yönlendirilmez, Django'nun kendi salt-okunur render'ıyla
    (has_view_permission True + has_change_permission False) gösterilir.

    Gerçek veri koruması has_change_permission/has_delete_permission'da:
    Django bunları HER istekte (GET/POST fark etmeksizin, inline formset'lerin
    silme checkbox'ları dahil) taze bir obj ile kontrol eder - bu yüzden GET'e
    hiç uğramadan gelen bir POST (ikinci sekme, "resubmit form" vb.) da
    orijinal cevaplı satırı asla mutasyona uğratamaz.
    """

    version_kind: str  # alt sınıfta set edilir: 'form' | 'question' | 'option'

    def get_root_form(self, obj) -> Form:
        return _root_form_of(obj, self.version_kind)

    def has_change_permission(self, request, obj=None):
        if not super().has_change_permission(request, obj):
            return False
        return _directly_editable(obj, self.version_kind)

    def has_delete_permission(self, request, obj=None):
        if not super().has_delete_permission(request, obj):
            return False
        return _directly_editable(obj, self.version_kind)

    def _equivalent(self, obj, id_map, new_form):
        raise NotImplementedError

    def change_view(self, request, object_id, form_url='', extra_context=None):
        obj = self.get_object(request, unquote(str(object_id)))
        if obj is not None:
            root = self.get_root_form(obj)
            latest = get_latest_version(root)
            if latest.pk == root.pk and form_has_responses(latest):
                new_form, id_map = fork_form_version(root)
                new_obj = self._equivalent(obj, id_map, new_form)
                self.message_user(
                    request,
                    f"'{root.title}' formu zaten yanıtlanmış olduğu için düzenlemeniz "
                    f"otomatik olarak yeni bir versiyona (v{new_form.version}) taşındı. "
                    f"Önceki versiyondaki cevaplar değişmeden korunuyor.",
                    level=messages.INFO,
                )
                url = reverse(
                    f'admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change',
                    args=[new_obj.pk],
                )
                if request.GET:
                    url += '?' + request.GET.urlencode()
                return HttpResponseRedirect(url)
        return super().change_view(request, object_id, form_url, extra_context)


# --- INLINES ---

class QuestionOptionInline(admin.TabularInline):
    """Adminler seçenekleri ve puan değerlerini yönetebilir."""
    model = QuestionOption
    extra = 1
    ordering = ['order']
    fields = ('option_text', 'score_value', 'is_correct', 'order')


class QuestionInline(admin.TabularInline):
    """Adminler form altındaki soruları yönetebilir."""
    model = Question
    extra = 1
    ordering = ['order']
    fields = ('question_text', 'question_type', 'order', 'is_required')


# --- ADMIN CLASSES ---

@admin.register(Form)
class FormAdmin(VersionForkAdminMixin, admin.ModelAdmin):
    """
    Adminler form başlıklarını, açıklamalarını ve genel ayarlarını yönetir.
    Zaten cevaplanmış bir form düzenlenmeye çalışıldığında otomatik olarak
    yeni bir versiyon açılır (bkz. VersionForkAdminMixin).
    """
    version_kind = 'form'
    list_display = ['title', 'version', 'is_active', 'scoring_type', 'stage', 'response_count']
    list_filter = ['scoring_type', 'is_active', 'stage']
    search_fields = ['title']
    readonly_fields = ['group_key', 'version']
    inlines = [QuestionInline]

    def response_count(self, obj):
        return obj.responses.count()
    response_count.short_description = 'Cevap Sayısı'

    def _equivalent(self, obj, id_map, new_form):
        return new_form


@admin.register(Question)
class QuestionAdmin(VersionForkAdminMixin, admin.ModelAdmin):
    """
    Soru bazlı CRUD işlemleri yapılabilir. Formuyla aynı versiyonlama koruması
    geçerlidir.
    """
    version_kind = 'question'
    list_display = ['question_text', 'form', 'question_type', 'order']
    list_filter = ['form', 'question_type']
    search_fields = ['question_text']
    inlines = [QuestionOptionInline]

    def _equivalent(self, obj, id_map, new_form):
        return Question.objects.get(pk=id_map['questions'][obj.id])

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        # next_question hiçbir queryset kısıtı olmadan TÜM formlardaki
        # soruları listeliyordu (versiyonlamadan bağımsız, var olan bir
        # hata) - versiyonlama sonrası aynı isimli çok sayıda soru (farklı
        # versiyonlardan) görüneceği için bu karışıklığı önlemek daha kritik.
        if db_field.name == 'next_question':
            object_id = request.resolver_match.kwargs.get('object_id')
            if object_id:
                current = Question.objects.filter(pk=object_id).first()
                if current:
                    kwargs['queryset'] = Question.objects.filter(
                        form=current.form
                    ).exclude(pk=current.pk)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(QuestionOption)
class QuestionOptionAdmin(VersionForkAdminMixin, admin.ModelAdmin):
    """
    Seçenek bazlı CRUD işlemleri yapılabilir. Formuyla aynı versiyonlama
    koruması geçerlidir.
    """
    version_kind = 'option'
    list_display = ['option_text', 'question', 'score_value', 'order']
    list_filter = ['question__form']
    search_fields = ['option_text', 'question__question_text']

    def _equivalent(self, obj, id_map, new_form):
        return QuestionOption.objects.get(pk=id_map['options'][obj.id])


@admin.register(RiskLevelMapping)
class RiskLevelMappingAdmin(admin.ModelAdmin):
    """
    Adminler hangi puan aralığının hangi riske denk geleceğini (formülleri)
    yönetebilir. Ancak bu eşleşmenin kime çarptığını göremezler.
    """
    list_display = ['form_type', 'min_score', 'max_score', 'risk_level', 'is_active']
    list_filter = ['form_type', 'is_active']

# --- GİZLİLİK KRİTİK ALANLAR (CEVAPLAR VE SONUÇLAR) ---


@admin.register(FormResponse)
class FormResponseAdmin(admin.ModelAdmin):
    """
    Admin sadece formun doldurulduğu bilgisini görür.
    Puan, Risk Seviyesi, Yorum gibi alanlar tamamen gizlendi.
    """
    # form artık "Başlık (vN)" olarak görünüyor (bkz. Form.__str__), ama ayrı
    # bir sıralanabilir 'form_version' kolonu da ekliyoruz - liste görünümünde
    # versiyona göre sıralama/tarama kolaylaşsın diye.
    list_display = ['user', 'form', 'form_version', 'submitted_at']  # total_score ve risk_level ÇIKARILDI
    list_filter = ['form', 'submitted_at']
    search_fields = ['user__username', 'user__email', 'form__title']

    # Detay sayfasında sadece kimin ne zaman, formun hangi versiyonunu doldurduğu görünür.
    fields = ['user', 'form', 'form_version', 'submitted_at']
    readonly_fields = ['user', 'form', 'form_version', 'submitted_at']

    def form_version(self, obj):
        return obj.form.version
    form_version.short_description = 'Form Versiyonu'
    form_version.admin_order_field = 'form__version'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    """
    Cevaplar tablosu admin panelinde hiç görünmez.
    Bireysel cevaplar üzerinde CRUD yapılamaz, admin erişemez.
    """
    def has_module_permission(self, request):
        return False

    def has_view_permission(self, request, obj=None):
        return False
