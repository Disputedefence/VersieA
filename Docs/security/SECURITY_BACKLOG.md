## Betekenis van prioriteiten

- **P0** = Absolute release blockers  
  Zonder deze items mag de applicatie niet live met betalende klanten.

- **P1** = Verplicht na live / tijdens beta  
  Deze items mogen niet vergeten worden, maar blokkeren de eerste livegang niet.

# Security Backlog — DisputeDefender

## P0 (Release blockers — required before first paying customer)

- Security Owner appointed + veto-right
- Tenant isolation enforced (RLS / tenant_id scoping) + cross-tenant test
- Audit logs for all state changes + admin actions (append-only)
- Webhook signature verification + timestamp + idempotency
- Secure evidence upload (private storage, type/size limits) + audit event
- Retention & deletion flows (incl. tenant offboarding purge) + deletion evidence
- Backups enabled + 1 restore test completed (RPO<=24h, RTO<=4h)
- Incident runbook (SEV1/2/3 + containment steps)

## P1 (Required during/after paid beta, but not a day-1 blocker)

- Alerts/monitoring for auth abuse, webhook failures, rate-limit abuse
- Supplier register + exit plan per supplier
- Incident tabletop exercise (1x)
- PII masking in UI for sensitive fields + audit on reveal
- Secure client-side caching (optional) with TTL

## Release afspraak

- Een release naar productie vereist dat **alle P0-items zijn afgerond**
- Afwijkingen mogen alleen met expliciete goedkeuring van de Security Owner

## Pre-live P0 planning (first paid customer)

The following P0 items must be completed before the first paying customer is onboarded:

1. Security governance in place (Security Owner + veto)
2. Tenant isolation enforced and verified
3. Audit logging for all state-changing actions
4. Secure webhook handling (signature, timestamp, idempotency)
5. Secure evidence upload (private storage + validation)
6. Data retention & tenant offboarding deletion
7. Backups enabled + restore test completed
8. Incident runbook available (SEV1/2/3)

Any missing item = NO GO LIVE.
