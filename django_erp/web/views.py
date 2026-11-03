import json
import logging

from django.http import Http404, JsonResponse
from django.shortcuts import render
from django.template import TemplateDoesNotExist
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

from .models import WebPage, WebPageVisit
from .services import send_lead_notification

logger = logging.getLogger(__name__)


def web_page_view(request, slug):
    """
    Renderiza la página web pública.

    - Si el cliente tiene un template específico (webs/<slug>.html), lo usa.
    - Si no, cae a webs/default.html.
    - Registra la visita.
    """
    try:
        page = WebPage.objects.get(slug=slug, is_published=True)
    except WebPage.DoesNotExist:
        raise Http404("Página web no encontrada")

    # Registrar visita (sin bloquear si falla)
    try:
        WebPageVisit.objects.create(
            page=page,
            ip_address=_get_client_ip(request),
        )
    except Exception as e:
        logger.warning("No se pudo registrar visita a página %s: %s", slug, e)

    # Elegir template
    template_candidates = [
        page.template_name,   # webs/<slug>.html
        'webs/default.html',
    ]

    context = {
        'page': page,
    }

    for template in template_candidates:
        try:
            return render(request, template, context)
        except TemplateDoesNotExist:
            continue

    logger.error("No hay template para página web %s", slug)
    raise Http404("Template de página web no encontrado")


@require_POST
@csrf_exempt  # Para simplificar el AJAX del formulario; se puede endurecer después
def contact_form_submit(request, slug):
    """
    Recibe el formulario de contacto de la página web.

    - Valida nombre y email.
    - Crea un Lead en el módulo crm (SIEMPRE, aunque el cliente no pague CRM).
    - Envía notificación por email.
    - Devuelve JSON.
    """
    try:
        page = WebPage.objects.get(slug=slug, is_published=True)
    except WebPage.DoesNotExist:
        return JsonResponse({'error': 'Página web no encontrada'}, status=404)

    # Parsear el cuerpo
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'Datos inválidos'}, status=400)

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    phone = (data.get('phone') or '').strip()
    message = (data.get('message') or '').strip()

    # Validación mínima
    if not name:
        return JsonResponse({'error': 'El nombre es obligatorio'}, status=400)
    if not email or '@' not in email:
        return JsonResponse({'error': 'El email es obligatorio y debe ser válido'}, status=400)

    # ✅ Importar CRM aquí (no al tope) para evitar dependencia circular
    try:
        from django_erp.crm.models import Lead
    except ImportError:
        logger.error("Módulo CRM no disponible al recibir lead")
        return JsonResponse(
            {'error': 'Servicio temporalmente no disponible'},
            status=503,
        )

    # ✅ Crear el Lead SIEMPRE
    try:
        lead = Lead.objects.create(
            web_page=page,
            company=page.company,
            name=name,
            email=email,
            phone=phone,
            message=message,
            source='WEB',
            ip_address=_get_client_ip(request),
        )
    except Exception as e:
        logger.exception("Error creando lead desde página web %s: %s", slug, e)
        return JsonResponse({'error': 'Error al procesar el formulario'}, status=500)

    # ✅ Notificar por email (no bloquea si falla)
    try:
        send_lead_notification(lead)
    except Exception as e:
        logger.warning("Error notificando lead %s: %s", lead.id, e)

    return JsonResponse({
        'success': True,
        'message': 'Gracias, te contactaremos pronto.',
    })


def _get_client_ip(request):
    """Obtener IP real del cliente (respetando proxies)."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
