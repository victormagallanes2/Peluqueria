from django.urls import path

from . import views

app_name = 'web'

urlpatterns = [
    path('p/<slug:slug>/', views.web_page_view, name='web_page_view'),
    path('p/<slug:slug>/contact/', views.contact_form_submit, name='contact_form_submit'),
]