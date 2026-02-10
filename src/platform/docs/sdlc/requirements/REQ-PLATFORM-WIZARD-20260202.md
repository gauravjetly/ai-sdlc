# Requirements: Platform Architect Wizard

**Document ID**: REQ-PLATFORM-WIZARD-20260202
**Version**: 1.0
**Status**: APPROVED
**Author**: BA Agent
**Date**: 2026-02-02

---

## 1. Executive Summary

### 1.1 Problem Statement

Infrastructure teams need a guided, wizard-based interface to configure AWS platform-layer resources (IAM, Compute, Database, Storage) that integrates with the existing Network Layer configuration. The current manual approach is error-prone, lacks validation, and does not enforce security best practices.

### 1.2 Solution Overview

Build a comprehensive Platform Architect Wizard with 5 steps that guides users through configuring:
1. IAM Roles and Policies
2. Compute Services (EKS, EC2, ASG)
3. Database Services (RDS)
4. Storage Services (S3, EBS, EFS)
5. Platform Validation and Cost Estimation

### 1.3 Success Criteria

- Users can configure all platform resources through a guided wizard
- IAM policies are validated for syntax and security best practices
- Compute resources are properly placed in network subnets
- All configurations pass validation before deployment
- Cost estimation is provided for all resources

---

## 2. Stakeholders

| Role | Responsibility | Needs |
|------|----------------|-------|
| Cloud Architect | Design platform architecture | Easy-to-use configuration interface |
| DevOps Engineer | Deploy and manage resources | Validation and best practices enforcement |
| Security Team | Review IAM policies | Policy validation, least privilege checks |
| Finance | Monitor cloud costs | Cost estimation and tracking |
| Development Team | Use platform resources | Clear documentation and guidance |

---

## 3. Functional Requirements

### 3.1 IAM Roles and Policies Step (FR-001 to FR-010)

#### FR-001: Role Creation
**Description**: Users can create IAM roles with custom names and descriptions.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the IAM step
- When I click "Add Role"
- Then I can enter role name, description, and select role type (service/user)
- And role names follow AWS naming conventions (alphanumeric, hyphens, underscores, max 64 chars)

#### FR-002: Trust Policy Configuration
**Description**: Users can define trust policies for IAM roles.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am creating a role
- When I configure the trust policy
- Then I can select trusted principals (AWS services, accounts, federated identities)
- And the trust policy JSON is validated in real-time

#### FR-003: Managed Policy Attachment
**Description**: Users can attach AWS managed policies to roles.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am editing a role
- When I search for managed policies
- Then I can see matching AWS managed policies
- And I can attach/detach policies from the role

#### FR-004: Custom Policy Definition
**Description**: Users can create custom inline policies with a policy editor.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am editing a role
- When I create a custom policy
- Then I can use a JSON editor with syntax highlighting
- And policies are validated for JSON syntax and IAM policy grammar
- And warnings are shown for overly permissive actions (e.g., "*" actions)

#### FR-005: Service-Linked Roles
**Description**: Users can configure service-linked roles for AWS services.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am on the IAM step
- When I select "Add Service-Linked Role"
- Then I can choose from supported AWS services (EKS, RDS, etc.)
- And the appropriate service-linked role is configured

#### FR-006: Role Assumption Configuration
**Description**: Users can configure cross-account role assumption.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I have created a role
- When I configure cross-account access
- Then I can specify trusted AWS account IDs
- And I can set external ID requirements

#### FR-007: Instance Profile Creation
**Description**: Users can create instance profiles for EC2.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I have created a role for EC2
- When I enable "Create Instance Profile"
- Then an instance profile is created with the same name
- And the role is attached to the instance profile

#### FR-008: Policy Validation
**Description**: All policies are validated against AWS IAM policy grammar.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am editing a policy
- When I make changes
- Then syntax errors are highlighted in real-time
- And semantic errors (invalid actions, resources) are detected
- And I cannot proceed with invalid policies

#### FR-009: Least Privilege Recommendations
**Description**: System recommends least privilege improvements.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I have defined policies
- When I run validation
- Then warnings are shown for overly permissive policies
- And specific recommendations are provided to narrow permissions

