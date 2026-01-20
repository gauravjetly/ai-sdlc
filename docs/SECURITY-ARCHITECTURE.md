# Deltek Cloud Security Architecture

## Complete Security & Compliance Framework for Enterprise Submissions

**Version:** 2.3.0
**Last Updated:** 2026-01-20
**Classification:** Internal / Customer-Facing
**Author:** Deltek Cloud Engineering

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Compliance Framework Overview](#compliance-framework-overview)
3. [SOC 2 Type 2 Controls](#soc-2-type-2-controls)
4. [FedRAMP Requirements](#fedramp-requirements)
5. [NIST 800-53 / 800-171 Controls](#nist-controls)
6. [ISO 27001:2022 Requirements](#iso-27001-requirements)
7. [CMMC 2.0 Requirements](#cmmc-requirements)
8. [CIS Critical Security Controls](#cis-controls)
9. [ITAR/EAR Export Controls](#export-controls)
10. [DFARS Requirements](#dfars-requirements)
11. [Security Architecture Diagrams](#security-architecture)
12. [Data Flow & Classification](#data-flow)
13. [Access Control Matrix](#access-control)
14. [Incident Response](#incident-response)
15. [Business Continuity](#business-continuity)
16. [Audit Evidence Checklist](#audit-checklist)

---

## Executive Summary

This document provides comprehensive security architecture documentation for Deltek Cloud solutions, designed to support all security submissions including:

- **SOC 2 Type 2** audits
- **FedRAMP Moderate** authorization
- **CMMC Level 2/3** certification
- **ISO 27001:2022** certification
- **NIST 800-171** compliance
- **DFARS 252.204-7012** requirements

### Compliance Status Summary

| Framework | Status | Level | Last Assessment |
|-----------|--------|-------|-----------------|
| SOC 2 Type 2 | Certified | Full | Annual |
| FedRAMP | Moderate Ready | Moderate Equivalency | 2025 |
| ISO 27001 | Certified | 2022 | Annual |
| CMMC | Ready | Level 2 | 2025 |
| NIST 800-171 | Implemented | Full | Continuous |
| CIS Controls | Implemented | v8 | Continuous |

---

## Compliance Framework Overview

### Framework Mapping

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DELTEK CLOUD COMPLIANCE STACK                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   SOC 2     │  │  FedRAMP    │  │ ISO 27001   │  │   CMMC      │    │
│  │  Type 2     │  │  Moderate   │  │   :2022     │  │  Level 2    │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                   │                                      │
│                    ┌──────────────┴──────────────┐                      │
│                    │    NIST 800-53 / 800-171    │                      │
│                    │    (325 Security Controls)  │                      │
│                    └──────────────┬──────────────┘                      │
│                                   │                                      │
│         ┌─────────────────────────┼─────────────────────────┐          │
│         │                         │                         │          │
│  ┌──────┴──────┐          ┌──────┴──────┐          ┌──────┴──────┐    │
│  │ CIS Controls│          │    DFARS    │          │  ITAR/EAR   │    │
│  │     v8      │          │  7012/7020  │          │   Export    │    │
│  └─────────────┘          └─────────────┘          └─────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SOC 2 Type 2 Controls

### Trust Services Criteria (TSC)

#### CC1: Control Environment

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC1.1 | Commitment to integrity and ethical values | Code of Conduct, Ethics Training | Training records, signed acknowledgments |
| CC1.2 | Board oversight | Security Committee, quarterly reviews | Meeting minutes, charter |
| CC1.3 | Organizational structure | Security org chart, RACI matrix | Org documentation |
| CC1.4 | Commitment to competence | Job descriptions, training requirements | HR records, certifications |
| CC1.5 | Accountability | Performance reviews, security metrics | Review documentation |

#### CC2: Communication and Information

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC2.1 | Internal communication | Security policies, intranet | Policy repository |
| CC2.2 | External communication | Customer notifications, SLAs | Communication logs |
| CC2.3 | System descriptions | Architecture docs, data flows | Technical documentation |

#### CC3: Risk Assessment

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC3.1 | Risk objectives | Risk register, risk appetite | Risk documentation |
| CC3.2 | Risk identification | Threat modeling, vulnerability scans | Assessment reports |
| CC3.3 | Fraud risk | Fraud risk assessment | Assessment documentation |
| CC3.4 | Change management risk | Change impact analysis | Change records |

#### CC4: Monitoring Activities

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC4.1 | Ongoing monitoring | SIEM, 24/7 SOC | Alert logs, dashboards |
| CC4.2 | Internal audit | Annual audits, penetration tests | Audit reports |

#### CC5: Control Activities

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC5.1 | Control selection | Control framework mapping | Control matrix |
| CC5.2 | Technology controls | Firewalls, IDS/IPS, encryption | Configuration docs |
| CC5.3 | Policy deployment | Automated policy enforcement | Policy logs |

#### CC6: Logical and Physical Access

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC6.1 | Logical access security | SSO, MFA, RBAC | Access logs |
| CC6.2 | Access provisioning | Joiner/mover/leaver process | Provisioning records |
| CC6.3 | Access removal | Automated deprovisioning | Termination records |
| CC6.4 | Access review | Quarterly access reviews | Review reports |
| CC6.5 | Physical security | Badge access, CCTV | Access logs |
| CC6.6 | Boundary protection | Firewalls, WAF, DDoS protection | Configuration docs |
| CC6.7 | Data classification | Classification policy | Tagged data inventory |
| CC6.8 | Malware protection | EDR, antivirus | Scan reports |

#### CC7: System Operations

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC7.1 | Configuration management | IaC, baseline configs | Configuration records |
| CC7.2 | Change management | Change control board | Change tickets |
| CC7.3 | Incident management | Incident response plan | Incident records |
| CC7.4 | Business continuity | DR plan, backups | BC/DR test results |
| CC7.5 | Recovery testing | Annual DR tests | Test reports |

#### CC8: Change Management

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC8.1 | Infrastructure changes | Change approval process | Change records |

#### CC9: Risk Mitigation

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| CC9.1 | Vendor management | Third-party risk assessments | Assessment reports |
| CC9.2 | Business continuity risk | BIA, risk treatment | BC documentation |

### Availability Criteria (A)

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| A1.1 | Capacity planning | Auto-scaling, monitoring | Capacity reports |
| A1.2 | Availability monitoring | Uptime monitoring, SLAs | SLA reports |
| A1.3 | Backup and recovery | Automated backups, replication | Backup logs |

### Confidentiality Criteria (C)

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| C1.1 | Confidential information identification | Data classification | Data inventory |
| C1.2 | Disposal of confidential data | Secure deletion, crypto-shredding | Disposal records |

### Processing Integrity (PI)

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| PI1.1 | Processing accuracy | Input validation, checksums | Validation logs |
| PI1.2 | Error handling | Error logging, alerts | Error logs |

### Privacy Criteria (P)

| Control ID | Control Description | Implementation | Evidence |
|------------|---------------------|----------------|----------|
| P1.1 | Privacy notice | Privacy policy, consent | Policy documentation |
| P2.1 | Data collection | Purpose limitation | Collection records |
| P3.1 | Data use | Use limitation | Processing records |
| P4.1 | Data retention | Retention schedules | Retention documentation |
| P5.1 | Data access | Subject access requests | Request logs |
| P6.1 | Data disclosure | Third-party agreements | Contracts, DPAs |
| P7.1 | Data quality | Accuracy verification | Quality reports |
| P8.1 | Complaints | Complaint process | Complaint logs |

---

## FedRAMP Requirements

### FedRAMP Moderate Baseline (325 Controls)

#### Access Control (AC) - 25 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| AC-1 | Access Control Policy | Documented policy, annual review |
| AC-2 | Account Management | Centralized IAM, automated provisioning |
| AC-3 | Access Enforcement | RBAC, least privilege |
| AC-4 | Information Flow Enforcement | Network segmentation, DLP |
| AC-5 | Separation of Duties | Role separation, dual control |
| AC-6 | Least Privilege | Minimum necessary access |
| AC-7 | Unsuccessful Login Attempts | Account lockout after 3 attempts |
| AC-8 | System Use Notification | Login banners |
| AC-11 | Session Lock | 15-minute timeout |
| AC-12 | Session Termination | Automatic termination |
| AC-14 | Permitted Actions | Guest access restrictions |
| AC-17 | Remote Access | VPN, MFA required |
| AC-18 | Wireless Access | WPA3, certificate auth |
| AC-19 | Access Control for Mobile | MDM, containerization |
| AC-20 | External Systems | Third-party risk assessment |
| AC-21 | Information Sharing | Data sharing agreements |
| AC-22 | Publicly Accessible Content | Content review process |

#### Audit and Accountability (AU) - 16 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| AU-1 | Audit Policy | Documented policy |
| AU-2 | Auditable Events | Comprehensive event logging |
| AU-3 | Content of Audit Records | Who, what, when, where, outcome |
| AU-4 | Audit Storage Capacity | Scalable storage |
| AU-5 | Response to Audit Failures | Alert on failure |
| AU-6 | Audit Review | Daily review, SIEM correlation |
| AU-7 | Audit Reduction | Log aggregation, filtering |
| AU-8 | Time Stamps | NTP synchronization |
| AU-9 | Protection of Audit Information | Immutable logs |
| AU-11 | Audit Record Retention | 1 year online, 3 years archive |
| AU-12 | Audit Generation | All systems configured |

#### Security Assessment (CA) - 9 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| CA-1 | Security Assessment Policy | Annual assessments |
| CA-2 | Security Assessments | Independent 3PAO assessment |
| CA-3 | System Interconnections | ISA/MOU documentation |
| CA-5 | Plan of Action | POA&M tracking |
| CA-6 | Security Authorization | ATO process |
| CA-7 | Continuous Monitoring | ConMon program |
| CA-8 | Penetration Testing | Annual pen tests |
| CA-9 | Internal System Connections | Documented connections |

#### Configuration Management (CM) - 11 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| CM-1 | Configuration Management Policy | IaC, GitOps |
| CM-2 | Baseline Configuration | Hardened baselines |
| CM-3 | Configuration Change Control | Change control board |
| CM-4 | Security Impact Analysis | Change impact assessment |
| CM-5 | Access Restrictions for Change | Privileged access management |
| CM-6 | Configuration Settings | CIS benchmarks |
| CM-7 | Least Functionality | Minimal services |
| CM-8 | Information System Component Inventory | CMDB |
| CM-9 | Configuration Management Plan | Documented plan |
| CM-10 | Software Usage Restrictions | License management |
| CM-11 | User-Installed Software | Restricted, approved list |

#### Contingency Planning (CP) - 13 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| CP-1 | Contingency Planning Policy | BC/DR policy |
| CP-2 | Contingency Plan | Documented plan |
| CP-3 | Contingency Training | Annual training |
| CP-4 | Contingency Plan Testing | Annual DR tests |
| CP-6 | Alternate Storage Site | Geo-redundant storage |
| CP-7 | Alternate Processing Site | Multi-region deployment |
| CP-8 | Telecommunications Services | Redundant connectivity |
| CP-9 | Information System Backup | Daily backups, 30-day retention |
| CP-10 | System Recovery | RTO: 4 hours, RPO: 1 hour |

#### Identification and Authentication (IA) - 11 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| IA-1 | Identification and Authentication Policy | IAM policy |
| IA-2 | Identification and Authentication | MFA for all users |
| IA-3 | Device Identification | Certificate-based auth |
| IA-4 | Identifier Management | Unique user IDs |
| IA-5 | Authenticator Management | Password policy, rotation |
| IA-6 | Authenticator Feedback | Masked passwords |
| IA-7 | Cryptographic Module Authentication | FIPS 140-2 validated |
| IA-8 | Identification and Authentication (Non-Org) | Federated identity |

#### Incident Response (IR) - 10 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| IR-1 | Incident Response Policy | IR policy and plan |
| IR-2 | Incident Response Training | Annual training |
| IR-3 | Incident Response Testing | Tabletop exercises |
| IR-4 | Incident Handling | 24/7 SOC |
| IR-5 | Incident Monitoring | SIEM, threat intel |
| IR-6 | Incident Reporting | 72-hour notification |
| IR-7 | Incident Response Assistance | IR team support |
| IR-8 | Incident Response Plan | Documented playbooks |

#### Maintenance (MA) - 6 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| MA-1 | System Maintenance Policy | Maintenance windows |
| MA-2 | Controlled Maintenance | Authorized personnel |
| MA-3 | Maintenance Tools | Approved tools only |
| MA-4 | Nonlocal Maintenance | Secure remote access |
| MA-5 | Maintenance Personnel | Background checks |
| MA-6 | Timely Maintenance | SLA-based patching |

#### Media Protection (MP) - 8 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| MP-1 | Media Protection Policy | Media handling policy |
| MP-2 | Media Access | Restricted access |
| MP-3 | Media Marking | Classification labels |
| MP-4 | Media Storage | Encrypted storage |
| MP-5 | Media Transport | Encrypted transport |
| MP-6 | Media Sanitization | NIST 800-88 procedures |
| MP-7 | Media Use | Removable media restrictions |

#### Physical and Environmental (PE) - 20 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| PE-1 | Physical Security Policy | Data center security |
| PE-2 | Physical Access Authorizations | Access lists |
| PE-3 | Physical Access Control | Badge access, biometrics |
| PE-4 | Access Control for Transmission | Secured cabling |
| PE-5 | Access Control for Output Devices | Controlled printers |
| PE-6 | Monitoring Physical Access | CCTV, guards |
| PE-8 | Visitor Access Records | Visitor logs |
| PE-9 | Power Equipment | UPS, generators |
| PE-10 | Emergency Shutoff | Emergency power off |
| PE-11 | Emergency Power | Generator backup |
| PE-12 | Emergency Lighting | Battery backup |
| PE-13 | Fire Protection | Suppression systems |
| PE-14 | Environmental Controls | HVAC, monitoring |
| PE-15 | Water Damage Protection | Leak detection |
| PE-16 | Delivery and Removal | Asset tracking |
| PE-17 | Alternate Work Site | Remote work security |

#### Planning (PL) - 8 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| PL-1 | Security Planning Policy | SSP development |
| PL-2 | System Security Plan | Comprehensive SSP |
| PL-4 | Rules of Behavior | Acceptable use policy |
| PL-8 | Information Security Architecture | Architecture documentation |

#### Personnel Security (PS) - 8 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| PS-1 | Personnel Security Policy | HR security policy |
| PS-2 | Position Risk Designation | Risk levels defined |
| PS-3 | Personnel Screening | Background checks |
| PS-4 | Personnel Termination | Offboarding process |
| PS-5 | Personnel Transfer | Access updates |
| PS-6 | Access Agreements | NDAs, acceptable use |
| PS-7 | Third-Party Personnel Security | Vendor screening |
| PS-8 | Personnel Sanctions | Disciplinary process |

#### Risk Assessment (RA) - 5 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| RA-1 | Risk Assessment Policy | Risk framework |
| RA-2 | Security Categorization | FIPS 199 categorization |
| RA-3 | Risk Assessment | Annual assessments |
| RA-5 | Vulnerability Scanning | Weekly scans |

#### System and Services Acquisition (SA) - 22 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| SA-1 | System Acquisition Policy | Procurement security |
| SA-2 | Allocation of Resources | Security budget |
| SA-3 | System Development Life Cycle | Secure SDLC |
| SA-4 | Acquisition Process | Security requirements |
| SA-5 | Information System Documentation | System documentation |
| SA-8 | Security Engineering Principles | Secure design |
| SA-9 | External System Services | Third-party security |
| SA-10 | Developer Configuration Management | Secure development |
| SA-11 | Developer Security Testing | SAST, DAST |
| SA-12 | Supply Chain Protection | Supply chain security |

#### System and Communications Protection (SC) - 44 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| SC-1 | System and Communications Policy | Network security policy |
| SC-2 | Application Partitioning | Microservices isolation |
| SC-4 | Information in Shared Resources | Memory protection |
| SC-5 | Denial of Service Protection | DDoS mitigation |
| SC-7 | Boundary Protection | Firewalls, WAF |
| SC-8 | Transmission Confidentiality | TLS 1.3 |
| SC-10 | Network Disconnect | Automatic disconnect |
| SC-12 | Cryptographic Key Management | HSM, key rotation |
| SC-13 | Cryptographic Protection | AES-256, RSA-2048+ |
| SC-15 | Collaborative Computing | Screen sharing controls |
| SC-17 | Public Key Infrastructure | PKI implementation |
| SC-18 | Mobile Code | Code signing |
| SC-19 | Voice Over Internet Protocol | VoIP security |
| SC-20 | Secure DNS | DNSSEC |
| SC-21 | Secure DNS Resolution | DNS filtering |
| SC-22 | Architecture and Provisioning | Secure architecture |
| SC-23 | Session Authenticity | Session management |
| SC-28 | Protection of Information at Rest | Encryption at rest |
| SC-39 | Process Isolation | Container isolation |

#### System and Information Integrity (SI) - 16 Controls

| Control | Title | Implementation |
|---------|-------|----------------|
| SI-1 | System Integrity Policy | Integrity policy |
| SI-2 | Flaw Remediation | Patching program |
| SI-3 | Malicious Code Protection | EDR, antimalware |
| SI-4 | Information System Monitoring | SIEM, IDS/IPS |
| SI-5 | Security Alerts | Threat intelligence |
| SI-6 | Security Function Verification | Integrity verification |
| SI-7 | Software Integrity | Code signing |
| SI-8 | Spam Protection | Email filtering |
| SI-10 | Information Input Validation | Input sanitization |
| SI-11 | Error Handling | Secure error handling |
| SI-12 | Information Handling | Data handling procedures |
| SI-16 | Memory Protection | DEP, ASLR |

---

## NIST Controls

### NIST 800-171 (CUI Protection)

#### 3.1 Access Control (22 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.1.1 | Limit system access | RBAC implementation |
| 3.1.2 | Limit transaction access | Transaction-level controls |
| 3.1.3 | Control CUI flow | DLP, network segmentation |
| 3.1.4 | Separate duties | Role separation |
| 3.1.5 | Least privilege | Minimum necessary access |
| 3.1.6 | Non-privileged accounts | Standard user accounts |
| 3.1.7 | Prevent privileged functions | PAM solution |
| 3.1.8 | Limit unsuccessful logins | Account lockout |
| 3.1.9 | Privacy/security notices | Login banners |
| 3.1.10 | Session lock | 15-minute timeout |
| 3.1.11 | Session termination | Automatic termination |
| 3.1.12 | Control remote access | VPN, MFA |
| 3.1.13 | Remote access encryption | TLS 1.3 |
| 3.1.14 | Route remote access | Managed access points |
| 3.1.15 | Authorize remote execution | Privileged commands |
| 3.1.16 | Authorize wireless access | WPA3 enterprise |
| 3.1.17 | Protect wireless access | Certificate authentication |
| 3.1.18 | Control mobile devices | MDM deployment |
| 3.1.19 | Encrypt CUI on mobile | Device encryption |
| 3.1.20 | Verify external connections | Connection authorization |
| 3.1.21 | Limit external use | Portable storage restrictions |
| 3.1.22 | Control public information | Content review process |

#### 3.2 Awareness and Training (3 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.2.1 | Security awareness | Annual training |
| 3.2.2 | Role-based training | Job-specific training |
| 3.2.3 | Insider threat awareness | Insider threat training |

#### 3.3 Audit and Accountability (9 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.3.1 | Create audit records | Comprehensive logging |
| 3.3.2 | Enable user accountability | User attribution |
| 3.3.3 | Review audit records | Daily review |
| 3.3.4 | Alert on audit failure | Automated alerts |
| 3.3.5 | Correlate audit review | SIEM correlation |
| 3.3.6 | Reduction and reporting | Log aggregation |
| 3.3.7 | Authoritative time source | NTP sync |
| 3.3.8 | Protect audit information | Immutable logs |
| 3.3.9 | Limit audit management | Privileged access |

#### 3.4 Configuration Management (9 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.4.1 | Establish baselines | Hardened configurations |
| 3.4.2 | Enforce security configurations | Automated enforcement |
| 3.4.3 | Track changes | Change management |
| 3.4.4 | Analyze security impact | Impact assessment |
| 3.4.5 | Define change restrictions | Change control board |
| 3.4.6 | Least functionality | Minimal services |
| 3.4.7 | Restrict nonessential programs | Application whitelist |
| 3.4.8 | Apply deny-by-exception | Default deny |
| 3.4.9 | Control user software | Software restrictions |

#### 3.5 Identification and Authentication (11 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.5.1 | Identify users | Unique identifiers |
| 3.5.2 | Authenticate users | MFA implementation |
| 3.5.3 | MFA for local access | MFA required |
| 3.5.4 | Replay-resistant auth | Token-based auth |
| 3.5.5 | Prevent identifier reuse | Unique IDs |
| 3.5.6 | Disable identifiers | Automated disable |
| 3.5.7 | Enforce password complexity | Password policy |
| 3.5.8 | Prohibit password reuse | Password history |
| 3.5.9 | Temporary passwords | One-time passwords |
| 3.5.10 | Store passwords securely | Hashed storage |
| 3.5.11 | Obscure feedback | Masked input |

#### 3.6 Incident Response (3 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.6.1 | Establish IR capability | IR team, plan |
| 3.6.2 | Track and report | Incident tracking |
| 3.6.3 | Test IR capability | Annual exercises |

#### 3.7 Maintenance (6 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.7.1 | Perform maintenance | Maintenance windows |
| 3.7.2 | Control maintenance | Authorized personnel |
| 3.7.3 | Sanitize equipment | NIST 800-88 |
| 3.7.4 | Check media | Pre-use scanning |
| 3.7.5 | Remote maintenance | Secure access |
| 3.7.6 | Supervise maintenance | Escort requirements |

#### 3.8 Media Protection (9 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.8.1 | Protect media | Media security |
| 3.8.2 | Limit media access | Access controls |
| 3.8.3 | Sanitize media | Secure deletion |
| 3.8.4 | Mark CUI media | Classification labels |
| 3.8.5 | Control media access | Transport controls |
| 3.8.6 | Cryptographic protection | Media encryption |
| 3.8.7 | Control removable media | USB restrictions |
| 3.8.8 | Prohibit portable storage | Policy enforcement |
| 3.8.9 | Protect backup CUI | Backup encryption |

#### 3.9 Personnel Security (2 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.9.1 | Screen individuals | Background checks |
| 3.9.2 | Protect CUI on termination | Offboarding process |

#### 3.10 Physical Protection (6 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.10.1 | Limit physical access | Badge access |
| 3.10.2 | Protect physical facility | Data center security |
| 3.10.3 | Escort visitors | Visitor procedures |
| 3.10.4 | Maintain access logs | Access logging |
| 3.10.5 | Manage physical keys | Key management |
| 3.10.6 | Control alternate work sites | Remote work security |

#### 3.11 Risk Assessment (3 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.11.1 | Periodically assess risk | Annual assessments |
| 3.11.2 | Scan for vulnerabilities | Weekly scanning |
| 3.11.3 | Remediate vulnerabilities | Patching SLAs |

#### 3.12 Security Assessment (4 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.12.1 | Assess security controls | Annual assessments |
| 3.12.2 | Develop remediation plans | POA&M |
| 3.12.3 | Monitor security controls | Continuous monitoring |
| 3.12.4 | Develop security plans | System security plans |

#### 3.13 System and Communications Protection (16 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.13.1 | Monitor communications | Network monitoring |
| 3.13.2 | Employ architectural designs | Defense in depth |
| 3.13.3 | Separate user functionality | Application isolation |
| 3.13.4 | Prevent unauthorized transfer | DLP |
| 3.13.5 | Implement subnetworks | Network segmentation |
| 3.13.6 | Deny by default | Default deny firewall |
| 3.13.7 | Prevent remote activation | Device controls |
| 3.13.8 | Employ cryptographic protection | TLS, encryption |
| 3.13.9 | Terminate network connections | Session timeout |
| 3.13.10 | Establish cryptographic keys | Key management |
| 3.13.11 | Employ FIPS-validated crypto | FIPS 140-2 |
| 3.13.12 | Prohibit remote activation | Sensor controls |
| 3.13.13 | Control mobile code | Code restrictions |
| 3.13.14 | Control VoIP | VoIP security |
| 3.13.15 | Protect session authenticity | Session security |
| 3.13.16 | Protect CUI at rest | Encryption at rest |

#### 3.14 System and Information Integrity (7 requirements)

| Req ID | Requirement | Implementation |
|--------|-------------|----------------|
| 3.14.1 | Identify flaws | Vulnerability management |
| 3.14.2 | Provide protection from malicious code | EDR, antimalware |
| 3.14.3 | Monitor security alerts | Threat intelligence |
| 3.14.4 | Update malicious code protection | Signature updates |
| 3.14.5 | Perform system scans | Periodic scanning |
| 3.14.6 | Monitor inbound/outbound | Network monitoring |
| 3.14.7 | Identify unauthorized use | Anomaly detection |

---

## ISO 27001 Requirements

### Annex A Controls (93 Controls)

#### A.5 Information Security Policies (2 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.5.1.1 | Policies for information security | Policy framework |
| A.5.1.2 | Review of policies | Annual review |

#### A.6 Organization of Information Security (7 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.6.1.1 | Information security roles | RACI matrix |
| A.6.1.2 | Segregation of duties | Role separation |
| A.6.1.3 | Contact with authorities | Authority relationships |
| A.6.1.4 | Contact with special interest groups | Industry groups |
| A.6.1.5 | Information security in project management | Secure SDLC |
| A.6.2.1 | Mobile device policy | MDM policy |
| A.6.2.2 | Teleworking | Remote work policy |

#### A.7 Human Resource Security (6 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.7.1.1 | Screening | Background checks |
| A.7.1.2 | Terms and conditions of employment | Security clauses |
| A.7.2.1 | Management responsibilities | Management commitment |
| A.7.2.2 | Information security awareness | Training program |
| A.7.2.3 | Disciplinary process | Security sanctions |
| A.7.3.1 | Termination responsibilities | Offboarding |

#### A.8 Asset Management (10 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.8.1.1 | Inventory of assets | Asset management |
| A.8.1.2 | Ownership of assets | Asset owners |
| A.8.1.3 | Acceptable use of assets | Acceptable use policy |
| A.8.1.4 | Return of assets | Asset return process |
| A.8.2.1 | Classification of information | Data classification |
| A.8.2.2 | Labeling of information | Classification labels |
| A.8.2.3 | Handling of assets | Handling procedures |
| A.8.3.1 | Management of removable media | Media controls |
| A.8.3.2 | Disposal of media | Secure disposal |
| A.8.3.3 | Physical media transfer | Transport security |

#### A.9 Access Control (14 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.9.1.1 | Access control policy | Access policy |
| A.9.1.2 | Access to networks and network services | Network access |
| A.9.2.1 | User registration and de-registration | Provisioning |
| A.9.2.2 | User access provisioning | Access provisioning |
| A.9.2.3 | Management of privileged access rights | PAM |
| A.9.2.4 | Management of secret authentication | Credential management |
| A.9.2.5 | Review of user access rights | Access reviews |
| A.9.2.6 | Removal of access rights | Deprovisioning |
| A.9.3.1 | Use of secret authentication | Password policy |
| A.9.4.1 | Information access restriction | RBAC |
| A.9.4.2 | Secure log-on procedures | Secure authentication |
| A.9.4.3 | Password management system | Password management |
| A.9.4.4 | Use of privileged utility programs | Utility restrictions |
| A.9.4.5 | Access control to program source code | Code access |

#### A.10 Cryptography (2 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.10.1.1 | Policy on use of cryptographic controls | Crypto policy |
| A.10.1.2 | Key management | Key management |

#### A.11 Physical and Environmental Security (15 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.11.1.1 | Physical security perimeter | Physical boundaries |
| A.11.1.2 | Physical entry controls | Badge access |
| A.11.1.3 | Securing offices, rooms and facilities | Facility security |
| A.11.1.4 | Protecting against external threats | Environmental protection |
| A.11.1.5 | Working in secure areas | Secure area procedures |
| A.11.1.6 | Delivery and loading areas | Delivery security |
| A.11.2.1 | Equipment siting and protection | Equipment placement |
| A.11.2.2 | Supporting utilities | Power, cooling |
| A.11.2.3 | Cabling security | Cable protection |
| A.11.2.4 | Equipment maintenance | Maintenance program |
| A.11.2.5 | Removal of assets | Asset removal |
| A.11.2.6 | Security of equipment off-premises | Off-site security |
| A.11.2.7 | Secure disposal or re-use | Equipment disposal |
| A.11.2.8 | Unattended user equipment | Screen locking |
| A.11.2.9 | Clear desk and clear screen | Clean desk policy |

#### A.12 Operations Security (14 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.12.1.1 | Documented operating procedures | Runbooks |
| A.12.1.2 | Change management | Change control |
| A.12.1.3 | Capacity management | Capacity planning |
| A.12.1.4 | Separation of environments | Dev/staging/prod |
| A.12.2.1 | Controls against malware | Antimalware |
| A.12.3.1 | Information backup | Backup procedures |
| A.12.4.1 | Event logging | Audit logging |
| A.12.4.2 | Protection of log information | Log protection |
| A.12.4.3 | Administrator and operator logs | Admin logging |
| A.12.4.4 | Clock synchronization | NTP |
| A.12.5.1 | Installation of software | Software control |
| A.12.6.1 | Management of technical vulnerabilities | Vulnerability management |
| A.12.6.2 | Restrictions on software installation | Software restrictions |
| A.12.7.1 | Information systems audit controls | Audit controls |

#### A.13 Communications Security (7 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.13.1.1 | Network controls | Network security |
| A.13.1.2 | Security of network services | Service security |
| A.13.1.3 | Segregation in networks | Network segmentation |
| A.13.2.1 | Information transfer policies | Transfer policies |
| A.13.2.2 | Agreements on information transfer | Transfer agreements |
| A.13.2.3 | Electronic messaging | Email security |
| A.13.2.4 | Confidentiality or NDAs | NDAs |

#### A.14 System Acquisition, Development and Maintenance (13 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.14.1.1 | Information security requirements analysis | Security requirements |
| A.14.1.2 | Securing application services on public networks | Application security |
| A.14.1.3 | Protecting application services transactions | Transaction security |
| A.14.2.1 | Secure development policy | Secure SDLC |
| A.14.2.2 | System change control procedures | Change control |
| A.14.2.3 | Technical review after platform changes | Platform reviews |
| A.14.2.4 | Restrictions on changes to software packages | Package changes |
| A.14.2.5 | Secure system engineering principles | Secure design |
| A.14.2.6 | Secure development environment | Development security |
| A.14.2.7 | Outsourced development | Third-party development |
| A.14.2.8 | System security testing | Security testing |
| A.14.2.9 | System acceptance testing | Acceptance testing |
| A.14.3.1 | Protection of test data | Test data security |

#### A.15 Supplier Relationships (5 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.15.1.1 | Information security policy for supplier relationships | Supplier policy |
| A.15.1.2 | Addressing security within supplier agreements | Supplier contracts |
| A.15.1.3 | ICT supply chain | Supply chain security |
| A.15.2.1 | Monitoring and review of supplier services | Supplier monitoring |
| A.15.2.2 | Managing changes to supplier services | Supplier changes |

#### A.16 Information Security Incident Management (7 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.16.1.1 | Responsibilities and procedures | IR procedures |
| A.16.1.2 | Reporting information security events | Event reporting |
| A.16.1.3 | Reporting information security weaknesses | Weakness reporting |
| A.16.1.4 | Assessment of and decision on events | Event triage |
| A.16.1.5 | Response to information security incidents | Incident response |
| A.16.1.6 | Learning from information security incidents | Post-incident review |
| A.16.1.7 | Collection of evidence | Evidence collection |

#### A.17 Business Continuity (4 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.17.1.1 | Planning information security continuity | BC planning |
| A.17.1.2 | Implementing information security continuity | BC implementation |
| A.17.1.3 | Verify, review and evaluate | BC testing |
| A.17.2.1 | Availability of information processing facilities | Facility availability |

#### A.18 Compliance (8 controls)

| Control | Title | Implementation |
|---------|-------|----------------|
| A.18.1.1 | Identification of applicable legislation | Legal requirements |
| A.18.1.2 | Intellectual property rights | IP protection |
| A.18.1.3 | Protection of records | Records management |
| A.18.1.4 | Privacy and protection of PII | Privacy compliance |
| A.18.1.5 | Regulation of cryptographic controls | Crypto compliance |
| A.18.2.1 | Independent review of information security | Independent audits |
| A.18.2.2 | Compliance with security policies | Policy compliance |
| A.18.2.3 | Technical compliance review | Technical audits |

---

## CMMC Requirements

### CMMC 2.0 Level 2 (110 Practices)

CMMC Level 2 aligns directly with NIST 800-171. See [NIST Controls](#nist-controls) section above.

### CMMC Assessment Requirements

| Requirement | Description | Evidence |
|-------------|-------------|----------|
| Self-Assessment | Annual self-assessment for some contracts | Assessment report |
| C3PAO Assessment | Third-party assessment for critical contracts | C3PAO report |
| SPRS Score | Supplier Performance Risk System score | SPRS submission |
| POA&M | Plan of Action & Milestones for gaps | POA&M document |
| SSP | System Security Plan | SSP document |

---

## CIS Controls

### CIS Critical Security Controls v8 (18 Control Groups)

| Control | Title | Implementation |
|---------|-------|----------------|
| CIS 1 | Inventory and Control of Enterprise Assets | CMDB |
| CIS 2 | Inventory and Control of Software Assets | Software inventory |
| CIS 3 | Data Protection | Data classification, DLP |
| CIS 4 | Secure Configuration | CIS benchmarks |
| CIS 5 | Account Management | IAM |
| CIS 6 | Access Control Management | RBAC |
| CIS 7 | Continuous Vulnerability Management | Vulnerability scanning |
| CIS 8 | Audit Log Management | SIEM |
| CIS 9 | Email and Web Browser Protections | Email security, web filtering |
| CIS 10 | Malware Defenses | EDR, antimalware |
| CIS 11 | Data Recovery | Backup and recovery |
| CIS 12 | Network Infrastructure Management | Network security |
| CIS 13 | Network Monitoring and Defense | IDS/IPS, monitoring |
| CIS 14 | Security Awareness and Skills Training | Security training |
| CIS 15 | Service Provider Management | Vendor management |
| CIS 16 | Application Software Security | Secure SDLC |
| CIS 17 | Incident Response Management | IR program |
| CIS 18 | Penetration Testing | Annual pen tests |

---

## Export Controls

### ITAR (International Traffic in Arms Regulations)

| Requirement | Implementation |
|-------------|----------------|
| US Person Access | Access limited to US persons |
| US Data Center | Data stored in continental US |
| Access Controls | Enhanced access logging |
| Encryption | FIPS 140-2 validated encryption |
| Export Screening | Denied party screening |

### EAR (Export Administration Regulations)

| Requirement | Implementation |
|-------------|----------------|
| Classification | ECCNs identified |
| License Determination | Export license review |
| Screening | BIS denied party screening |
| Record Keeping | 5-year retention |

---

## DFARS Requirements

### DFARS 252.204-7012 (Safeguarding CUI)

| Requirement | Implementation |
|-------------|----------------|
| NIST 800-171 | 110 requirements implemented |
| Incident Reporting | 72-hour DoD notification |
| Media Preservation | 90-day evidence preservation |
| Contractor Flow-down | Subcontractor requirements |

### DFARS 252.204-7020 (NIST 800-171 Assessment)

| Requirement | Implementation |
|-------------|----------------|
| Assessment | Self or third-party assessment |
| SPRS Score | Score posted to SPRS |
| POA&M | Remediation plan |
| Annual Update | Annual reassessment |

---

## Security Architecture

### Network Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERNET                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │   DDoS Mitigation   │
                         │   (Cloudflare/AWS)  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         │   WAF + CDN         │
                         │   (TLS 1.3)         │
                         └──────────┬──────────┘
                                    │
┌───────────────────────────────────┼───────────────────────────────────────┐
│  DMZ                              │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │   Load Balancer     │                            │
│                        │   (AWS ALB/NLB)     │                            │
│                        └──────────┬──────────┘                            │
└───────────────────────────────────┼───────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
              │   Web     │   │   API     │   │  Worker   │
              │   Tier    │   │   Tier    │   │   Tier    │
              │(Kubernetes)│   │(Kubernetes)│   │(Kubernetes)│
              └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
┌───────────────────────────────────┼───────────────────────────────────────┐
│  Data Tier                        │                                        │
│                    ┌──────────────┼──────────────┐                        │
│                    │              │              │                        │
│              ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐                 │
│              │ PostgreSQL│  │   Redis   │  │    S3     │                 │
│              │  (RDS)    │  │(ElastiCache)│ │ (Encrypted)│                 │
│              │(Encrypted)│  │           │  │           │                 │
│              └───────────┘  └───────────┘  └───────────┘                 │
└───────────────────────────────────────────────────────────────────────────┘
```

### Identity Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IDENTITY ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │   Users     │────►│    IdP      │────►│    RBAC     │                  │
│   │             │     │ (Okta/Azure │     │   Engine    │                  │
│   │ - Employees │     │    AD)      │     │             │                  │
│   │ - Customers │     │             │     │ - Roles     │                  │
│   │ - Partners  │     │ - SSO       │     │ - Permissions│                 │
│   │             │     │ - MFA       │     │ - Policies  │                  │
│   └─────────────┘     │ - Federation│     └──────┬──────┘                  │
│                       └─────────────┘            │                          │
│                                                  │                          │
│                       ┌──────────────────────────┘                          │
│                       │                                                      │
│         ┌─────────────┼─────────────┬─────────────┐                        │
│         │             │             │             │                        │
│   ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐                 │
│   │Application│ │ Database  │ │   API     │ │ Infrastructure│              │
│   │  Access   │ │  Access   │ │  Access   │ │   Access   │                 │
│   └───────────┘ └───────────┘ └───────────┘ └───────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Encryption Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENCRYPTION ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DATA IN TRANSIT                     DATA AT REST                          │
│   ┌─────────────────────┐            ┌─────────────────────┐               │
│   │                     │            │                     │               │
│   │  • TLS 1.3          │            │  • AES-256-GCM      │               │
│   │  • Perfect Forward  │            │  • AWS KMS          │               │
│   │    Secrecy          │            │  • HSM-backed keys  │               │
│   │  • Strong ciphers   │            │  • Key rotation     │               │
│   │  • Certificate      │            │  • Envelope         │               │
│   │    pinning          │            │    encryption       │               │
│   │                     │            │                     │               │
│   └─────────────────────┘            └─────────────────────┘               │
│                                                                              │
│   KEY MANAGEMENT                                                             │
│   ┌─────────────────────────────────────────────────────────┐              │
│   │                                                          │              │
│   │  ┌─────────┐    ┌─────────┐    ┌─────────┐             │              │
│   │  │  HSM    │───►│  KMS    │───►│  Keys   │             │              │
│   │  │(FIPS    │    │         │    │         │             │              │
│   │  │ 140-2)  │    │ • CMK   │    │ • DEK   │             │              │
│   │  │         │    │ • Auto  │    │ • Auto  │             │              │
│   │  │         │    │   rotate│    │   rotate│             │              │
│   │  └─────────┘    └─────────┘    └─────────┘             │              │
│   │                                                          │              │
│   └─────────────────────────────────────────────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Data Classification

| Classification | Description | Controls |
|---------------|-------------|----------|
| **Public** | Marketing, general info | Standard controls |
| **Internal** | Company operational data | Access controls, encryption |
| **Confidential** | Customer data, financials | Enhanced access, encryption, DLP |
| **Restricted/CUI** | Government CUI, PII | Full NIST 800-171, ITAR controls |

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────┐       ┌─────────┐       ┌─────────┐       ┌─────────┐          │
│  │  User   │──────►│  WAF    │──────►│  App    │──────►│   DB    │          │
│  │ Input   │ HTTPS │         │ HTTPS │ Server  │  TLS  │(Encrypted│          │
│  │         │ TLS   │ Filter  │       │ Process │       │  at rest)│          │
│  └─────────┘       └─────────┘       └────┬────┘       └─────────┘          │
│                                           │                                   │
│                                           │                                   │
│                    ┌──────────────────────┼────────────────────────┐         │
│                    │                      │                        │         │
│                    ▼                      ▼                        ▼         │
│              ┌─────────┐           ┌─────────┐             ┌─────────┐      │
│              │  Logs   │           │ Backup  │             │ Archive │      │
│              │(Encrypted│           │(Encrypted│             │(Encrypted│      │
│              │ SIEM)   │           │  S3)    │             │ Glacier)│      │
│              └─────────┘           └─────────┘             └─────────┘      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Access Control

### Role-Based Access Control (RBAC) Matrix

| Role | Data Access | System Access | Admin Functions |
|------|-------------|---------------|-----------------|
| **End User** | Own data | Application UI | None |
| **Power User** | Team data | Application + Reports | None |
| **Admin** | Department data | Full application | User management |
| **Super Admin** | All data | Full system | All admin functions |
| **Security Admin** | Audit logs | Security tools | Security config |
| **DB Admin** | Database | Database console | DB management |
| **System Admin** | Infrastructure | Infrastructure | System config |

### Privileged Access Management (PAM)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PRIVILEGED ACCESS MANAGEMENT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐         │
│   │  User    │────►│   MFA    │────►│   PAM    │────►│  Target  │         │
│   │ Request  │     │  Auth    │     │  Vault   │     │  System  │         │
│   └──────────┘     └──────────┘     └────┬─────┘     └──────────┘         │
│                                          │                                  │
│                                          │                                  │
│                                    ┌─────┴─────┐                           │
│                                    │ Session   │                           │
│                                    │ Recording │                           │
│                                    │ + Audit   │                           │
│                                    └───────────┘                           │
│                                                                              │
│   Features:                                                                  │
│   • Just-in-time access                                                     │
│   • Session recording                                                       │
│   • Password vaulting                                                       │
│   • Automatic rotation                                                      │
│   • Approval workflows                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Incident Response

### Incident Response Plan

#### Phase 1: Preparation
- IR team identified and trained
- Playbooks documented
- Tools and access ready
- Communication templates prepared

#### Phase 2: Detection & Analysis
- SIEM alerts
- Anomaly detection
- Threat intelligence correlation
- Severity classification

#### Phase 3: Containment
- Short-term: Isolate affected systems
- Long-term: Patch, update, harden

#### Phase 4: Eradication
- Remove malware
- Reset credentials
- Patch vulnerabilities

#### Phase 5: Recovery
- Restore from backup
- Validate system integrity
- Monitor for recurrence

#### Phase 6: Post-Incident
- Lessons learned
- Documentation update
- Control improvements

### Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P1 Critical** | System down, data breach | 15 minutes | Executive, Legal |
| **P2 High** | Major functionality impacted | 1 hour | Management |
| **P3 Medium** | Limited impact | 4 hours | Team Lead |
| **P4 Low** | Minor issue | 24 hours | Team |

### Reporting Requirements

| Regulation | Reporting Timeline | Recipient |
|------------|-------------------|-----------|
| DFARS 7012 | 72 hours | DoD DC3 |
| FedRAMP | 1 hour (P1) | FedRAMP PMO |
| GDPR | 72 hours | Supervisory Authority |
| State Breach | 30-60 days | State AG, Affected |

---

## Business Continuity

### Recovery Objectives

| System | RTO | RPO | Tier |
|--------|-----|-----|------|
| Production Database | 4 hours | 1 hour | 1 |
| Application Servers | 4 hours | 1 hour | 1 |
| Authentication | 1 hour | 15 min | 0 |
| Email | 8 hours | 4 hours | 2 |
| Dev/Test | 24 hours | 24 hours | 3 |

### DR Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DISASTER RECOVERY ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PRIMARY REGION (us-east-1)              DR REGION (us-west-2)            │
│   ┌───────────────────────┐              ┌───────────────────────┐         │
│   │                       │              │                       │         │
│   │  ┌─────────────────┐  │  Replicate   │  ┌─────────────────┐  │         │
│   │  │   Application   │  │─────────────►│  │   Application   │  │         │
│   │  │   (Active)      │  │              │  │   (Standby)     │  │         │
│   │  └─────────────────┘  │              │  └─────────────────┘  │         │
│   │                       │              │                       │         │
│   │  ┌─────────────────┐  │  Async       │  ┌─────────────────┐  │         │
│   │  │   Database      │  │  Replication │  │   Database      │  │         │
│   │  │   (Primary)     │  │─────────────►│  │   (Replica)     │  │         │
│   │  └─────────────────┘  │              │  └─────────────────┘  │         │
│   │                       │              │                       │         │
│   │  ┌─────────────────┐  │  Cross-      │  ┌─────────────────┐  │         │
│   │  │   S3 Storage    │  │  Region      │  │   S3 Storage    │  │         │
│   │  │                 │  │  Replication │  │   (Replica)     │  │         │
│   │  └─────────────────┘  │─────────────►│  └─────────────────┘  │         │
│   │                       │              │                       │         │
│   └───────────────────────┘              └───────────────────────┘         │
│                                                                              │
│   FAILOVER: Route53 health checks + automatic DNS failover                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Audit Checklist

### Pre-Audit Evidence Collection

#### SOC 2 Evidence
- [ ] Security policies (all)
- [ ] Organization chart
- [ ] Risk assessment report
- [ ] Vendor management documentation
- [ ] Access control lists
- [ ] Change management records
- [ ] Incident response records
- [ ] Business continuity test results
- [ ] Training records
- [ ] Penetration test results

#### FedRAMP Evidence
- [ ] System Security Plan (SSP)
- [ ] Security Assessment Report (SAR)
- [ ] Plan of Action & Milestones (POA&M)
- [ ] Continuous Monitoring reports
- [ ] Incident response procedures
- [ ] Configuration baselines
- [ ] Vulnerability scan results
- [ ] Penetration test results
- [ ] Contingency plan test results

#### ISO 27001 Evidence
- [ ] ISMS scope statement
- [ ] Risk assessment methodology
- [ ] Risk treatment plan
- [ ] Statement of Applicability
- [ ] Internal audit reports
- [ ] Management review minutes
- [ ] Corrective action records
- [ ] Training records
- [ ] Supplier assessments

#### CMMC/NIST 800-171 Evidence
- [ ] System Security Plan
- [ ] SPRS score submission
- [ ] POA&M for any gaps
- [ ] Self-assessment results
- [ ] Encryption implementation
- [ ] Access control records
- [ ] Audit log samples
- [ ] Incident response records
- [ ] Training records

### Continuous Monitoring Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Vulnerability scans | Weekly | Security Team |
| Access reviews | Quarterly | IAM Team |
| Penetration tests | Annual | Third Party |
| Policy reviews | Annual | Compliance |
| Risk assessments | Annual | Risk Team |
| DR tests | Annual | Operations |
| Security training | Annual | HR/Security |
| Vendor assessments | Annual | Procurement |
| Internal audits | Annual | Internal Audit |
| Control testing | Ongoing | Security Team |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.3.0 | 2026-01-20 | Deltek Cloud Engineering | Initial comprehensive version |

---

## References

- [NIST SP 800-53 Rev 5](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [NIST SP 800-171 Rev 2](https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final)
- [FedRAMP Security Controls](https://www.fedramp.gov/documents/)
- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001)
- [CIS Controls v8](https://www.cisecurity.org/controls/v8)
- [CMMC 2.0](https://dodcio.defense.gov/CMMC/)
- [SOC 2 Trust Services Criteria](https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/serviceorganization-smanagement)
- [Deltek Cloud Compliance](https://www.deltek.com/en/about/security-and-trust/compliance)

---

**Classification:** Internal / Customer-Facing
**Owner:** Deltek Cloud Engineering
**Review Cycle:** Annual
