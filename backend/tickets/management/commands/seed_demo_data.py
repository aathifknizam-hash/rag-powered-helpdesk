"""
Management command: seed_demo_data
Populates the database with a realistic demo dataset:
  - 1 admin user
  - 6 agents (assigned to departments with expertise)
  - 10 customer users
  - Departments and knowledge categories
  - 40 tickets across various statuses, priorities, departments
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


DEPARTMENTS = [
    ('IT Support', 'Hardware, software, network and infrastructure support'),
    ('Human Resources', 'Employee relations, onboarding, policies and benefits'),
    ('Finance', 'Invoicing, payroll, expense reports and financial queries'),
    ('Facilities', 'Office maintenance, equipment, building access and safety'),
    ('Administration', 'General administration, compliance and executive support'),
]

CATEGORIES = [
    'Password Reset', 'VPN Access', 'Hardware Issue', 'Software Installation',
    'Network Connectivity', 'Email Configuration', 'Payroll Query', 'Leave Request',
    'Expense Claim', 'Office Maintenance', 'Access Control', 'Security Incident',
]

AGENTS = [
    ('Alice', 'Chen',    'alice.chen@company.com',    'IT Support'),
    ('Bob',   'Martinez','bob.martinez@company.com',  'IT Support'),
    ('Carol', 'Smith',   'carol.smith@company.com',   'Human Resources'),
    ('David', 'Kim',     'david.kim@company.com',     'Finance'),
    ('Emma',  'Johnson', 'emma.johnson@company.com',  'Facilities'),
    ('Frank', 'Lee',     'frank.lee@company.com',     'Administration'),
    ('HR',    'Agent',   'hr.agent@company.com',      'Human Resources'),
    ('Network','Agent',  'network.agent@company.com', 'IT Support'),
    ('Finance','Agent',  'finance.agent@company.com', 'Finance'),
    ('Facilities','Agent','facilities.agent@company.com','Facilities'),
    ('Admin',  'Agent',  'admin.agent@company.com',   'Administration'),
]

CUSTOMERS = [
    ('Grace', 'Park',    'grace.park@customer.com'),
    ('Henry', 'Wilson',  'henry.wilson@customer.com'),
    ('Iris',  'Brown',   'iris.brown@customer.com'),
    ('Jack',  'Davis',   'jack.davis@customer.com'),
    ('Karen', 'Taylor',  'karen.taylor@customer.com'),
    ('Leo',   'Anderson','leo.anderson@customer.com'),
    ('Mia',   'Thomas',  'mia.thomas@customer.com'),
    ('Nick',  'Jackson', 'nick.jackson@customer.com'),
    ('Olivia','White',   'olivia.white@customer.com'),
    ('Paul',  'Harris',  'paul.harris@customer.com'),
]

TICKET_SUBJECTS = [
    ('Cannot connect to VPN after password change', 'IT Support'),
    ('Laptop screen flickering intermittently', 'IT Support'),
    ('Request to install Adobe Acrobat Pro', 'IT Support'),
    ('Office WiFi drops every 30 minutes', 'IT Support'),
    ('Outlook keeps crashing on startup', 'IT Support'),
    ('New joiner access provisioning required', 'Human Resources'),
    ('Leave balance discrepancy in HR portal', 'Human Resources'),
    ('Expense report submission failing', 'Finance'),
    ('Invoice not reflected in payment system', 'Finance'),
    ('Air conditioning broken in meeting room 3', 'Facilities'),
    ('Printer on floor 2 not working', 'Facilities'),
    ('Building access card not working after 6pm', 'Facilities'),
    ('Need approval for external contractor access', 'Administration'),
    ('Compliance document requires manager signature', 'Administration'),
    ('Security alert: suspicious login detected', 'IT Support'),
    ('Cannot access shared drive after team migration', 'IT Support'),
    ('Request for dual monitor setup', 'Facilities'),
    ('Payroll adjustment not reflected this month', 'Finance'),
    ('Onboarding documentation for new hire batch', 'Human Resources'),
    ('Conference room AV system not working', 'Facilities'),
]

SENTIMENTS = ['positive', 'neutral', 'negative', 'frustrated', 'urgent']
PRIORITIES  = ['low', 'medium', 'high', 'critical']
STATUSES    = ['new', 'assigned', 'in_progress', 'resolved', 'closed']
PRIORITY_WEIGHTS = [0.15, 0.40, 0.30, 0.15]
STATUS_WEIGHTS   = [0.10, 0.20, 0.25, 0.30, 0.15]


class Command(BaseCommand):
    help = 'Seed the database with realistic demo data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing tickets/users before seeding (keeps superusers)',
        )

    def handle(self, *args, **options):
        from tickets.models import Department, Ticket, TicketMessage
        from knowledge_base.models import KnowledgeCategory, KnowledgeDocument
        from authentication.models import AgentExpertise
        from faq.models import FAQ

        if options['clear']:
            self.stdout.write('Clearing existing demo data...')
            Ticket.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            FAQ.objects.all().delete()
            KnowledgeDocument.objects.all().delete()

        self.stdout.write(self.style.MIGRATE_HEADING('Seeding departments...'))
        dept_map = {}
        for name, desc in DEPARTMENTS:
            dept, _ = Department.objects.get_or_create(name=name, defaults={'description': desc})
            dept_map[name] = dept
            self.stdout.write(f'  Dept: {name}')

        self.stdout.write(self.style.MIGRATE_HEADING('Seeding knowledge categories...'))
        cat_map = {}
        for cat_name in CATEGORIES:
            cat, _ = KnowledgeCategory.objects.get_or_create(name=cat_name)
            cat_map[cat_name] = cat

        self.stdout.write(self.style.MIGRATE_HEADING('Seeding admin...'))
        admin, created = User.objects.get_or_create(
            email='admin@ssd.dev',
            defaults={
                'first_name': 'Super', 'last_name': 'Admin',
                'role': 'admin', 'is_staff': True, 'is_superuser': False,
                'is_active': True,
            }
        )
        if created:
            admin.set_password('Admin@123456')
            admin.save()
            self.stdout.write('  Created admin@ssd.dev / Admin@123456')
        else:
            self.stdout.write('  admin@ssd.dev already exists')

        # Legacy back-compatibility admin
        legacy_admin, created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'first_name': 'Legacy', 'last_name': 'Admin',
                'role': 'admin', 'is_staff': True, 'is_superuser': False,
                'is_active': True,
            }
        )
        if created:
            legacy_admin.set_password('password')
            legacy_admin.save()
            self.stdout.write('  Created legacy admin@example.com / password')

        self.stdout.write(self.style.MIGRATE_HEADING('Seeding agents...'))
        agent_objs = []

        # Legacy back-compatibility agent
        legacy_agent, created = User.objects.get_or_create(
            email='agent@example.com',
            defaults={
                'first_name': 'Legacy', 'last_name': 'Agent',
                'role': 'agent', 'is_active': True,
                'is_available': True,
                'max_active_tickets': 10,
                'expertise_score': 85.0,
                'success_rate': 90.0,
                'department': dept_map.get('IT Support'),
            }
        )
        if created:
            legacy_agent.set_password('password')
            legacy_agent.save()
            self.stdout.write('  Created legacy agent@example.com / password')
        agent_objs.append(legacy_agent)

        DOMAIN_EXPERTISE = {
            'hr.agent@company.com': ['Leave Request', 'Payroll Query', 'Leave Request'],
            'network.agent@company.com': ['VPN Access', 'Network Connectivity', 'Security Incident'],
            'finance.agent@company.com': ['Payroll Query', 'Expense Claim', 'Payroll Query'],
            'facilities.agent@company.com': ['Office Maintenance', 'Access Control', 'Office Maintenance'],
            'admin.agent@company.com': ['Security Incident', 'Software Installation', 'Security Incident'],
        }

        for first, last, email, dept_name in AGENTS:
            agent, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first, 'last_name': last,
                    'role': 'agent', 'is_active': True,
                    'is_available': random.choice([True, True, True, False]),
                    'max_active_tickets': random.randint(5, 15),
                    'expertise_score': round(random.uniform(60, 95), 1),
                    'success_rate': round(random.uniform(70, 98), 1),
                    'department': dept_map.get(dept_name),
                }
            )
            if created:
                agent.set_password('Agent@123456')
                agent.save()
                self.stdout.write(f'  Created agent: {email}')
            else:
                self.stdout.write(f'  Agent exists: {email}')
            agent_objs.append(agent)

            # Add expertise records
            email_key = agent.email
            if email_key in DOMAIN_EXPERTISE:
                assigned_cats = DOMAIN_EXPERTISE[email_key]
            else:
                assigned_cats = random.sample(CATEGORIES, k=3)

            for cat_name in assigned_cats:
                cat_obj = cat_map.get(cat_name)
                if cat_obj:
                    AgentExpertise.objects.get_or_create(
                        agent=agent, category=cat_obj,
                        defaults={
                            'expertise_level': 'High' if email_key in DOMAIN_EXPERTISE else random.choice(['Low', 'Medium', 'High']),
                            'resolved_count': random.randint(10, 50) if email_key in DOMAIN_EXPERTISE else random.randint(0, 50),
                        }
                    )

        self.stdout.write(self.style.MIGRATE_HEADING('Seeding customers...'))
        customer_objs = []

        # Legacy back-compatibility customer
        legacy_cust, created = User.objects.get_or_create(
            email='customer@faith.com',
            defaults={
                'first_name': 'Legacy', 'last_name': 'Customer',
                'role': 'customer', 'is_active': True,
            }
        )
        if created:
            legacy_cust.set_password('password')
            legacy_cust.save()
            self.stdout.write('  Created legacy customer@faith.com / password')
        customer_objs.append(legacy_cust)

        for first, last, email in CUSTOMERS:
            cust, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first, 'last_name': last,
                    'role': 'customer', 'is_active': True,
                }
            )
            if created:
                cust.set_password('Customer@123456')
                cust.save()
                self.stdout.write(f'  Created customer: {email}')
            else:
                self.stdout.write(f'  Customer exists: {email}')
            customer_objs.append(cust)

        self.stdout.write(self.style.MIGRATE_HEADING('Seeding tickets...'))
        now = timezone.now()
        ticket_count = 0

        # Start counter beyond existing tickets to avoid collisions
        existing_max = Ticket.objects.count()
        ticket_serial = existing_max + 1

        # Generate 2 tickets per subject entry (40 total)
        for subject, dept_name in TICKET_SUBJECTS * 2:
            customer = random.choice(customer_objs)
            dept = dept_map.get(dept_name)
            priority = random.choices(PRIORITIES, weights=PRIORITY_WEIGHTS)[0]
            ticket_status = random.choices(STATUSES, weights=STATUS_WEIGHTS)[0]
            sentiment = random.choice(SENTIMENTS)
            created_days_ago = random.randint(1, 60)
            created_at = now - timedelta(days=created_days_ago)

            # Assign agent from the matching department
            dept_agents = [a for a in agent_objs if a.department and a.department.name == dept_name]
            agent = random.choice(dept_agents) if dept_agents else random.choice(agent_objs)

            resolved_at = None
            assigned_at = None
            if ticket_status in ('assigned', 'in_progress', 'resolved', 'closed'):
                assigned_at = created_at + timedelta(hours=random.randint(1, 8))
            if ticket_status in ('resolved', 'closed'):
                resolved_at = assigned_at + timedelta(hours=random.randint(2, 72))

            is_escalated = (priority == 'critical') or (random.random() < 0.08)

            # Pre-assign ticket number to avoid race on count query
            date_str = (now - timedelta(days=created_days_ago)).strftime('%Y%m%d')
            ticket_number = f"TKT-{date_str}-{ticket_serial:04d}"
            ticket_serial += 1

            ticket = Ticket(
                ticket_number=ticket_number,
                customer=customer,
                agent=agent if ticket_status != 'new' else None,
                department=dept,
                subject=subject,
                description=f'This is a demo ticket for: {subject}. '
                            f'The user is experiencing issues and needs assistance from the {dept_name} team.',
                priority=priority,
                status=ticket_status,
                sentiment=sentiment,
                is_escalated=is_escalated,
                ai_suggested_priority=priority,
                ai_classification_confidence=round(random.uniform(0.70, 0.98), 2),
                assigned_at=assigned_at,
                resolved_at=resolved_at,
            )
            # Set SLA deadlines
            sla_hours = {'low': 72, 'medium': 24, 'high': 8, 'critical': 4}[priority]
            ticket.first_response_sla = created_at + timedelta(hours=1)
            ticket.resolution_sla = created_at + timedelta(hours=sla_hours)

            ticket.save()

            # Manually set created_at (auto_now_add bypass)
            Ticket.objects.filter(pk=ticket.pk).update(created_at=created_at)

            # Add a sample message thread
            TicketMessage.objects.create(
                ticket=ticket,
                author=customer,
                content=f'Hi team, I need help with: {subject}. Please assist at your earliest convenience.',
            )
            if ticket_status not in ('new',) and agent:
                TicketMessage.objects.create(
                    ticket=ticket,
                    author=agent,
                    content=f'Hello! I have received your request and will investigate this shortly. '
                            f'Please provide any additional details that may help us resolve this faster.',
                )
            if ticket_status in ('resolved', 'closed') and agent:
                TicketMessage.objects.create(
                    ticket=ticket,
                    author=agent,
                    content=f'This issue has been resolved. Please let us know if you need further assistance.',
                )

            ticket_count += 1

        # Seed FAQs
        FAQS_TO_SEED = [
            ("How do I connect to the corporate VPN?", 
             "To connect to the corporate VPN, use the Cisco AnyConnect client. Enter the server address vpn.company.com, input your username (email) and password, and approve the multi-factor authentication (MFA) prompt on your mobile device.", 
             "VPN Access"),
            ("What should I do if the office Wi-Fi drops frequently?",
             "If the office Wi-Fi connection is unstable, try forgetting the 'Company-Staff' network, restarting your Wi-Fi interface, and reconnecting. If the issue persists, your laptop wireless card drivers may need an update from IT Support.",
             "Network Connectivity"),
            ("How do I request annual leave or sick leave?",
             "Annual leave and sick leave requests must be submitted through the HR Portal (hr.company.com) at least two weeks in advance. Once submitted, your direct manager will receive an approval notification. Sick leave requires a medical certificate if it exceeds three consecutive days.",
             "Leave Request"),
            ("What is the annual leave allowance for full-time employees?",
             "Full-time employees receive 20 days of paid annual leave per calendar year, accrued monthly. Up to 5 unused leave days can be carried over to the next calendar year, but must be utilized within the first quarter (by March 31st).",
             "Leave Request"),
            ("When is the monthly salary paid and how do I access my payslips?",
             "Salaries are paid on the 25th of each month (or the preceding business day if the 25th falls on a weekend). You can view and download your monthly payslips in the Finance Employee Portal under the 'Payroll' tab.",
             "Payroll Query"),
            ("How do I submit an expense claim for business travel?",
             "All business expenses must be logged via the Expense Claim Portal (expenses.company.com). You must upload itemized receipts for each expense. Claims must be submitted within 30 days of incurring the expense and are reimbursed in the next payroll cycle.",
             "Expense Claim"),
            ("How do I report a broken facility or office maintenance issue?",
             "To report broken facilities, air conditioning malfunctions, or office maintenance issues, create a support ticket with the 'Facilities' department. Please specify the room number/location and describe the issue in detail.",
             "Office Maintenance"),
            ("What should I do if my building access card is lost or not working?",
             "If your building access card is lost, stolen, or malfunctioning, report it immediately to the Facilities Team. You can request a replacement card at the security desk on the ground floor. A replacement card requires manager approval and take up to 24 hours to program.",
             "Access Control"),
            ("How do I request security clearance for external contractors?",
             "Security clearance requests for external contractors must be submitted to the Administration department via the Contractor Access Request Form. Submissions require the contractor's full name, company, visit purpose, date/time, and a host manager signature.",
             "Security Incident"),
            ("What is the process to request compliance document signatures?",
             "Compliance documents requiring executive or manager signatures should be uploaded to DocuSign and routed to the Administration Team. Ensure all background verification fields are pre-filled before initiating the signature request.",
             "Security Incident")
        ]
        
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding FAQs...'))
        for q, a, cat in FAQS_TO_SEED:
            FAQ.objects.get_or_create(
                question=q,
                defaults={'answer': a, 'category': cat}
            )
            self.stdout.write(f"  Created FAQ: {q[:30]}...")

        # Seed Knowledge Documents
        import os
        from django.conf import settings
        
        # Ensure media directory exists
        documents_dir = os.path.join(settings.MEDIA_ROOT, 'documents')
        os.makedirs(documents_dir, exist_ok=True)
        
        KB_DOCS_DATA = [
            {
                'title': 'VPN and Network Support Guide',
                'filename': 'vpn_network_guide.txt',
                'categories': ['VPN Access', 'Network Connectivity'],
                'content': """VPN and Network Support Guide
