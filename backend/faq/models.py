from django.db import models


class FAQ(models.Model):

    question = models.TextField()

    answer = models.TextField()

    category = models.CharField(
        max_length=100
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.question