import logging
from django.core.management.base import BaseCommand
from faq.models import FAQ

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seed the FAQ table with common IT, HR, finance, and facilities questions and answers"

    FAQ_DATA = [
        # ── Account & Password ─────────────────────────────────────────────
        {
            "question": "How do I reset my password?",
            "answer": (
                "To reset your password:\n"
                "1. Go to the login page and click 'Forgot Password'.\n"
                "2. Enter your registered email address.\n"
                "3. Check your inbox for a reset link (may take up to 5 minutes).\n"
                "4. Click the link, enter a new password, and confirm it.\n"
                "5. Log in with your new credentials.\n\n"
                "If you do not receive the email, check your spam/junk folder. "
                "If the problem persists, create a support ticket."
            ),
            "category": "Account",
        },
        {
            "question": "My account is locked. How do I unlock it?",
            "answer": (
                "After several failed login attempts your account is temporarily locked for security. "
                "Wait 15 minutes and try again, or click 'Forgot Password' to reset your credentials immediately. "
                "If your account is still locked after that, contact the IT helpdesk or create a support ticket."
            ),
            "category": "Account",
        },
        {
            "question": "How do I change my password after logging in?",
            "answer": (
                "Once logged in:\n"
                "1. Click your profile icon in the top-right corner.\n"
                "2. Select 'Account Settings' or 'Profile'.\n"
                "3. Navigate to the 'Security' or 'Password' section.\n"
                "4. Enter your current password and your new password twice.\n"
                "5. Click 'Save Changes'."
            ),
            "category": "Account",
        },
        {
            "question": "How do I enable multi-factor authentication (MFA)?",
            "answer": (
                "To enable MFA:\n"
                "1. Go to Account Settings → Security.\n"
                "2. Click 'Enable Two-Factor Authentication'.\n"
                "3. Scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator).\n"
                "4. Enter the 6-digit code to confirm setup.\n"
                "MFA adds an extra layer of protection to your account."
            ),
            "category": "Security",
        },
        # ── Tickets & Support ──────────────────────────────────────────────
        {
            "question": "How do I create a support ticket?",
            "answer": (
                "To create a support ticket:\n"
                "1. Log in to the Smart Service Desk portal.\n"
                "2. Click 'New Ticket' or the '+' button from your dashboard.\n"
                "3. Enter a clear subject and a detailed description of your issue.\n"
                "4. Optionally attach screenshots or documents (max 10 MB).\n"
                "5. Click 'Submit Request'.\n\n"
                "Your ticket will be automatically classified and routed to the right team."
            ),
            "category": "Support",
        },
        {
            "question": "How long does it take to get a response to my ticket?",
            "answer": (
                "Response times depend on ticket priority:\n"
                "• Critical: within 1 hour\n"
                "• High: within 4 hours\n"
                "• Medium: within 1 business day\n"
                "• Low: within 3 business days\n\n"
                "You will receive an email notification when your ticket status changes."
            ),
            "category": "Support",
        },
        {
            "question": "How do I check the status of my support ticket?",
            "answer": (
                "Log in to the portal and go to 'My Tickets' from the navigation menu. "
                "Each ticket shows its current status: New, Assigned, In Progress, Resolved, or Closed. "
                "Click on any ticket to view the full conversation thread and agent updates."
            ),
            "category": "Support",
        },
        {
            "question": "Can I attach a file or screenshot to my ticket?",
            "answer": (
                "Yes. When creating or replying to a ticket, click the attachment icon (paperclip) "
                "and select your file. Supported formats include images (PNG, JPG), PDFs, Word documents, "
                "and text files. The maximum file size is 10 MB per attachment."
            ),
            "category": "Support",
        },
        # ── VPN & Network ──────────────────────────────────────────────────
        {
            "question": "How do I connect to the company VPN?",
            "answer": (
                "To connect to the VPN:\n"
                "1. Install the VPN client (GlobalProtect or Cisco AnyConnect) from the software portal.\n"
                "2. Open the VPN client and enter the server address provided by IT.\n"
                "3. Enter your company username and password.\n"
                "4. Complete MFA verification if prompted.\n"
                "5. Click 'Connect'. The icon will turn green when connected.\n\n"
                "If you cannot connect, ensure you are using your current network password and MFA is set up."
            ),
            "category": "VPN",
        },
        {
            "question": "My internet connection is slow or dropping. What should I do?",
            "answer": (
                "Try these steps:\n"
                "1. Restart your router/modem by unplugging it for 30 seconds.\n"
                "2. Move closer to the Wi-Fi access point or use a wired connection.\n"
                "3. Disconnect other devices consuming bandwidth.\n"
                "4. Forget the Wi-Fi network and reconnect.\n"
                "5. Run a speed test at speedtest.net to check your connection.\n\n"
                "If the problem continues, create a support ticket with your speed test results."
            ),
            "category": "Networking",
        },
        {
            "question": "How do I connect to the company Wi-Fi?",
            "answer": (
                "Select your office Wi-Fi network (usually named CORP-WiFi or similar) from your device's network list. "
                "Use your standard company username and password. "
                "If prompted for a certificate, click 'Trust' or 'Accept'. "
                "Contact IT if you do not have Wi-Fi credentials."
            ),
            "category": "Networking",
        },
        # ── Email ──────────────────────────────────────────────────────────
        {
            "question": "How do I set up my company email on my phone?",
            "answer": (
                "For iOS (iPhone/iPad):\n"
                "Settings → Mail → Accounts → Add Account → Microsoft Exchange\n"
                "Enter your email and company password.\n\n"
                "For Android:\n"
                "Settings → Accounts → Add Account → Exchange\n"
                "Enter your email, server address (outlook.office365.com), and password.\n\n"
                "Sync may take a few minutes. Contact IT if setup fails."
            ),
            "category": "Email",
        },
        {
            "question": "I am not receiving emails. What should I do?",
            "answer": (
                "1. Check your Spam or Junk folder — the email may have been filtered.\n"
                "2. Ensure your mailbox is not full (check storage in Outlook settings).\n"
                "3. Check any email rules or filters that may redirect messages.\n"
                "4. Try sending a test email to yourself.\n"
                "5. If the issue continues, create a support ticket with the sender's email and time of the missing email."
            ),
            "category": "Email",
        },
        # ── Hardware ───────────────────────────────────────────────────────
        {
            "question": "My computer is running slowly. What can I do?",
            "answer": (
                "Try these steps to improve performance:\n"
                "1. Restart your computer — this clears memory and applies pending updates.\n"
                "2. Close unused browser tabs and applications.\n"
                "3. Check Task Manager (Ctrl+Shift+Esc) for processes using high CPU or memory.\n"
                "4. Run a disk cleanup: search 'Disk Cleanup' in the Start menu.\n"
                "5. Ensure Windows is up to date.\n\n"
                "If the problem persists after a restart, create a support ticket."
            ),
            "category": "Hardware",
        },
        {
            "question": "How do I request a new laptop or hardware equipment?",
            "answer": (
                "Submit a hardware request ticket through the portal:\n"
                "1. Create a new ticket and select 'Hardware' as the category.\n"
                "2. Specify the equipment needed, business justification, and urgency.\n"
                "3. Your manager may need to approve the request.\n"
                "IT will contact you for delivery or pickup once approved."
            ),
            "category": "Hardware",
        },
        {
            "question": "My monitor is not displaying anything. What should I check?",
            "answer": (
                "1. Check that the monitor is powered on (look for a power LED).\n"
                "2. Ensure the video cable (HDMI, DisplayPort, or VGA) is securely connected to both the monitor and computer.\n"
                "3. Try pressing the monitor's input/source button to select the correct input.\n"
                "4. Restart the computer.\n"
                "5. Try connecting a different cable or monitor to isolate the issue.\n\n"
                "If none of these work, submit a hardware support ticket."
            ),
            "category": "Hardware",
        },
        {
            "question": "How do I report a facilities issue like a broken AC or lighting problem?",
            "answer": (
                "If something in the office needs repair, follow these steps:\n"
                "1. Log in to the Smart Service Desk portal.\n"
                "2. Create a new ticket and select 'Facilities' or 'Office Maintenance'.\n"
                "3. Describe the issue clearly, including the location, equipment, and any safety concerns.\n"
                "4. Attach a photo if available.\n\n"
                "The facilities team will review the request and schedule repairs or maintenance."
            ),
            "category": "Facilities",
        },
        {
            "question": "Who do I contact for parking, building maintenance, or office facilities support?",
            "answer": (
                "For parking, building maintenance, or general facilities issues, submit a facilities ticket through the Smart Service Desk portal. "
                "Select the 'Facilities' category and include the relevant location and issue details.\n\n"
                "If the issue is urgent or safety-related, mark it as high priority and notify the facilities team directly if contact details are available."
            ),
            "category": "Facilities",
        },
        {
            "question": "How do I request ergonomic equipment or workspace changes?",
            "answer": (
                "To request ergonomic equipment or workspace adjustments:\n"
                "1. Create a new ticket in the portal.\n"
                "2. Choose 'Facilities' or 'Workspace Support'.\n"
                "3. Describe the changes you need, such as a standing desk, keyboard tray, chair adjustment, or monitor placement.\n"
                "4. Include any medical or ergonomic guidance if available.\n\n"
                "Facilities will evaluate the request and coordinate delivery or setup."
            ),
            "category": "Facilities",
        },
        {
            "question": "What should I do if the office kitchen or restroom needs repair?",
            "answer": (
                "For kitchen or restroom repairs, create a facilities ticket in the Smart Service Desk portal. "
                "Provide the building, floor, and a brief description of the problem so the facilities team can respond quickly.\n\n"
                "If the issue is a safety hazard, mark the ticket as high priority and notify the site manager immediately."
            ),
            "category": "Facilities",
        },
        # ── Software ───────────────────────────────────────────────────────
        {
            "question": "How do I install a software application?",
            "answer": (
                "Standard software is available from the company Software Portal:\n"
                "1. Go to the Software Portal link provided by IT.\n"
                "2. Find the application you need and click 'Install'.\n"
                "3. The installation will run silently in the background.\n\n"
                "For software not in the portal, submit a software request ticket with the application name, "
                "version, and business purpose. Admin approval may be required."
            ),
            "category": "Software",
        },
        {
            "question": "How do I update Windows on my company computer?",
            "answer": (
                "1. Click the Start button and go to Settings → Update & Security → Windows Update.\n"
                "2. Click 'Check for updates'.\n"
                "3. Download and install any pending updates.\n"
                "4. Restart when prompted.\n\n"
                "Note: Some updates are pushed automatically by IT. "
                "Do not delay restarts for too long as security patches are time-sensitive."
            ),
            "category": "Windows",
        },
        # ── HR & Payroll ───────────────────────────────────────────────────
        {
            "question": "How do I apply for leave?",
            "answer": (
                "To apply for leave:\n"
                "1. Log in to the HR portal.\n"
                "2. Go to 'Leave Management' → 'Apply for Leave'.\n"
                "3. Select the leave type (Annual, Sick, Casual, etc.).\n"
                "4. Enter the start and end dates and an optional reason.\n"
                "5. Submit for manager approval.\n\n"
                "You will receive an email when your leave request is approved or rejected."
            ),
            "category": "Leave Management",
        },
        {
            "question": "What types of leave am I eligible for?",
            "answer": (
                "Company leave types typically include Annual Leave, Sick Leave, Casual Leave, "
                "Maternity/Paternity Leave, and Bereavement Leave. "
                "Eligibility depends on your employment status, length of service, and local policy.\n\n"
                "Check the HR portal leave policy section or contact HR for any special eligibility questions."
            ),
            "category": "Leave Management",
        },
        {
            "question": "How do I check my remaining leave balance?",
            "answer": (
                "To review your leave balance:\n"
                "1. Log in to the HR portal.\n"
                "2. Go to 'Leave Management' → 'Leave Balance' or 'My Time Off'.\n"
                "3. Select the relevant leave type and period.\n\n"
                "If your balance is incorrect, submit an HR ticket with the dates and type of leave in question."
            ),
            "category": "Leave Management",
        },
        {
            "question": "How can I request maternity or paternity leave?",
            "answer": (
                "To request maternity or paternity leave:\n"
                "1. Log in to the HR portal.\n"
                "2. Go to 'Leave Management' → 'Request Leave'.\n"
                "3. Select the appropriate leave type and enter the leave dates.\n"
                "4. Attach any required documentation, such as medical certificates.\n"
                "5. Submit the request for manager and HR approval.\n\n"
                "HR will notify you of the decision and any next steps."
            ),
            "category": "Leave Management",
        },
        {
            "question": "What should I do if I need emergency leave?",
            "answer": (
                "If you need emergency leave:\n"
                "1. Submit an urgent leave request through the HR portal and choose 'Emergency Leave' if available.\n"
                "2. Notify your manager directly, if possible.\n"
                "3. Provide a brief reason and expected return date.\n\n"
                "If the portal is unavailable, contact HR by phone or email and then create an HR support ticket."
            ),
            "category": "Leave Management",
        },
        {
            "question": "How do I access my payslip?",
            "answer": (
                "To view your payslip:\n"
                "1. Log in to the HR/Payroll portal.\n"
                "2. Navigate to 'Payroll' → 'My Payslips'.\n"
                "3. Select the pay period and click 'Download' to save as PDF.\n\n"
                "Payslips are generated on the last working day of each month. "
                "If your payslip is missing, create an HR support ticket."
            ),
            "category": "Payroll",
        },
        {
            "question": "What are the company's business hours and support availability?",
            "answer": (
                "Standard business hours are Monday to Friday, 9:00 AM to 6:00 PM local time. "
                "The IT helpdesk is available during business hours. "
                "For critical system outages outside of hours, an on-call engineer is available — "
                "mark your ticket as 'Critical' for priority escalation."
            ),
            "category": "General",
        },
        {
            "question": "Where can I find billing and invoice information?",
            "answer": (
                "Billing and invoice information is managed through the Finance portal:\n"
                "1. Log in to the Finance portal.\n"
                "2. Go to 'Billing' → 'Invoices'.\n"
                "3. Filter by date range to find specific invoices.\n"
                "4. Click any invoice to view or download it as PDF.\n\n"
                "For billing disputes or missing invoices, contact the Finance team or submit a Finance ticket."
            ),
            "category": "Finance",
        },
        {
            "question": "How do I report a phishing or suspicious email?",
            "answer": (
                "Do NOT click any links or download attachments from the suspicious email. "
                "To report it:\n"
                "1. Forward the email to security@company.com as an attachment.\n"
                "2. Create a Security support ticket describing the email (sender, subject, time received).\n"
                "3. Delete the email from your inbox.\n\n"
                "The security team will investigate and respond within 4 hours for active threats."
            ),
            "category": "Security",
        },
        {
            "question": "How do I print a document?",
            "answer": (
                "1. Ensure the printer is on and connected to the network.\n"
                "2. Open your document and press Ctrl+P (Windows) or Cmd+P (Mac).\n"
                "3. Select the correct printer from the list.\n"
                "4. Choose your print settings (copies, colour, paper size) and click Print.\n\n"
                "If the printer does not appear, you may need to install the printer driver. "
                "Go to Settings → Printers & Scanners → Add a Printer, or contact IT."
            ),
            "category": "Hardware",
        },
    ]

    def handle(self, *args, **options):
        self.stdout.write("Seeding FAQ entries...")
        created_count = 0
        skipped_count = 0

        for entry in self.FAQ_DATA:
            faq, created = FAQ.objects.get_or_create(
                question=entry["question"],
                defaults={
                    "answer": entry["answer"],
                    "category": entry["category"],
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"  + Created: {entry['question'][:60]}")
            else:
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created {created_count} FAQs, skipped {skipped_count} (already existed)."
            )
        )
