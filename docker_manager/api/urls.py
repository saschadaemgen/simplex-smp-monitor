"""
Docker Management API URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    # Docker info
    path('info/', views.DockerInfoView.as_view(), name='docker-info'),
    
    # Container list
    path('containers/', views.ContainerListView.as_view(), name='container-list'),
    
    # Container stats (all)
    path('containers/stats/', views.ContainerStatsView.as_view(), name='container-stats-all'),
    
    # Container prune
    path('containers/prune/', views.ContainerPruneView.as_view(), name='container-prune'),
    
    # Container bulk actions
    path('containers/bulk/', views.ContainerBulkActionView.as_view(), name='container-bulk'),
    
    # Container detail
    path('containers/<str:container_id>/', views.ContainerDetailView.as_view(), name='container-detail'),
    
    # Container stats (single)
    path('containers/<str:container_id>/stats/', views.ContainerStatsView.as_view(), name='container-stats'),
    
    # Container logs
    path('containers/<str:container_id>/logs/', views.ContainerLogsView.as_view(), name='container-logs'),
    
    # Container actions
    path('containers/<str:container_id>/<str:action>/', views.ContainerActionView.as_view(), name='container-action'),
]