#### FR-010: Role Summary View
**Description**: Users can see a summary of all configured roles.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I have configured roles
- When I view the summary
- Then I can see all roles with their attached policies
- And I can edit or delete any role

---

### 3.2 Compute Services Step (FR-011 to FR-022)

#### FR-011: EKS Cluster Configuration
**Description**: Users can configure Amazon EKS clusters.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Compute step
- When I add an EKS cluster
- Then I can specify cluster name, Kubernetes version, and endpoint access
- And I can select subnets from the Network Layer configuration
- And I must select private subnets for control plane

#### FR-012: EKS Node Group Configuration
**Description**: Users can configure managed node groups for EKS.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I have an EKS cluster configured
- When I add a node group
- Then I can specify instance types, scaling configuration (min/max/desired)
- And I can select launch template or use defaults
- And I can assign an IAM role created in Step 1

#### FR-013: EC2 Instance Configuration
**Description**: Users can configure standalone EC2 instances.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Compute step
- When I add an EC2 instance
- Then I can select instance type from a categorized list
- And I can select subnet from Network Layer
- And I can select security groups from Network Layer
- And I can assign instance profile from IAM step

#### FR-014: Instance Type Selection
**Description**: Users can search and select EC2 instance types.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring compute resources
- When I select instance type
- Then I can filter by family (t3, m5, c5, etc.)
- And I can see vCPU, memory, and hourly cost
- And I can search by instance type name

#### FR-015: Auto Scaling Group Configuration
**Description**: Users can configure Auto Scaling Groups.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Compute step
- When I add an ASG
- Then I can specify name, min/max/desired capacity
- And I can select subnets (multi-AZ)
- And I can configure scaling policies (target tracking, step scaling)

#### FR-016: Launch Template Configuration
**Description**: Users can configure launch templates for ASGs.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring an ASG
- When I create a launch template
- Then I can specify AMI, instance type, key pair, security groups
- And I can configure user data script
- And I can specify EBS volumes

#### FR-017: Placement in Private Subnets
**Description**: Compute resources default to private subnets.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am placing compute resources
- When I select subnets
- Then private subnets are shown first
- And a warning is shown if public subnet is selected
- And validation fails if no private subnets are available

#### FR-018: Security Group Assignment
**Description**: Users can assign existing security groups to compute resources.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring compute resources
- When I select security groups
- Then I can see all security groups from Network Layer
- And I can select multiple security groups
- And I can see the rules summary for each group

#### FR-019: Key Pair Selection
**Description**: Users can specify SSH key pairs for EC2 access.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring EC2 or EKS nodes
- When I select key pair
- Then I can choose from existing key pairs
- Or I can specify a key pair name to create later

#### FR-020: User Data Configuration
**Description**: Users can specify user data scripts for EC2 instances.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am configuring EC2 or launch template
- When I add user data
- Then I can enter a shell script or cloud-init config
- And the script is base64 encoded automatically

#### FR-021: EBS Volume Configuration
**Description**: Users can configure EBS volumes for compute resources.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring EC2 or launch template
- When I add EBS volumes
- Then I can specify volume type (gp3, io1, etc.), size, IOPS
- And I can enable encryption (default: enabled)
- And I can specify KMS key ID

#### FR-022: Compute Summary View
**Description**: Users can see a summary of all compute resources.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I have configured compute resources
- When I view the summary
- Then I can see all clusters, instances, and ASGs
- And I can see estimated monthly cost
- And I can edit or delete any resource

---

### 3.3 Database Services Step (FR-023 to FR-035)

#### FR-023: RDS Instance Configuration
**Description**: Users can configure Amazon RDS instances.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Database step
- When I add an RDS instance
- Then I can specify instance identifier and credentials
- And I can select database engine and version

#### FR-024: Database Engine Selection
**Description**: Users can select from supported database engines.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I select database engine
- Then I can choose from PostgreSQL, MySQL, MariaDB, Oracle, SQL Server
- And I can select specific version
- And engine-specific options are shown

