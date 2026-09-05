---
id: privileged-access-admin-rights
title: Privileged Access and Local Administrator Rights
category: IT
version: "2.0"
owner: Security Operations
effective: 2026-03-01
review: 2027-03-01
---

# Privileged Access and Local Administrator Rights

## 1. Purpose

This standard covers elevated permissions: local administrator rights on a Zuqah Technologies
laptop, and privileged roles in Zuqah Technologies systems. It sets out who may hold them,
for how long, and what is expected of anyone who does.

The principle throughout is that elevation is temporary and specific. Standing
administrative access is the exception, not the arrangement.

## 2. Standard user accounts

All employees receive a standard user account. It permits everything most roles
need, including:

- Installing software from the Zuqah Technologies Software Portal
- Connecting printers, docking stations and peripherals
- Changing display, network, power and accessibility settings
- Creating and managing local files

Before requesting elevation, check whether the task actually requires it. A
significant share of admin rights requests are for installing software that is
already available in the Software Portal and needs no elevation at all.

## 3. Temporary local administrator rights

### 3.1 What it is

Time-limited administrator rights on your own Zuqah Technologies laptop. It does not grant
access to servers, to other people's devices or to any Zuqah Technologies system.

### 3.2 Requesting it

Raise a request in the IT portal stating:

- What you need to do
- Why the Software Portal does not cover it
- How long you need — the maximum is **8 hours**

Requests are approved by your line manager and reviewed by Security Operations.
Turnaround is normally within **4 business hours** during business hours.

### 3.3 Duration and renewal

Rights are granted for the requested period up to a maximum of 8 hours and expire
automatically. There is no need to request removal.

Renewal is possible but the second and subsequent requests within a rolling
30-day period are reviewed by Security Operations rather than approved
automatically. Repeated renewal usually indicates that the underlying need should
be met a different way — by adding the software to the Software Portal, or by
provisioning a development environment.

### 3.4 Standing rights

Permanent local administrator rights are granted only to members of End User
Computing and Security Operations, and only on their own devices. There is no
process by which other roles obtain standing rights; requests for them are
declined and redirected to section 3.2.

## 4. Developer machines

Engineers who need to install development tooling frequently may request a
**developer profile** rather than repeated elevation. The profile permits
installation from approved package managers and container runtimes without
per-instance approval.

It requires practice lead approval, is reviewed every **six months**, and carries
the additional obligations in section 6. It does not grant administrator rights to
system settings, security configuration or device management.

## 5. Privileged roles in Zuqah Technologies systems

Roles that can change configuration, access other users' data, or alter
permissions are managed separately from device administrator rights.

| Role type | Approval | Maximum duration | Review |
| --- | --- | --- | --- |
| Application administrator | System owner | 12 months | Quarterly |
| Directory administrative role | Security Operations | 8 hours, activated on demand | Every activation |
| Production database access | System owner + Security Operations | 4 hours, activated on demand | Every activation |
| Customer environment access | Governed by the customer's agreement | Per engagement | Per engagement |

Directory and production database roles are not held standing. They are activated
when needed, with a stated reason, and expire automatically.

## 6. Obligations while elevated

Anyone holding elevated permissions, for any duration, must:

- Use them only for the stated purpose
- Not install software from outside approved sources
- Not disable, alter or bypass endpoint protection, disk encryption or logging
- Not create additional local accounts
- Not grant elevation to anyone else

Elevated sessions are logged, including commands executed with elevation. Logs are
retained for **12 months**.

## 7. Removal

Rights are removed automatically on expiry. They are removed immediately, without
notice, when:

- The employee changes role, and the new role has no equivalent need
- The employee leaves Zuqah Technologies
- A security investigation is opened involving the account
- The obligations in section 6 are breached

## 8. Emergency access

Where a P1 incident requires elevation faster than section 3.2 allows, the
on-call Security Operations engineer may grant it immediately for up to **4
hours**. The grant is recorded at the time and reviewed the following business
day. Emergency access is not a route around normal approval and is audited
accordingly.

---

*Sample content for demonstration purposes. Zuqah Technologies is a fictional company and
this document describes no real organisation's policy.*
