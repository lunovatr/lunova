from django.db import migrations


def backfill_individual_therapy(apps, schema_editor):
    """Bugüne kadar booking akışı sadece bireysel terapi randevusu üretiyordu
    (grup/psikoeğitim rezervasyonu Faz 5'e kadar hiç yoktu) - var olan TÜM
    randevuları `individual_therapy` kataloğuna bağlar. Katalog satırı henüz
    hiç feed edilmemişse (örn. taze bir ortamda migration seed'den önce
    çalışırsa) sessizce atlanır, hiçbir hata fırlatmaz."""
    Appointment = apps.get_model('appointments', 'Appointment')
    SessionOffering = apps.get_model('catalog', 'SessionOffering')

    offering = SessionOffering.objects.filter(code='individual_therapy').first()
    if offering is None:
        return

    Appointment.objects.filter(session_offering__isnull=True).update(session_offering=offering)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0004_appointment_session_offering'),
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill_individual_therapy, noop_reverse),
    ]
