from django.contrib import admin, messages
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from django_erp.configuration.mixins import CompanyFilterMixin
from .models import Lead
from .services import LeadConversionService
from django.urls import path
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import json



@require_POST
def convert_lead_ajax(request):
    try:
        data = json.loads(request.body)
        lead_id = data.get('lead_id')
        
        lead = Lead.objects.get(id=lead_id)
        
        if lead.converted_customer_id:
            return JsonResponse({'error': 'Este lead ya fue convertido'}, status=400)
            
        # Usamos el servicio de conversión
        customer = LeadConversionService.convert_to_customer(lead, request.user)
        
        return JsonResponse({
            'success': True, 
            'customer_name': customer.name
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


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

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('kanban/', self.admin_site.admin_view(kanban_view), name='crm_lead_kanban'),
            path('api/update-status/', self.admin_site.admin_view(update_lead_status), name='crm_update_status'),
            path('api/convert/', self.admin_site.admin_view(convert_lead_ajax), name='crm_convert_lead'), # ✅ FALTABA ESTA
        ]
        return custom_urls + urls



def kanban_view(request):
    company = getattr(request, 'current_company', None)
    leads = Lead.objects.all()
    if company:
        leads = leads.filter(company=company)
    
    columns = {status[0]: [] for status in Lead.STATUS_CHOICES}
    for lead in leads:
        columns[lead.status].append(lead)
    
    from django.utils import timezone
    
    context = {
        'title': 'Pipeline Kanban',
        'columns': columns,
        'status_choices': Lead.STATUS_CHOICES,
        'today': timezone.now().date(),
        # ✅ ESTO ES LO QUE FALTABA PARA QUE UNFOLD DIBUJE EL MENÚ
        **admin.site.each_context(request),
    }
    return render(request, 'admin/crm/kanban.html', context)

# ✅ ENDPOINT PARA ACTUALIZAR EL ESTADO (AJAX)
@require_POST
def update_lead_status(request):
    try:
        data = json.loads(request.body)
        lead_id = data.get('lead_id')
        new_status = data.get('status')
        
        lead = Lead.objects.get(id=lead_id)
        lead.status = new_status
        lead.save(update_fields=['status', 'updated_at'])
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)