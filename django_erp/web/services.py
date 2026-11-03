import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_lead_notification(lead):
    """
    Enviar email de notificación cuando llega un nuevo lead.

    Destinatarios:
        - contact_email de la página web
        - email del assigned_to (si existe)

    No lanza excepciones: si falla el email, el lead igual queda guardado.
    """
    recipients = set()

    if lead.web_page and lead.web_page.contact_email:
        recipients.add(lead.web_page.contact_email)

    if lead.assigned_to and lead.assigned_to.email:
        recipients.add(lead.assigned_to.email)

    if not recipients:
        logger.warning(
            "Lead %s sin destinatarios de notificación (página sin email y sin assigned_to).",
            lead.id,
        )
        return

    subject = f"Nuevo contacto: {lead.name}"

    body_lines = [
        f"Nombre: {lead.name}",
    ]
    if lead.email:
        body_lines.append(f"Email: {lead.email}")
    if lead.phone:
        body_lines.append(f"Teléfono: {lead.phone}")
    if lead.message:
        body_lines.append("")
        body_lines.append("Mensaje:")
        body_lines.append(lead.message)

    body = "\n".join(body_lines)

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@erp.local'),
            recipient_list=list(recipients),
            fail_silently=True,
        )
        logger.info("Notificación de lead %s enviada a %s", lead.id, recipients)
    except Exception as e:
        logger.error("Error enviando notificación de lead %s: %s", lead.id, e)