#### FR-025: Instance Class Selection
**Description**: Users can select RDS instance classes.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I select instance class
- Then I can filter by category (burstable, standard, memory-optimized)
- And I can see vCPU, memory, and hourly cost
- And recommendations are shown based on workload type

#### FR-026: Storage Configuration
**Description**: Users can configure RDS storage.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I configure storage
- Then I can select storage type (gp2, gp3, io1, magnetic)
- And I can specify allocated storage (20GB minimum)
- And I can enable storage autoscaling with max threshold

#### FR-027: Multi-AZ Deployment
**Description**: Users can enable Multi-AZ for high availability.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I enable Multi-AZ
- Then synchronous standby replica is configured
- And automatic failover is enabled
- And warning is shown for additional cost

#### FR-028: Subnet Group Configuration
**Description**: Users can configure DB subnet groups.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I configure subnet group
- Then subnets are selected from Network Layer private subnets
- And at least 2 AZs must be covered
- And error is shown if insufficient subnets

#### FR-029: Backup Configuration
**Description**: Users can configure automated backups.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I configure backups
- Then I can specify retention period (minimum 7 days for production)
- And I can specify preferred backup window
- And backup retention defaults to 7 days

#### FR-030: Parameter Group Configuration
**Description**: Users can configure database parameter groups.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I configure parameter group
- Then I can use default or create custom
- And I can modify engine-specific parameters
- And validation ensures valid parameter values

#### FR-031: Option Group Configuration
**Description**: Users can configure database option groups.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I configure option group
- Then I can add engine-specific options
- And option dependencies are validated

#### FR-032: Security Group Assignment for RDS
**Description**: Users can assign security groups to RDS.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I select security groups
- Then I can select from Network Layer security groups
- And default requires inbound rule for database port

#### FR-033: Encryption Configuration
**Description**: Users can configure encryption for RDS.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I configure encryption
- Then encryption is enabled by default
- And I can specify KMS key (default: AWS managed key)
- And warning is shown if encryption is disabled

#### FR-034: Performance Insights
**Description**: Users can enable Performance Insights.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am configuring RDS
- When I enable Performance Insights
- Then I can specify retention period (7 days free tier)
- And recommended for production workloads

#### FR-035: Database Summary View
**Description**: Users can see a summary of all databases.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I have configured databases
- When I view the summary
- Then I can see all RDS instances with configurations
- And I can see estimated monthly cost
- And I can edit or delete any database

---

### 3.4 Storage Services Step (FR-036 to FR-050)

#### FR-036: S3 Bucket Configuration
**Description**: Users can configure Amazon S3 buckets.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Storage step
- When I add an S3 bucket
- Then I can specify bucket name (globally unique)
- And bucket name validation follows S3 naming rules
- And region is pre-selected from workflow

#### FR-037: S3 Versioning
**Description**: Users can enable versioning on S3 buckets.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring S3
- When I configure versioning
- Then versioning is enabled by default
- And warning is shown if disabled
- And MFA delete can be configured

#### FR-038: S3 Encryption
**Description**: Users can configure S3 encryption.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring S3
- When I configure encryption
- Then server-side encryption is enabled by default
- And I can choose SSE-S3, SSE-KMS, or SSE-C
- And I can specify KMS key for SSE-KMS

#### FR-039: S3 Bucket Policy
**Description**: Users can configure S3 bucket policies.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am configuring S3
- When I add bucket policy
- Then I can use policy editor with templates
- And policies are validated for syntax
- And warnings for public access are shown

#### FR-040: S3 Lifecycle Rules
**Description**: Users can configure lifecycle rules.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am configuring S3
- When I add lifecycle rules
- Then I can specify transitions (IA, Glacier, Deep Archive)
- And I can specify expiration rules
- And I can filter by prefix or tags

#### FR-041: S3 Public Access Block
**Description**: Users can configure public access settings.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring S3
- When I configure public access
- Then all public access is blocked by default
- And explicit confirmation required to allow public access
- And security warning is shown

