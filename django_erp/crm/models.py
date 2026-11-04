from django.db import models
from django_erp.configuration.models import Company


class Lead(models.Model):
    """
    Lead capturado por una página web u otra fuente.

    El Lead NO es un Customer. Un Customer es alguien que ya compró.
    El Lead se convierte en Customer solo cuando el negocio se cierra.
    """

    STATUS_CHOICES = [
        ('NEW', 'Nuevo'),
        ('CONTACTED', 'Contactado'),
        ('QUALIFIED', 'Calificado'),
        ('PROPOSAL', 'Propuesta enviada'),
        ('WON', 'Ganado'),
        ('LOST', 'Perdido'),
    ]

    SOURCE_CHOICES = [
        ('WEB', 'Página web'),
        ('MANUAL', 'Manual'),
        ('REFERRAL', 'Referido'),
        ('OTHER', 'Otro'),
    ]

    # Origen
    web_page = models.ForeignKey(
        'web.WebPage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
        verbose_name="Página web",
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='WEB',
        verbose_name="Origen",
    )

    # Datos del formulario
    name = models.CharField(max_length=200, verbose_name="Nombre")
    email = models.EmailField(blank=True, verbose_name="Email")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")
    message = models.TextField(blank=True, verbose_name="Mensaje")

    # Pipeline
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='NEW',
        verbose_name="Estado",
    )
    assigned_to = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_leads',
        verbose_name="Asignado a",
    )

    # Conversión a Customer
    converted_customer = models.ForeignKey(
        'sales.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_leads',
        verbose_name="Cliente convertido",
        help_text="Se llena cuando el lead se convierte en cliente.",
    )
    converted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Convertido el",
    )

    # Auditoría
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP",
    )

    # Multi-compañía
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='crm_leads',
        verbose_name="Compañía",
    )

    estimated_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name="Valor estimado (USD)"
    )
    next_activity_date = models.DateField(
        null=True, blank=True, verbose_name="Próxima actividad"
    )
    priority = models.CharField(
        max_length=10,
        choices=[('LOW', 'Baja'), ('MEDIUM', 'Media'), ('HIGH', 'Alta')],
        default='MEDIUM',
        verbose_name="Prioridad"
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado")

    class Meta:
        verbose_name = "Lead"
        verbose_name_plural = "Leads"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['company', '-created_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"