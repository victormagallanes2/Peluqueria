from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin as UnfoldModelAdmin

from django_erp.configuration.mixins import CompanyFilterMixin

from .models import WebPage, WebPageVisit


@admin.register(WebPage)
class WebPageAdmin(CompanyFilterMixin, UnfoldModelAdmin):
    list_display = ['name', 'slug', 'company', 'is_published', 'visit_count', 'public_url_link']
    list_filter = ['is_published', 'company']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at', 'visit_count']

    fieldsets = (
        ('Información', {
            'fields': ('name', 'slug', 'company')
        }),
        ('Contacto', {
            'fields': ('contact_email',),
            'description': 'Aquí llegarán las notificaciones de nuevos leads.',
        }),
        ('Estado', {
            'fields': ('is_published',)
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at', 'visit_count'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Visitas')
    def visit_count(self, obj):
        if not obj.pk:
            return 0
        return obj.visits.count()

    @admin.display(description='URL pública')
    def public_url_link(self, obj):
        if not obj.slug:
            return '—'
        return format_html(
            '<a href="{}" target="_blank">{}</a>',
            obj.public_url,
            obj.public_url,
        )


@admin.register(WebPageVisit)
class WebPageVisitAdmin(UnfoldModelAdmin):
    list_display = ['page', 'ip_address', 'visited_at']
    list_filter = ['page', 'visited_at']
    search_fields = ['page__name', 'ip_address']
    readonly_fields = ['page', 'ip_address', 'visited_at']
    date_hierarchy = 'visited_at'

    def has_add_permission(self, request):
        return False