This document details network access policies.
VPN Connection: Employees must use the Cisco AnyConnect client. The VPN server is vpn.company.com. Log in using your work email and password. Multi-factor authentication (MFA) approval is required for all connections.
Office Wi-Fi: The primary network is 'Company-Staff'. Authenticate using your domain credentials. If connectivity is unstable, clear the network profile and rejoin.
DNS and IP: All office networks use DHCP. If you encounter host resolution errors, try flushing your local DNS cache using 'ipconfig /flushdns' on Windows."""
            },
            {
                'title': 'HR Policies and Employee Handbook',
                'filename': 'hr_employee_handbook.txt',
                'categories': ['Leave Request'],
                'content': """HR Policies and Employee Handbook
Welcome to the company. This document outlines key HR policies.
Working Hours: Standard working hours are 9:00 AM to 6:00 PM.
Annual Leave: Full-time employees accrue 20 days of paid annual leave per year. Accrual occurs monthly. Leave requests must be submitted via the HR Portal (hr.company.com) and approved by your manager at least two weeks in advance.
Sick Leave: If you are unwell, notify your manager by 9:30 AM. Sick leaves exceeding three consecutive days require a medical certificate.
Benefits: Employees are enrolled in the company health and dental insurance plan from day one. Details are available on the Benefits portal."""
            },
            {
                'title': 'Finance Reimbursement Guidelines',
                'filename': 'finance_reimbursement_guidelines.txt',
                'categories': ['Expense Claim', 'Payroll Query'],
                'content': """Finance Reimbursement Guidelines
