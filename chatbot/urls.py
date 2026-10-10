
from django.urls import path
from .views import chat, course_list

urlpatterns = [
    path("chat/", chat, name="chat"),
    path("courses/", course_list, name="course-list"),
]