#### FR-042: EBS Volume Configuration
**Description**: Users can configure standalone EBS volumes.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Storage step
- When I add an EBS volume
- Then I can specify volume type, size, IOPS
- And I can select availability zone (matching compute resources)
- And encryption is enabled by default

#### FR-043: EBS Snapshot Configuration
**Description**: Users can configure EBS snapshots.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I have EBS volumes configured
- When I configure snapshots
- Then I can specify snapshot schedule
- And I can configure retention policy
- And cross-region copy can be enabled

#### FR-044: EFS File System Configuration
**Description**: Users can configure Amazon EFS file systems.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Storage step
- When I add an EFS file system
- Then I can specify name and performance mode
- And I can select throughput mode (bursting/provisioned)
- And I can configure lifecycle policy

#### FR-045: EFS Mount Target Configuration
**Description**: Users can configure EFS mount targets.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring EFS
- When I configure mount targets
- Then I can select subnets from Network Layer
- And security groups can be assigned
- And at least one mount target per AZ is recommended

#### FR-046: EFS Access Points
**Description**: Users can configure EFS access points.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am configuring EFS
- When I add access points
- Then I can specify POSIX user/group
- And I can specify root directory path
- And permissions can be set

#### FR-047: EFS Encryption
**Description**: Users can configure EFS encryption.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring EFS
- When I configure encryption
- Then encryption at rest is enabled by default
- And encryption in transit can be enabled
- And KMS key can be specified

#### FR-048: Storage Class Selection
**Description**: Users can select appropriate storage classes.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am configuring storage
- When I select storage class
- Then I can see cost comparison between classes
- And recommendations based on access patterns
- And lifecycle transitions are suggested

#### FR-049: Cross-Region Replication
**Description**: Users can configure S3 cross-region replication.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am configuring S3
- When I enable CRR
- Then I can select destination region and bucket
- And I can configure replication rules
- And IAM role is automatically created

#### FR-050: Storage Summary View
**Description**: Users can see a summary of all storage resources.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I have configured storage
- When I view the summary
- Then I can see all S3 buckets, EBS volumes, EFS file systems
- And I can see estimated monthly cost
- And I can edit or delete any resource

---

### 3.5 Platform Validation Step (FR-051 to FR-060)

#### FR-051: IAM Policy Validation
**Description**: All IAM policies are validated for correctness.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Validation step
- When validation runs
- Then all IAM policies are checked for JSON syntax
- And invalid actions/resources are flagged
- And overly permissive policies are warned

#### FR-052: Resource Quota Check
**Description**: Resource usage against AWS quotas is checked.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Validation step
- When validation runs
- Then current quota usage is fetched (if credentials available)
- And warnings are shown if resources exceed quotas
- And quota increase recommendations are provided

#### FR-053: Cost Estimation
**Description**: Estimated monthly costs are calculated.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Validation step
- When validation runs
- Then costs are calculated for all resources
- And breakdown by service is shown
- And total monthly estimate is displayed

#### FR-054: Security Best Practices Check
**Description**: Configuration is checked against security best practices.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Validation step
- When validation runs
- Then IAM least privilege is checked
- And encryption settings are verified
- And network isolation is confirmed
- And findings are categorized by severity

#### FR-055: Compliance Checks
**Description**: Configuration is checked for compliance requirements.
**Priority**: Should Have
**Acceptance Criteria**:
- Given I am on the Validation step
- When validation runs
- Then CIS Benchmark controls are checked
- And AWS Well-Architected findings are shown
- And remediation steps are provided

#### FR-056: Network Dependency Validation
**Description**: Platform resources correctly reference Network Layer.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Validation step
- When validation runs
- Then compute resources are in valid subnets
- And databases are in private subnets
- And security group references are valid

#### FR-057: IAM Dependency Validation
**Description**: Resources correctly reference IAM roles.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Validation step
- When validation runs
- Then EC2 instance profiles exist for referenced roles
- And EKS node groups have valid IAM roles
- And service-linked roles are properly configured

#### FR-058: Cross-Resource Validation
**Description**: Resources are validated for cross-dependencies.
**Priority**: Must Have
**Acceptance Criteria**:
- Given I am on the Validation step
- When validation runs
- Then EBS volumes are in same AZ as EC2 instances
- And EFS mount targets cover required AZs
- And RDS subnet groups have required coverage