This document governs company expenditures and payroll.
Expense Reimbursement: Travel, meals, and client expenses must be logged via expenses.company.com. All claims must be accompanied by itemized receipts. Claims submitted after 30 days will be rejected. Reimbursements are processed with the next payroll.
Payroll: Salaries are paid on the 25th of each month. Direct deposit details can be updated via the finance portal. For payroll discrepancies, contact the payroll team at payroll@company.com."""
            },
            {
                'title': 'Facilities and Access Control Procedures',
                'filename': 'facilities_access_procedures.txt',
                'categories': ['Office Maintenance', 'Access Control'],
                'content': """Facilities and Access Control Procedures
This document details office facilities and access rules.
Building Access: All employees must wear their building access cards at all times. If a card is lost or damaged, report it to the facilities desk immediately. Card replacement costs $15 and requires management approval.
Office Maintenance: To report a facilities issue (broken AC, lights, leak), log a request in the ticketing portal. Emergency maintenance should be reported directly to security on ext. 5555."""
            },
            {
                'title': 'Admin Compliance and Contractor Security Procedures',
                'filename': 'admin_compliance_procedures.txt',
                'categories': ['Security Incident', 'Software Installation'],
                'content': """Admin Compliance and Contractor Security Procedures
This document details administrative support and contractor procedures.
Contractor Clearance: External contractors require temporary visitor badges. Submit the Contractor Access Request form at least 48 hours before the visit. The host employee must escort contractors at all times.
Compliance Signatures: Compliance documents requiring executive signatures must be uploaded to DocuSign and sent to compliance@company.com."""
            }
        ]
        
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding Knowledge Documents & Vector Syncing...'))
        
        from ai_services.services.document_processor import process_document
        from ai_services.services.embedding_processor import EmbeddingProcessor
        from ai_services.services.chromadb_sync import ChromaDBSynchronizer
        
        ep = EmbeddingProcessor()
        sync = ChromaDBSynchronizer()
        
        for doc in KB_DOCS_DATA:
            # Clean up existing to prevent duplicate chunks
            KnowledgeDocument.objects.filter(title=doc['title']).delete()

            # Write content to file on disk
            full_path = os.path.join(documents_dir, doc['filename'])
            with open(full_path, 'w', encoding='utf-8') as f_out:
                f_out.write(doc['content'].strip())
            
            # Create relative path for django FileField
            relative_path = f"documents/{doc['filename']}"
            
            doc_obj = KnowledgeDocument.objects.create(
                title=doc['title'],
                file=relative_path
            )
            
            # Associate categories
            for cat_name in doc['categories']:
                cat_el = cat_map.get(cat_name)
                if cat_el:
                    doc_obj.categories.add(cat_el)
            
            # Process chunking
            num_chunks = process_document(doc_obj)
            self.stdout.write(f"  Created document: '{doc['title']}' with {num_chunks} chunks.")
            
            # Generate Embeddings
            _, success_embed, failed_embed = ep.process_document_chunks(doc_obj)
            self.stdout.write(f"    Embedded chunks: {success_embed} success, {failed_embed} failed.")
            
            # Sync to ChromaDB
            _, synced, failed_sync = sync.sync_document(doc_obj, force=True)
            self.stdout.write(f"    ChromaDB sync: {synced} synced, {failed_sync} failed.")

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Demo data seeded successfully:'
        ))
        self.stdout.write(f'  Departments : {len(DEPARTMENTS)}')
        self.stdout.write(f'  Categories  : {len(CATEGORIES)}')
        self.stdout.write(f'  Agents      : {len(AGENTS)}')
        self.stdout.write(f'  Customers   : {len(CUSTOMERS)}')
        self.stdout.write(f'  Tickets     : {ticket_count}')
        self.stdout.write('')
        self.stdout.write('Login credentials:')
        self.stdout.write('  Admin         : admin@ssd.dev          / Admin@123456')
        self.stdout.write('  HR Agent      : hr.agent@company.com   / Agent@123456')
        self.stdout.write('  Network Agent : network.agent@company.com / Agent@123456')
        self.stdout.write('  Customer      : grace.park@customer.com / Customer@123456')
        self.stdout.write('  Legacy Admin  : admin@example.com      / password')
        self.stdout.write('  Legacy Agent  : agent@example.com      / password')
        self.stdout.write('  Legacy User   : customer@faith.com     / password')
