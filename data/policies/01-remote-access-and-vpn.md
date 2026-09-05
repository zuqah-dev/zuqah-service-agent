---
id: remote-access-vpn
title: Remote Access and VPN Policy
category: IT
version: "4.2"
owner: Infrastructure Services
effective: 2026-01-15
review: 2027-01-15
---

# Remote Access and VPN Policy

## 1. Purpose and scope

This policy governs how Zuqah Technologies employees, contractors and approved third parties
connect to internal systems from outside a Zuqah Technologies office. It applies to every
device that establishes a remote session, including company laptops, company
mobile devices and approved personal devices enrolled in mobile device management.

It does not cover physical access to offices, which is covered by the Facilities
Access Standard, or access to customer environments, which is governed by the
individual customer's own agreement.

## 2. Approved connection methods

### 2.1 Zuqah Technologies VPN

The Zuqah Technologies VPN client is the only approved method for reaching internal
applications, file shares and administrative interfaces from outside the office.
It is pre-installed on all company laptops issued after 1 March 2025.

Connecting requires:

- A valid Zuqah Technologies account in good standing
- Multi-factor authentication, completed at each connection
- A device that passes the posture check described in section 4

### 2.2 Browser-based applications

A small number of applications — Zuqah Technologies Mail, Zuqah Technologies Teams, the HR portal and
the expense system — are published directly to the internet and do not require
the VPN. These are protected by conditional access and multi-factor
authentication. Employees do not need to connect to the VPN to reach them.

### 2.3 Methods that are not approved

Third-party remote desktop tools, personal VPN services, consumer file-sync
applications and unmanaged SSH tunnels must not be used to reach Zuqah Technologies systems.
Where a business need cannot be met by the approved methods, raise a request with
Infrastructure Services rather than working around the restriction.

## 3. Setting up VPN on a new device

New starters receive a laptop with the VPN client already installed and
configured. First-time connection takes about five minutes.

1. Connect the laptop to any working internet connection — home broadband, a
   phone hotspot or a guest network are all acceptable.
2. Open **Zuqah Technologies VPN** from the Start menu.
3. Enter your Zuqah Technologies email address. The client fills in the connection profile
   automatically; there is no server address to type.
4. Complete the multi-factor prompt on your registered device.
5. Wait for the status indicator to turn green and read *Connected*.

The first connection also runs a posture check and may install pending security
updates before allowing access. This can add several minutes on the first attempt
and does not recur.

If the client is missing from a laptop that should have it, raise a ticket with IT
Support rather than downloading an installer from elsewhere.

## 4. Device posture requirements

A device is permitted to connect only when all of the following are true. The
check runs at every connection attempt.

| Requirement | Threshold |
| --- | --- |
| Operating system updates | No missing update older than 14 days |
| Disk encryption | Enabled on all fixed drives |
| Endpoint protection | Installed, running, definitions under 7 days old |
| Screen lock | Enabled, 15 minutes or less |
| Device enrolment | Enrolled in Zuqah Technologies device management |

A device failing any of these is refused and shown which requirement failed. Most
failures are resolved by allowing pending updates to install and retrying.

## 5. Session limits

- A session disconnects automatically after **12 hours** and must be
  re-established.
- A session idle for **30 minutes** is disconnected. Idle means no traffic at all,
  not merely no keyboard activity.
- An account may hold **two** concurrent VPN sessions. A third connection attempt
  disconnects the oldest session.

These limits are not configurable per user.

## 6. Common problems and how to resolve them

### 6.1 The connection drops repeatedly

Frequent disconnection is usually caused by an unstable local network rather than
by the VPN. Before raising a ticket:

1. Confirm other devices on the same network are stable.
2. Move closer to the wireless access point, or connect by cable.
3. If using a phone hotspot, note that carrier-grade network address translation
   frequently interrupts VPN sessions. This is expected and cannot be corrected
   from the Zuqah Technologies side.
4. Restart the laptop. This clears a stale network adapter state that accounts for
   a meaningful share of reported disconnections.
5. Reconnect and note whether the drop happens at a consistent interval. A
   consistent interval points to a session limit in section 5; an irregular one
   points to the local network.

If the problem persists after these steps, raise a ticket and include how long the
connection lasts before dropping, whether it is wired or wireless, and any error
number shown.

### 6.2 Authentication fails

Confirm the multi-factor prompt is reaching your registered device. If your phone
has been replaced recently, the registration must be moved before VPN access will
work — see the Password and Multi-Factor Authentication Standard.

### 6.3 The connection succeeds but internal sites do not load

This usually indicates a name resolution problem. Disconnect, restart the laptop
and reconnect. If the problem continues, raise a ticket noting which specific
internal addresses fail and whether they fail by name, by address, or both.

## 7. Contractors and third parties

Non-employees may be granted VPN access for a fixed period, not exceeding the
duration of their engagement and never longer than **six months** without renewal.
Access requires a sponsor who is a Zuqah Technologies employee at manager level or above.
The sponsor is accountable for confirming the access is still required at renewal
and for notifying Infrastructure Services when the engagement ends.

## 8. Monitoring and enforcement

Connection metadata — account, time, source country, device identifier and
duration — is retained for **90 days**. Session content is not inspected.

Connections from countries outside the approved list are blocked by default.
Employees travelling outside the approved list should request temporary access at
least **five business days** before departure; see the Travel and Reimbursement
Policy for the broader travel notification process.

Repeated deliberate circumvention of this policy is treated as a disciplinary
matter under the Code of Conduct.

## 9. Exceptions

Exceptions require written approval from the Head of Infrastructure Services and
are granted for a maximum of **90 days**. Requests should state the business need,
the systems involved and the compensating controls proposed.

---

*Sample content for demonstration purposes. Zuqah Technologies is a fictional company and
this document describes no real organisation's policy.*