#### FR-059: Validation Summary Report
**Description**: Complete validation report is generated.
**Priority**: Must Have
**Acceptance Criteria**:
- Given validation has completed
- When I view the report
- Then all findings are listed by category
- And severity is indicated (error/warning/info)
- And I can navigate to fix each issue

#### FR-060: One-Click Fix Suggestions
**Description**: Actionable fix suggestions are provided.
**Priority**: Should Have
**Acceptance Criteria**:
- Given validation has issues
- When I view a finding
- Then specific fix steps are shown
- And "Fix" button navigates to the relevant step
- And auto-fix is available for simple issues

---

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-001 to NFR-003)

#### NFR-001: Step Load Time
**Description**: Each wizard step loads within 500ms.
**Acceptance Criteria**: 95th percentile page load < 500ms.

#### NFR-002: Validation Response Time
**Description**: Real-time validation responds within 200ms.
**Acceptance Criteria**: IAM policy validation < 200ms.

#### NFR-003: Cost Estimation Time
**Description**: Cost estimation completes within 2 seconds.
**Acceptance Criteria**: Full cost calculation < 2s.

### 4.2 Security (NFR-004 to NFR-006)

#### NFR-004: IAM Policy Security
**Description**: No overly permissive policies allowed without explicit acknowledgment.
**Acceptance Criteria**: Warnings for "*" actions or resources require confirmation.

#### NFR-005: Encryption Defaults
**Description**: All resources default to encryption enabled.
**Acceptance Criteria**: Encryption is ON by default for RDS, S3, EBS, EFS.

#### NFR-006: No Credential Storage
**Description**: No AWS credentials stored in the application.
**Acceptance Criteria**: Credentials use temporary session tokens only.

### 4.3 Usability (NFR-007 to NFR-009)

#### NFR-007: Progressive Disclosure
**Description**: Advanced options are hidden by default.
**Acceptance Criteria**: Basic configuration visible; advanced behind "Show Advanced".

#### NFR-008: Contextual Help
**Description**: Help text available for all configuration options.
**Acceptance Criteria**: Info icons with tooltips for every field.

#### NFR-009: Keyboard Navigation
**Description**: Full keyboard navigation support.
**Acceptance Criteria**: All actions accessible via keyboard; focus management correct.

### 4.4 Accessibility (NFR-010 to NFR-012)

#### NFR-010: WCAG 2.1 AA Compliance
**Description**: Interface meets WCAG 2.1 AA standards.
**Acceptance Criteria**: Audit passes with no AA violations.

#### NFR-011: Screen Reader Support
**Description**: Full screen reader compatibility.
**Acceptance Criteria**: All content and actions announced correctly.

#### NFR-012: Color Contrast
**Description**: Sufficient color contrast for all text and UI elements.
**Acceptance Criteria**: Minimum 4.5:1 contrast ratio.

### 4.5 Reliability (NFR-013 to NFR-015)

#### NFR-013: State Persistence
**Description**: Wizard state is preserved across browser refreshes.
**Acceptance Criteria**: Configuration survives page reload.

#### NFR-014: Error Recovery
**Description**: Graceful handling of API errors.
**Acceptance Criteria**: User-friendly error messages; retry options provided.

#### NFR-015: Auto-Save
**Description**: Configuration auto-saved periodically.
**Acceptance Criteria**: Auto-save every 30 seconds when changes detected.

---

## 5. Integration Requirements

### 5.1 Network Layer Integration
- Platform wizard depends on completed Network Layer
- Subnets and security groups from Network Layer are available for selection
- Validation ensures platform resources reference valid network resources

### 5.2 API Integration
- All configuration persisted via existing workflow API
- Platform layer data stored in `platformData` field
- Design nodes generated for visual representation

### 5.3 Context Integration
- Uses existing `DesignWizardContext` for state management
- Layer status updated on completion
- Supports layer navigation (back to Network, forward to DevOps)

---

## 6. Data Model

### 6.1 Platform Layer Data Structure

