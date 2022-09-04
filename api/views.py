from rest_framework.response import Response
from rest_framework.decorators import api_view
from mail.models import Email, User
from .serializers import EmailSerializer
from django.core import serializers


import json
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser

@api_view(['POST'])
@login_required
@csrf_exempt
def compose(request):

    # Composing a new email must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Check recipient emails
    data = request.data
    emails = [email.strip() for email in data.get("recipients").split(",")]
    if emails == [""]:
        return JsonResponse({
            "error": "At least one recipient required."
        }, status=400)

    # Convert email addresses to users
    recipients = []
    for email in emails:
        try:
            user = User.objects.get(email=email)
            recipients.append(user)
        except User.DoesNotExist:
            return JsonResponse({
                "error": f"User with email {email} does not exist."
            }, status=400)

    # Get contents of email
    subject = data.get("subject", "")
    body = data.get("body", "")

    # Create one email for each recipient, plus sender
    users = set()
    users.add(request.user)
    users.update(recipients)
    for user in users:
        email = Email(
            user=user,
            sender=request.user,
            subject=subject,
            body=body,
            read=user == request.user
        )

        email.save()

        for recipient in recipients:
            email.recipients.add(recipient)
        
        data1 = serializers.serialize('json', [email, ])
        serializer = EmailSerializer(data=data1)

        if serializer.is_valid():
            serializer.save()

    return JsonResponse({"message": "Email sent successfully."}, status=201)


@api_view(['GET'])
@login_required
@csrf_exempt
def mailbox(request, mailbox):

    # Filter emails returned based on mailbox
    if mailbox == "inbox":
        emails = Email.objects.filter(
            user=request.user, recipients=request.user, archived=False
        )
    elif mailbox == "sent":
        emails = Email.objects.filter(
            user=request.user, sender=request.user
        )
    elif mailbox == "archive":
        emails = Email.objects.filter(
            user=request.user, recipients=request.user, archived=True
        )
    else:
        return JsonResponse({"error": "Invalid mailbox."}, status=400)

    # Return emails in reverse chronologial order
    emails = emails.order_by("-timestamp").all()
    serializer = EmailSerializer(emails, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT'])
@csrf_exempt
@login_required
def email(request, email_id):

    # Query for requested email
    try:
        email = Email.objects.get(user=request.user, pk=email_id)
        serializer = EmailSerializer(email, many=False)
    except Email.DoesNotExist:
        return JsonResponse({"error": "Email not found."}, status=404)

    # Return email contents
    if request.method == "GET":
        
        return Response(serializer.data)

    # Update whether email is read or should be archived
        
    elif request.method == 'PUT':

        data = json.loads(request.body)

        if data.get("read") is not None:
            serializer = EmailSerializer(email, data={'read': data["read"]}, partial=True)

        if data.get("archived") is not None:
            serializer = EmailSerializer(email, data={'archived': data["archived"]}, partial=True)

        if serializer.is_valid():
            serializer.save()
            return HttpResponse(status=204)

        return JsonResponse(serializer.errors, status=400)

    # Email must be via GET or PUT
    else:
        return JsonResponse({
            "error": "GET or PUT request required."
        }, status=400)

