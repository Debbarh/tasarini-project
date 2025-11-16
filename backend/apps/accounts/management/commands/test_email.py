"""
Commande Django pour tester la configuration email.

Usage:
    docker-compose exec backend python manage.py test_email votre-email@example.com
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings


class Command(BaseCommand):
    help = 'Teste la configuration email en envoyant un email de test'

    def add_arguments(self, parser):
        parser.add_argument(
            'recipient',
            type=str,
            help='Adresse email du destinataire'
        )

    def handle(self, *args, **options):
        recipient = options['recipient']

        self.stdout.write(self.style.WARNING('📧 Envoi d\'un email de test...'))
        self.stdout.write(f'   Destinataire: {recipient}')
        self.stdout.write(f'   Serveur: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}')
        self.stdout.write(f'   De: {settings.DEFAULT_FROM_EMAIL}')
        self.stdout.write('')

        try:
            # Render HTML template
            html_message = render_to_string('emails/test_email.html')
            plain_message = strip_tags(html_message)

            # Send email
            send_mail(
                subject='Test Email - Configuration Tasarini',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                html_message=html_message,
                fail_silently=False,
            )

            self.stdout.write(self.style.SUCCESS('✅ Email envoyé avec succès!'))
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('🎉 Configuration email validée:'))
            self.stdout.write('   ✅ Serveur SMTP accessible')
            self.stdout.write('   ✅ Identifiants valides')
            self.stdout.write('   ✅ Email envoyé')
            self.stdout.write('')
            self.stdout.write(f'📬 Vérifiez votre boîte email: {recipient}')

        except Exception as e:
            self.stdout.write(self.style.ERROR('❌ Erreur lors de l\'envoi:'))
            self.stdout.write(self.style.ERROR(f'   {str(e)}'))
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('🔍 Vérifications à faire:'))
            self.stdout.write('   1. Variables EMAIL_* dans backend/.env')
            self.stdout.write('   2. Mot de passe correct')
            self.stdout.write('   3. Port SMTP (465 pour SSL, 587 pour TLS)')
            self.stdout.write('   4. Serveur mail.tasarini.com accessible')
            raise