```typescript
interface PlatformLayerData {
  iam: IAMConfig;
  compute: ComputeConfig;
  database: DatabaseConfig;
  storage: StorageConfig;
  validationResult?: PlatformValidationResult;
}
```

### 6.2 Key Entity Relationships

```
IAMRole --< Policy (one-to-many)
IAMRole --> InstanceProfile (one-to-one)
EC2Instance --> Subnet (many-to-one)
EC2Instance --> SecurityGroup (many-to-many)
EC2Instance --> InstanceProfile (many-to-one)
EKSCluster --> Subnet (many-to-many)
EKSNodeGroup --> IAMRole (many-to-one)
RDSInstance --> SubnetGroup --> Subnet (many-to-many)
RDSInstance --> SecurityGroup (many-to-many)
EFSFileSystem --> MountTarget --> Subnet (one-to-many)
```

---

## 7. UI/UX Requirements

### 7.1 Step Indicator
- Clear progress indicator showing current step (1-5)
- Steps are labeled: IAM | Compute | Database | Storage | Validate
- Completed steps show checkmark

### 7.2 Resource Cards
- Each configured resource displayed as a card
- Cards show key configuration summary
- Edit and delete actions available on each card

### 7.3 Validation Feedback
- Inline validation errors below fields
- Summary validation at step transitions
- Final validation report on step 5

### 7.4 Cost Display
- Running cost estimate shown in header
- Updated as resources are added/modified
- Breakdown available on demand

---

## 8. Out of Scope

- AWS credential management (handled by deployment agent)
- Terraform/CloudFormation generation (handled by deployment)
- Multi-cloud support (AWS only for this phase)
- Advanced networking (VPN, Direct Connect, Transit Gateway)
- Container registry (ECR) configuration
- Secrets Manager / Parameter Store configuration

---

## 9. Assumptions and Dependencies

### 9.1 Assumptions
- Network Layer wizard is complete and functional
- User has basic understanding of AWS services
- Region is selected before starting Platform wizard

### 9.2 Dependencies
- Network Layer must be complete before Platform
- DesignWizardContext must support platform layer
- API must support platform layer data persistence

---

## 10. Acceptance Test Scenarios

### Scenario 1: IAM Role with Custom Policy
```gherkin
Given I am on the IAM Roles step
And I click "Add Role"
When I enter role name "app-backend-role"
And I select trust policy for EC2 service
And I attach managed policy "AmazonS3ReadOnlyAccess"
And I add custom policy with S3 write to specific bucket
Then the role is created with both policies
And validation passes
```

### Scenario 2: EKS Cluster in Private Subnets
```gherkin
Given I am on the Compute step
And Network Layer has 2 private subnets configured
When I add an EKS cluster "prod-cluster"
And I select both private subnets
And I select Kubernetes version 1.28
Then the cluster is configured correctly
And validation confirms private subnet placement
```

### Scenario 3: RDS with Multi-AZ and Encryption
```gherkin
Given I am on the Database step
When I add an RDS instance "prod-db"
And I select PostgreSQL 15
And I enable Multi-AZ
And I verify encryption is enabled by default
And I set backup retention to 14 days
Then the database is configured with HA and encryption
And cost estimate reflects Multi-AZ pricing
```

### Scenario 4: S3 Bucket with Security Defaults
```gherkin
Given I am on the Storage step
When I add an S3 bucket "my-app-data-bucket"
Then versioning is enabled by default
And encryption is enabled by default
And public access is blocked by default
And I must explicitly disable any security feature
```

### Scenario 5: Platform Validation Catches Issues
```gherkin
Given I have configured:
  - IAM role with "s3:*" action
  - EC2 instance in public subnet
  - RDS with 3-day backup retention
When I reach the Validation step
Then I see warning for overly permissive IAM
And I see warning for EC2 in public subnet
And I see error for backup retention < 7 days
And I can click to navigate to each issue
```

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | BA Agent | Initial requirements document |

---

**Sign-off**:
- [ ] Product Owner
- [ ] Tech Lead
- [ ] Security Team
- [ ] UX Team
