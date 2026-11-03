# sales/apps.py
from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'django_erp.sales'
    verbose_name = 'Ventas'
    
    def ready(self):
        import django_erp.sales.signals
