# accounts/services.py
"""Belge inceleme (onay/red) iş mantığı.

Tek giriş noktası review_document() - admin panelindeki tekil düzenleme
(DocumentAdmin.save_model) VE toplu aksiyonlar (approve_documents/
reject_documents) BURADAN geçmek zorunda ki status<->verified senkronu ve
bildirim üretimi her iki yolda da birebir aynı davransın.
"""
from django.utils import timezone

from .models import Document, DocumentStatus


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


def notify_document_review(document: Document) -> None:
    # notifications'ı burada (fonksiyon içinde) import ediyoruz - accounts,
    # notifications'ı import ediyor ama notifications hiçbir yerde accounts'ı
    # import etmiyor, bu yüzden döngüsel bir bağımlılık riski yok; yine de
    # proje genelinde (messaging -> notifications) yerleşmiş "çağrı anında
    # import et" alışkanlığıyla tutarlı kalmak için modül seviyesine taşımadık.
    from notifications.services import create_document_status_notification
    create_document_status_notification(document)


def review_document(document: Document, status: str) -> Document:
    """Toplu admin aksiyonları (approve_documents/reject_documents/
    reset_documents_to_pending) için: SADECE durumun değiştiği, formdan gelen
    başka bir alan değişikliği olmadığı bilinen bir bağlamda kullanılır - bu
    yüzden dar bir update_fields ile güvenle kaydedebilir."""
    if status not in (DocumentStatus.PENDING, DocumentStatus.APPROVED, DocumentStatus.REJECTED):
        raise ValueError(f"Geçersiz belge durumu: {status}")

    document.status = status
    sync_review_fields(document)
    document.save(update_fields=["status", "verified", "verified_at", "updated_at"])
    notify_document_review(document)

    return document
