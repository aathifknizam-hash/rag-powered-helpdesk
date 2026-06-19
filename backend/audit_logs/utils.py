from .models import AuditLog


def create_audit_log(user, action, entity_type="system", entity_id="", ip_address=None):
    return AuditLog.objects.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else "",
        ip_address=ip_address,
    )
