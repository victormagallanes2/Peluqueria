from django.contrib import admin, messages
from unfold.admin import ModelAdmin as UnfoldModelAdmin

from django_erp.configuration.mixins import CompanyFilterMixin

from .models import Lead
from .services import LeadConversionService


@admin.register(Lead)
class LeadAdmin(CompanyFilterMixin, UnfoldModelAdmin):
    list_display = [
        'name', 'email', 'phone', 'status',
        'assigned_to', 'web_page', 'created_at',
    ]
    list_filter = ['status', 'source', 'assigned_to', 'company', 'created_at']
    search_fields = ['name', 'email', 'phone', 'message']
    list_editable = ['status', 'assigned_to']
    date_hierarchy = 'created_at'
    autocomplete_fields = ['assigned_to', 'web_page']

    readonly_fields = [
        'ip_address', 'created_at', 'updated_at',
        'converted_customer', 'converted_at',
    ]

    fieldsets = (
        ('Datos del Lead', {
            'fields': ('name', 'email', 'phone', 'message')
        }),
        ('Pipeline', {
            'fields': ('status', 'assigned_to')
        }),
        ('Origen', {
            'fields': ('web_page', 'source', 'company')
        }),
        ('Conversión', {
            'fields': ('converted_customer', 'converted_at'),
            'classes': ('collapse',),
        }),
        ('Auditoría', {
            'fields': ('ip_address', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    actions = ['mark_contacted', 'mark_lost', 'convert_to_customer']

    @admin.action(description='Marcar como contactado')
    def mark_contacted(self, request, queryset):
        updated = queryset.filter(status='NEW').update(status='CONTACTED')
        self.message_user(
            request,
            f'{updated} lead(s) marcados como contactados.',
            messages.SUCCESS,
        )

    @admin.action(description='Marcar como perdido')
    def mark_lost(self, request, queryset):
        updated = queryset.exclude(status='LOST').update(status='LOST')
        self.message_user(
            request,
            f'{updated} lead(s) marcados como perdidos.',
            messages.SUCCESS,
        )

    @admin.action(description='Convertir a Customer')
    def convert_to_customer(self, request, queryset):
        pending = queryset.filter(converted_customer__isnull=True)
        count = 0
        errors = 0

        for lead in pending:
            try:
                LeadConversionService.convert_to_customer(lead, request.user)
                count += 1
            except Exception as e:
                errors += 1
                self.message_user(
                    request,
                    f'Error convirtiendo lead {lead.id}: {e}',
                    messages.ERROR,
                )

        if count:
            self.message_user(
                request,
                f'{count} lead(s) convertidos a clientes.',
                messages.SUCCESS,
            )
        if errors:
            self.message_user(
                request,
                f'{errors} lead(s) fallaron al convertir.',
                messages.WARNING,
            )