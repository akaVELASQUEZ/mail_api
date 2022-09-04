from rest_framework import serializers
from mail.models import Email

class EmailSerializer(serializers.ModelSerializer):

    sender = serializers.CharField(source="sender.email", read_only=True)
    recipients = serializers.ListField(source="recipient_email", read_only=True)
    timestamp = serializers.DateTimeField(source="get_timestamp", read_only=True)

    class Meta:
        model = Email
        fields = '__all__'

    
    