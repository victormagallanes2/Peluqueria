from django.db import models
from django_erp.configuration.models import Company


class WebPage(models.Model):
    """
    Página web pública de un cliente.

    El HTML vive en templates/webs/<slug>.html y se edita a mano.
    Este modelo solo guarda los datos que el ERP necesita: slug, dueño,
    y a qué email llegan las notificaciones.
    """

    slug = models.SlugField(
        max_length=100,
        unique=True,
        verbose_name="Slug",
        help_text="URL amigable. Ej: cliente-a → /p/cliente-a/",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='web_pages',
        verbose_name="Compañía",
    )
    name = models.CharField(
        max_length=200,
        verbose_name="Nombre interno",
        help_text="Solo para tu referencia en el admin.",
    )
    contact_email = models.EmailField(
        verbose_name="Email de contacto",
        help_text="Aquí llegan las notificaciones de nuevos leads.",
    )
    is_published = models.BooleanField(
        default=True,
        verbose_name="Publicada",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Página Web"
        verbose_name_plural = "Páginas Web"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} (/p/{self.slug}/)"

    @property
    def public_url(self):
        return f"/p/{self.slug}/"

    @property
    def template_name(self):
        """
        Template HTML a usar.

        Si existe un template específico para el slug, lo usa.
        Si no, cae a 'webs/default.html'.
        """
        return f"webs/{self.slug}.html"


class WebPageVisit(models.Model):
    """Registro simple de visitas para contar cuántas veces se ve la página."""

    page = models.ForeignKey(
        WebPage,
        on_delete=models.CASCADE,
        related_name='visits',
        verbose_name="Página",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP",
    )
    visited_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Visitada el",
    )

    class Meta:
        verbose_name = "Visita a Página Web"
        verbose_name_plural = "Visitas a Páginas Web"
        ordering = ['-visited_at']
        indexes = [
            models.Index(fields=['page', '-visited_at']),
        ]

    def __str__(self):
        return f"{self.page.name} - {self.visited_at:%Y-%m-%d %H:%M}"