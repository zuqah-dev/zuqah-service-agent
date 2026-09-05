---
id: data-classification
title: Data Classification and Handling Policy
category: IT
version: "1.0"
owner: Security Operations
effective: 2026-01-01
review: 2027-01-01
---

# Data Classification and Handling Policy

## 1. Purpose

Not all information carries the same risk if it is lost or disclosed. This
policy classifies Zuqah Technologies data into four levels and describes how
each level must be handled, stored, shared and disposed of.

Every employee who creates, receives or works with company data is responsible
for handling it according to its classification.

## 2. Classification levels

| Level | Label | Description | Examples |
| --- | --- | --- | --- |
| 1 | **Public** | Information intentionally released for public consumption | Website content, published press releases, published job adverts |
| 2 | **Internal** | Information for internal use; disclosure would be mildly embarrassing or inconvenient but not harmful | Internal newsletters, general process documents, team meeting notes |
| 3 | **Confidential** | Sensitive information; disclosure could harm the business, partners or individuals | Client contracts, employee salaries, business strategy, source code, HR records, financial data |
| 4 | **Restricted** | Highest sensitivity; disclosure could cause serious harm | Personal data of a sensitive nature (health, financial), client credentials, security infrastructure details, data covered by NDA |

When in doubt, classify one level higher.

## 3. Handling rules by classification

### 3.1 Storage

| Level | Approved storage |
| --- | --- |
| Public | Any approved platform |
| Internal | Company-approved cloud storage (OneDrive, SharePoint) or company systems only |
| Confidential | Company-approved cloud storage with appropriate access controls; do not store on local drives without backup |
| Restricted | Approved systems with role-based access controls, encryption at rest; no local copies |

**Personal cloud storage (Google Drive, Dropbox, personal OneDrive)** must
never be used for Internal, Confidential or Restricted data.

### 3.2 Sharing internally

| Level | Requirement |
| --- | --- |
| Public | No restriction |
| Internal | Share via company channels only (email, Teams); confirm the recipient needs the information |
| Confidential | Share on a need-to-know basis; use permissions on shared files rather than sending copies |
| Restricted | Explicit approval from the data owner before sharing; log who has access |

### 3.3 Sharing externally

| Level | Requirement |
| --- | --- |
| Public | Fine to share |
| Internal | Do not share externally without manager approval |
| Confidential | Share only under a signed NDA; use encrypted transfer methods; manager approval required |
| Restricted | Share only with explicit sign-off from a Director or above; encrypted transfer mandatory; record the disclosure |

### 3.4 Encryption and transmission

- Confidential and Restricted data in transit must be encrypted. Use secure
  file transfer links (SharePoint, OneDrive with link expiry) rather than
  email attachments for Confidential data
- Never send Restricted data by email attachment without password-protecting
  the file and sharing the password by a separate channel
- Do not transmit Restricted data by SMS, WhatsApp or personal email under
  any circumstances

### 3.5 Printing

- Internal: may be printed for legitimate business purposes; dispose of in
  secure shredding bins
- Confidential and Restricted: do not print unless there is a specific
  operational need; if printed, the document must be collected immediately
  from the printer and stored or shredded securely. Do not leave on a printer
  tray unattended

### 3.6 Disposal

| Level | Disposal method |
| --- | --- |
| Public / Internal | Regular recycle bin (digital); shredding bin (physical) |
| Confidential | Secure deletion (see IT for secure erase tools); cross-cut shredding for paper |
| Restricted | Verified secure deletion with IT confirmation; cross-cut shredding; IT must be notified |

"Deleting" a file in Windows or macOS does not securely erase it. Contact
IT for the approved secure deletion tool.

## 4. Personal data

All personal data (data from which a living individual can be identified)
must be treated as **Confidential** as a minimum, and as **Restricted** where
the data falls into a sensitive category (health, financial, political
opinions, religion, biometric data).

See the Employee Data Privacy Policy for full details.

## 5. Client data

Client data must be classified at the level agreed in the client contract.
Where no classification is specified, treat it as **Confidential** as a
minimum. Client data may never be used for any purpose other than delivering
the contracted service.

## 6. How to label data

Documents, files and emails that contain Confidential or Restricted information
should include the classification label in the filename, document header or
email subject where practical.

Example: `[CONFIDENTIAL] Q3 Financials — Draft.xlsx`

## 7. Breaches

Any suspected breach of this policy — data sent to the wrong person, a
device containing classified data lost, a file shared beyond its intended
audience — must be reported immediately to security@zuqahtechnologies.com.

Early reporting limits harm and is not penalised. Deliberate or grossly
negligent breaches of this policy are a disciplinary matter.

## 8. Contact

**Classification queries:** security@zuqahtechnologies.com

**Secure file transfer assistance:** it@zuqahtechnologies.com
