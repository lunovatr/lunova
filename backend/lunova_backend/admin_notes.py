# lunova_backend/admin_notes.py
"""Django admin'in fieldsets'inde zaten desteklediği "description" anahtarına
geçirilen, renkli/ikonlu bilgi banner'ı üreten TEK paylaşılan yardımcı
(Admin Panel Dokümantasyon/Güvenlik turu, YENİ).

Neden gerekli: proje, yazılım bilmeyen bir operasyon ekibine GEÇİCİ olarak
Django admin panelini teslim ediyor (bkz. kök claude.md) - panel bu ekip için
BİRİNCİL yönetim arayüzü olacak. `accounts/admin.py`'deki ClientProfileAdmin/
DocumentAdmin zaten fieldsets'in "description" anahtarını (format_html ile,
XSS-güvenli) elle kullanıyordu - bu modül o deseni TEKİLLEŞTİRİYOR, projenin
genelinde zaten kullanılan 🔴🟠🟡🟢 önem ölçeğiyle (bkz. kök claude.md
"📌 Kalıcı Kural" madde c) tutarlı, renkli/ikonlu bir standart görünüm sağlıyor.

Kullanım: fieldsets'in "description" anahtarına ya da (model-seviyesi banner
için) fields=() olan ayrı, İLK bir fieldset girdisine geçirilir - ikisi de
Django'nun zaten native desteklediği bir mekanizma, yeni bir template/JS
gerekmez (bkz. django/contrib/admin/helpers.py + admin/includes/fieldset.html)."""
from django.utils.html import format_html, format_html_join

_SEVERITY_STYLES = {
    'critical': {'icon': '🔴', 'color': '#c62828', 'bg': '#fdecea', 'label': 'KRİTİK'},
    'high': {'icon': '🟠', 'color': '#e65100', 'bg': '#fff3e0', 'label': 'YÜKSEK ÖNEM'},
    'medium': {'icon': '🟡', 'color': '#8d6e00', 'bg': '#fffde7', 'label': 'DİKKAT'},
    'low': {'icon': '🟢', 'color': '#2e7d32', 'bg': '#eaf7ec', 'label': 'DÜŞÜK RİSK'},
    'info': {'icon': 'ℹ️', 'color': '#1565c0', 'bg': '#e8f0fe', 'label': 'BİLGİ'},
}


def admin_note(text: str, *, severity: str = 'info', title: str | None = None) -> str:
    """format_html() çıktısı döner - fieldsets'in "description" anahtarına
    doğrudan geçirilebilir. `text` içinde boş satırla (\\n\\n) ayrılmış birden
    fazla paragraf verilebilir, her biri ayrı bir <p> olarak render edilir.

    `severity`, projenin genelindeki 🔴/🟠/🟡/🟢 önem ölçeğiyle birebir
    eşleşir ('critical'/'high'/'medium'/'low') + ek olarak nötr bir 'info'
    (ℹ️) seviyesi (salt bilgilendirme, bir risk uyarısı değil - örn. "bu alan
    otomatik hesaplanır" gibi notlar için)."""
    style = _SEVERITY_STYLES.get(severity, _SEVERITY_STYLES['info'])
    heading = title or style['label']
    paragraphs = [p for p in text.split('\n\n') if p.strip()]
    body_html = format_html_join('', '<p style="margin: 4px 0;">{}</p>', ((p,) for p in paragraphs))
    return format_html(
        '<div style="border-left: 4px solid {color}; background: {bg}; padding: 8px 12px; '
        'margin: 4px 0 12px 0; max-width: 680px;">'
        '<strong style="color: {color};">{icon} {heading}</strong>'
        '{body}'
        '</div>',
        color=style['color'], bg=style['bg'], icon=style['icon'], heading=heading, body=body_html,
    )
