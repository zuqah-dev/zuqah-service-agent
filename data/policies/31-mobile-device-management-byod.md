---
id: mobile-device-management-byod
title: Mobile Device Management and BYOD Policy
category: IT
version: "1.0"
owner: Security Operations
effective: 2026-01-01
review: 2027-01-01
---

# Mobile Device Management and BYOD Policy

## 1. Purpose

This policy covers how company data is protected on mobile devices — both
company-issued and personal devices used for work. It explains what Mobile
Device Management (MDM) is, what IT can and cannot see on enrolled devices,
and the rules for using personal devices (BYOD — Bring Your Own Device).

## 2. Company-issued mobile devices

Zuqah Technologies may provide company mobile phones to employees in specific
roles. Company phones are enrolled in MDM from the time of issue and are
subject to all the rules in section 4.

## 3. BYOD — using a personal device for work

### 3.1 Entitlement

Employees are not required to use personal devices for work. Zuqah Technologies
provides a laptop for all employees.

However, employees who choose to access company email, calendar, Teams or the
HR portal on their personal smartphone or tablet must enrol the device in MDM.

### 3.2 What requires MDM enrolment

The following access requires MDM enrolment:

- Company email (Microsoft Outlook) on a personal phone or tablet
- Microsoft Teams on a personal phone or tablet
- Any company application accessed through the Microsoft Authenticator app
- OneDrive or SharePoint via the mobile app

Accessing the HR portal through a mobile browser does not require MDM
enrolment, but the session is protected by MFA.

### 3.3 Opting out of BYOD

If you do not wish to enrol your personal device in MDM, you may still access
company communication by:

- Using a web browser on your personal device for email and Teams
  (no MDM required)
- Requesting a company-issued device from IT (subject to role eligibility)

## 4. What MDM does on your device

MDM (Microsoft Intune) enforces security policies on enrolled devices. Here
is exactly what it can and cannot do:

### 4.1 What MDM CAN do

| Capability | Purpose |
| --- | --- |
| Enforce PIN / biometric lock on the device | Prevents unauthorised access |
| Encrypt the device storage | Protects data if device is lost |
| Enforce OS update requirements | Keeps the device patched against known vulnerabilities |
| Install required security certificates | Allows access to company systems |
| Remote wipe of **company data only** | Removes company email and apps from the device without touching personal data |
| Full remote wipe of a **company-issued device** | Fully erases company phones if lost or stolen |

### 4.2 What MDM CANNOT do

| | |
| --- | --- |
| Read your personal emails or messages | MDM has no access to personal accounts |
| See your personal photos or files | Personal storage is not accessible |
| Track your location | Location tracking is not enabled in Zuqah Technologies' MDM policy |
| Monitor personal app usage | App inventory is not collected for personal devices |
| See your browsing history | Personal browser data is inaccessible |
| Access your personal contacts (for personal device) | On a personal device, only company contacts in Outlook are managed |

In plain language: MDM can protect company data on your device and wipe it
if needed, but it cannot spy on your personal life.

## 5. Enrolment process

1. Install **Microsoft Intune Company Portal** from the App Store (iOS) or
   Play Store (Android)
2. Sign in with your Zuqah Technologies account
3. Follow the guided enrolment steps. The process takes approximately
   10 minutes
4. Once enrolled, company apps (Outlook, Teams, OneDrive) can be configured

Contact the IT Service Desk at it@zuqahtechnologies.com if you encounter
any issues during enrolment.

## 6. Security requirements for enrolled devices

Enrolled personal and company devices must meet the following requirements:

| Requirement | Standard |
| --- | --- |
| OS version | Within 2 major versions of the current release |
| Screen lock | PIN of minimum 6 digits, pattern or biometric |
| Jailbreak / root | Not permitted — jailbroken devices are blocked from company access |
| Encryption | Enabled (enforced by MDM on enrolment) |

Devices that fall out of compliance (e.g., OS not updated) will be blocked
from company resources until the issue is resolved.

## 7. Lost or stolen devices

If a device used for work — personal or company-issued — is lost or stolen:

1. Report it to the IT Security team immediately:
   security@zuqahtechnologies.com or call the IT helpline
2. IT will initiate a remote wipe of company data on the device
3. Change your Zuqah Technologies password and report any suspicious
   account activity

For personal devices, only company data will be wiped. Your personal photos,
messages and apps will not be touched.

For company-issued devices, a full wipe will be performed.

## 8. Leaving Zuqah Technologies

On your last working day, IT will unenrol your personal device from MDM.
This removes company email, Teams and any managed apps. Your personal data
is completely unaffected.

Company-issued devices must be returned as described in the Leaver and
Offboarding Policy.

## 9. Personal use of company devices

Company phones and laptops are primarily for work use. Limited personal use
(checking personal email, general browsing) is permitted as long as it does
not interfere with work and does not involve accessing inappropriate content.
Full rules are in the IT Acceptable Use Policy.

Company devices are monitored at the network and device level for security
purposes. Employees should have no expectation of privacy for activities
conducted on company devices.

## 10. Contact

**MDM enrolment help:** it@zuqahtechnologies.com

**Lost or stolen device:** security@zuqahtechnologies.com (24-hour response
for security incidents)
