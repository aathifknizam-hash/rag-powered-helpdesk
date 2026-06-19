import logging
from django.core.management.base import BaseCommand
from tickets.models import Department
from knowledge_base.models import KnowledgeCategory
from authentication.models import User

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Seed database with default departments and knowledge categories"

    def handle(self, *args, **options):
        # 1. Seed categories
        categories = [
            ("VPN", "Virtual Private Network access and configuration"),
            ("Networking", "Wired/Wireless connectivity, routers, DNS, and IP configurations"),
            ("Windows", "Windows operating system updates, troubleshooting, and license issues"),
            ("Email", "Outlook, exchange accounts, mail forwarding, and spam issues"),
            ("Payroll", "Salary statements, direct deposit configuration, tax documents, and direct queries"),
            ("Leave Management", "Sick leaves, annual leaves, holidays, and PTO tracking"),
            ("Benefits", "Medical insurance, retirements, employee perks, and wellness programs"),
            ("Hardware", "Laptop, monitor, mouse, keyboard, dock, and peripheral provisioning/troubleshooting"),
            ("Software", "Installation, updates, and licenses for standard enterprise office applications"),
            ("Security", "Identity management, multi-factor authentication (MFA), credentials, and phishing reports"),
        ]

        self.stdout.write("Seeding knowledge base categories...")
        for cat_name, desc in categories:
            cat, created = KnowledgeCategory.objects.get_or_create(
                name=cat_name,
                defaults={"description": desc}
            )
            if created:
                self.stdout.write(f"Created Category: {cat_name}")
            else:
                self.stdout.write(f"Category already exists: {cat_name}")

        # 2. Seed departments
        departments = [
            ("HR", "Human Resources department for personnel and policy queries"),
            ("Finance", "Finance, invoicing, expenses, and payroll calculations"),
            ("Technical Support", "General tech assistance and desk help"),
            ("Network Support", "Internet, VPN, firewalls, and network outages support"),
            ("Software Support", "Operating systems, applications, and SaaS tools support"),
            ("Operations", "Office facilities, supply chain, hardware allocation, logistics"),
            ("General Support", "General inquiries that do not fit into other specialized categories"),
        ]

        self.stdout.write("\nSeeding departments...")
        for dept_name, desc in departments:
            dept, created = Department.objects.get_or_create(
                name=dept_name,
                defaults={"description": desc}
            )
            if created:
                self.stdout.write(f"Created Department: {dept_name}")
            else:
                self.stdout.write(f"Department already exists: {dept_name}")

        self.stdout.write(self.style.SUCCESS("\nDatabase seeding completed successfully!"))
