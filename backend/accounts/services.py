# accounts/services.py
"""Belge inceleme (onay/red) iş mantığı.

Tek giriş noktası review_document() - admin panelindeki tekil düzenleme
(DocumentAdmin.save_model) VE toplu aksiyonlar (approve_documents/
reject_documents) BURADAN geçmek zorunda ki status<->verified senkronu ve
bildirim üretimi her iki yolda da birebir aynı davransın.
"""
from django.utils import timezone

from .models import Document, DocumentStatus, DocumentType, RecoveryStatus, UserRole


def sync_review_fields(document: Document) -> None:
    """`document.status` her ne ise (çağıran taraf zaten set etmiş olmalı) ona
    göre eski `verified`/`verified_at` alanlarını senkronlar. KAYDETMEZ -
    çağıran taraf kendi save() stratejisini seçer: review_document() dar bir
    update_fields ile kaydeder (sadece durum alanları değişti, bağlam bilinir);
    DocumentAdmin.save_model() ise formdaki DİĞER alan değişikliklerini
    (örn. type, is_primary) de kaybetmemek için tam bir save() yapar - status
    değişikliğiyle aynı anda başka bir alan da değiştirilmiş olabilir, dar bir
    update_fields o değişiklikleri sessizce DB'ye yazmadan atlardı."""
    document.verified = document.status == DocumentStatus.APPROVED
    document.verified_at = timezone.now() if document.status != DocumentStatus.PENDING else None


def apply_recovery_status_effect(document: Document, reviewed_by=None) -> None:
    """RECOVERY_PROOF tipindeki bir belge APPROVED olduğunda danışanın
    ClientProfile.recovery_status'unu otomatik 'in_recovery'ye çeker (Faz 4 -
    Seans Tipi Kataloğu planı, ex-user grup terapisi uygunluğu). Sadece bu
    tip+durum kombinasyonunda bir şey yapar. Belge SONRADAN reddedilirse
    recovery_status BİLİNÇLİ OLARAK geri alınmaz - bir kez doğrulanmış bir
    geçmiş sessizce silinmez, gerekirse admin ClientProfile'dan elle değiştirir
    (projenin genelindeki "deactivate, asla sessizce geri alma" ilkesiyle tutarlı).
    """
    if document.type != DocumentType.RECOVERY_PROOF or document.status != DocumentStatus.APPROVED:
        return
    if document.user.role != UserRole.CLIENT:
        return
    client_profile = getattr(document.user, 'clientprofile', None)
    if client_profile is None:
        return

    client_profile.recovery_status = RecoveryStatus.IN_RECOVERY
    client_profile.recovery_status_verified_by = reviewed_by
    client_profile.recovery_status_verified_at = timezone.now()
    client_profile.save(update_fields=[
        'recovery_status', 'recovery_status_verified_by', 'recovery_status_verified_at',
    ])


def notify_document_review(document: Document) -> None:
    # notifications'ı burada (fonksiyon içinde) import ediyoruz - accounts,
    # notifications'ı import ediyor ama notifications hiçbir yerde accounts'ı
    # import etmiyor, bu yüzden döngüsel bir bağımlılık riski yok; yine de
    # proje genelinde (messaging -> notifications) yerleşmiş "çağrı anında
    # import et" alışkanlığıyla tutarlı kalmak için modül seviyesine taşımadık.
    from notifications.services import create_document_status_notification
    create_document_status_notification(document)


def review_document(document: Document, status: str, reviewed_by=None) -> Document:
    """Toplu admin aksiyonları (approve_documents/reject_documents/
    reset_documents_to_pending) için: SADECE durumun değiştiği, formdan gelen
    başka bir alan değişikliği olmadığı bilinen bir bağlamda kullanılır - bu
    yüzden dar bir update_fields ile güvenle kaydedebilir.

    reviewed_by (Faz 4, YENİ) - RECOVERY_PROOF belgesi onaylanırsa
    ClientProfile.recovery_status_verified_by'a yazılan admin kullanıcısı."""
    if status not in (DocumentStatus.PENDING, DocumentStatus.APPROVED, DocumentStatus.REJECTED):
        raise ValueError(f"Geçersiz belge durumu: {status}")

    document.status = status
    sync_review_fields(document)
    document.save(update_fields=["status", "verified", "verified_at", "updated_at"])
    apply_recovery_status_effect(document, reviewed_by=reviewed_by)
    notify_document_review(document)

    return document
