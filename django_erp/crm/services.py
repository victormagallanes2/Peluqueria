import logging

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class LeadConversionService:
    """Convierte un Lead en Customer."""

    @staticmethod
    @transaction.atomic
    def convert_to_customer(lead, user=None):
        """
        Convertir un Lead en Customer.

        - Si ya tiene un Customer vinculado, lo devuelve.
        - Si no, busca uno existente por email, o crea uno nuevo.
        - Marca el lead como WON.
        """
        if lead.converted_customer_id:
            return lead.converted_customer

        from django_erp.sales.models import Customer

        customer = None

        # 1. Buscar Customer existente por email
        if lead.email:
            customer = Customer.objects.filter(email=lead.email).first()

        # 2. Si no existe, crear uno nuevo
        if not customer:
            customer = Customer.objects.create(
                name=lead.name,
                email=lead.email or None,
                phone=lead.phone,
                address='',
                tax_id=f"LEAD-{lead.id}",
                created_in_company=lead.company,
            )

        # 3. Vincular y marcar como ganado
        lead.converted_customer = customer
        lead.converted_at = timezone.now()
        lead.status = 'WON'
        lead.save(update_fields=[
            'converted_customer',
            'converted_at',
            'status',
            'updated_at',
        ])

        logger.info(
            "Lead %s convertido a Customer %s (por %s)",
            lead.id, customer.id, user,
        )

        return customer