/**
 * CI/CD Pipeline Template
 * Complete CI/CD pipeline with CodePipeline, CodeBuild, and CodeDeploy
 */

import type { TemplateDefinition } from './types';
import {
  createCodePipelineNode,
  createCodeBuildNode,
  createCodeDeployNode,
  createS3BucketNode,
  createECRRepositoryNode,
  createSNSTopicNode,
  createKMSKeyNode,
  createIAMRoleNode,
  createEventBridgeNode,
  createLambdaFunctionNode,
  createCloudWatchAlarmNode,
} from './utils/node-factory';
import { createEdge } from './utils/edge-factory';

export function createCICDPipelineTemplate(): TemplateDefinition {
  // CodePipeline
  const pipeline = createCodePipelineNode('app-pipeline', { x: 560, y: 0 }, {
    stages: [
      { name: 'Source', actions: ['GitHub/CodeCommit'] },
      { name: 'Build', actions: ['CodeBuild'] },
      { name: 'Test', actions: ['CodeBuild Test'] },
      { name: 'Deploy-Staging', actions: ['CodeDeploy to Staging'] },
      { name: 'Approval', actions: ['Manual Approval'] },
      { name: 'Deploy-Production', actions: ['CodeDeploy to Production'] },
    ],
  });

  // CodeBuild Projects
  const buildProject = createCodeBuildNode('app-build', { x: 280, y: 150 }, {
    computeType: 'BUILD_GENERAL1_MEDIUM',
    image: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0',
    privilegedMode: true,
  });

  const testProject = createCodeBuildNode('app-test', { x: 560, y: 150 }, {
    computeType: 'BUILD_GENERAL1_SMALL',
    image: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0',
    privilegedMode: false,
  });

  const securityScanProject = createCodeBuildNode('security-scan', { x: 840, y: 150 }, {
    computeType: 'BUILD_GENERAL1_SMALL',
    image: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0',
    privilegedMode: true,
  });

  // CodeDeploy Applications
  const stagingDeploy = createCodeDeployNode('staging-deployment', { x: 280, y: 300 }, {
    computePlatform: 'Server',
    deploymentConfigName: 'CodeDeployDefault.OneAtATime',
  });

  const productionDeploy = createCodeDeployNode('production-deployment', { x: 560, y: 300 }, {
    computePlatform: 'Server',
    deploymentConfigName: 'CodeDeployDefault.HalfAtATime',
  });

  const ecsDeploy = createCodeDeployNode('ecs-deployment', { x: 840, y: 300 }, {
    computePlatform: 'ECS',
    deploymentConfigName: 'CodeDeployDefault.ECSLinear10PercentEvery1Minutes',
  });

  // S3 Buckets
  const artifactsBucket = createS3BucketNode('pipeline-artifacts', { x: 100, y: 150 }, {
    versioning: true,
    encryption: { enabled: true, algorithm: 'aws:kms' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  const cachesBucket = createS3BucketNode('build-caches', { x: 100, y: 300 }, {
    versioning: false,
    encryption: { enabled: true, algorithm: 'AES256' },
    blockPublicAccess: {
      blockPublicAcls: true,
      ignorePublicAcls: true,
      blockPublicPolicy: true,
      restrictPublicBuckets: true,
    },
  });

  // ECR Repository
  const ecr = createECRRepositoryNode('app-images', { x: 100, y: 0 }, {
    imageScanOnPush: true,
    imageTagMutability: 'IMMUTABLE',
  });

  // KMS Key for artifact encryption
  const artifactKey = createKMSKeyNode('pipeline-key', { x: 100, y: 450 }, {
    alias: 'alias/pipeline-artifacts',
    description: 'KMS key for pipeline artifact encryption',
    enableKeyRotation: true,
  });

  // SNS Topics
  const pipelineNotifications = createSNSTopicNode('pipeline-notifications', { x: 940, y: 0 }, {
    displayName: 'Pipeline Notifications',
    fifoTopic: false,
  });

  const approvalNotifications = createSNSTopicNode('approval-notifications', { x: 940, y: 150 }, {
    displayName: 'Deployment Approvals',
    fifoTopic: false,
  });

  // EventBridge Rules
  const pipelineEvents = createEventBridgeNode('pipeline-events', { x: 560, y: 450 }, {
    description: 'Monitor pipeline state changes',
    eventPattern: JSON.stringify({
      source: ['aws.codepipeline'],
      'detail-type': ['CodePipeline Pipeline Execution State Change'],
    }),
  });

  const buildEvents = createEventBridgeNode('build-events', { x: 280, y: 450 }, {
    description: 'Monitor build state changes',
    eventPattern: JSON.stringify({
      source: ['aws.codebuild'],
      'detail-type': ['CodeBuild Build State Change'],
    }),
  });

  // Lambda for custom actions
  const slackNotifier = createLambdaFunctionNode('slack-notifier', { x: 940, y: 450 }, {
    runtime: 'nodejs20.x',
    handler: 'index.handler',
    memorySize: 128,
    timeout: 30,
    description: 'Send pipeline notifications to Slack',
  });

  // IAM Roles
  const pipelineRole = createIAMRoleNode('pipeline-service-role', { x: 380, y: 550 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'codepipeline.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [],
    description: 'IAM role for CodePipeline service',
  });

  const buildRole = createIAMRoleNode('codebuild-service-role', { x: 560, y: 550 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'codebuild.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser',
    ],
    description: 'IAM role for CodeBuild service',
  });

  const deployRole = createIAMRoleNode('codedeploy-service-role', { x: 740, y: 550 }, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'codedeploy.amazonaws.com' },
        Action: 'sts:AssumeRole',
      }],
    }),
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole',
    ],
    description: 'IAM role for CodeDeploy service',
  });

  // CloudWatch Alarm
  const failureAlarm = createCloudWatchAlarmNode('pipeline-failure-alarm', { x: 840, y: 450 }, {
    metricName: 'FailedPipelines',
    namespace: 'AWS/CodePipeline',
    statistic: 'Sum',
    period: 300,
    threshold: 1,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    evaluationPeriods: 1,
  });

  const nodes = [
    pipeline,
    buildProject, testProject, securityScanProject,
    stagingDeploy, productionDeploy, ecsDeploy,
    artifactsBucket, cachesBucket,
    ecr,
    artifactKey,
    pipelineNotifications, approvalNotifications,
    pipelineEvents, buildEvents,
    slackNotifier,
    pipelineRole, buildRole, deployRole,
    failureAlarm,
  ];

  const edges = [
    // Pipeline -> Build stages
    createEdge(pipeline.id, buildProject.id, { label: 'build', animated: true }),
    createEdge(pipeline.id, testProject.id, { label: 'test', animated: true }),
    createEdge(pipeline.id, securityScanProject.id, { label: 'scan' }),
    // Pipeline -> Deploy stages
    createEdge(pipeline.id, stagingDeploy.id, { label: 'staging', animated: true }),
    createEdge(pipeline.id, productionDeploy.id, { label: 'production', animated: true }),
    // Build -> ECR
    createEdge(buildProject.id, ecr.id, { label: 'pushes' }),
    // S3 artifacts
    createEdge(artifactsBucket.id, pipeline.id, { label: 'artifacts' }),
    createEdge(cachesBucket.id, buildProject.id, { label: 'cache' }),
    // KMS encryption
    createEdge(artifactKey.id, artifactsBucket.id, { label: 'encrypts' }),
    // Notifications
    createEdge(pipeline.id, pipelineNotifications.id, { label: 'notifies' }),
    createEdge(pipeline.id, approvalNotifications.id, { label: 'approval' }),
    // EventBridge routing
    createEdge(pipelineEvents.id, slackNotifier.id, { label: 'triggers', animated: true }),
    createEdge(buildEvents.id, slackNotifier.id, { label: 'triggers', animated: true }),
    // Alarms -> SNS
    createEdge(failureAlarm.id, pipelineNotifications.id, { label: 'alerts' }),
    // IAM Roles
    createEdge(pipelineRole.id, pipeline.id, { label: 'role' }),
    createEdge(buildRole.id, buildProject.id, { label: 'role' }),
    createEdge(buildRole.id, testProject.id, { label: 'role' }),
    createEdge(buildRole.id, securityScanProject.id, { label: 'role' }),
    createEdge(deployRole.id, stagingDeploy.id, { label: 'role' }),
    createEdge(deployRole.id, productionDeploy.id, { label: 'role' }),
    createEdge(deployRole.id, ecsDeploy.id, { label: 'role' }),
  ];

  return {
    name: 'CI/CD Pipeline',
    description: 'Complete CI/CD pipeline using AWS native services. Features a 6-stage CodePipeline (Source, Build, Test, Deploy-Staging, Approval, Deploy-Production), multiple CodeBuild projects for building, testing, and security scanning, CodeDeploy configurations for EC2 and ECS deployments, ECR for container image storage, and comprehensive notifications via SNS and Slack. Supports blue/green and rolling deployments.',
    category: 'compute_platform',
    visibility: 'public',
    layerType: 'devops',
    version: '1.0.0',
    tags: ['cicd', 'pipeline', 'codepipeline', 'codebuild', 'codedeploy', 'devops', 'automation', 'aws'],
    templateData: {
      nodes,
      edges,
      metadata: {
        author: 'Deltek Catalyst Team',
        version: '1.0.0',
        tested: true,
        compliance: ['SOC2'],
        estimatedCost: {
          dev: 30,
          staging: 40,
          prod: 50,
          currency: 'USD',
        },
        prerequisites: [
          'Source repository (GitHub, CodeCommit, or Bitbucket)',
          'Build specification files (buildspec.yml)',
          'Deployment configuration files (appspec.yml)',
          'Target compute resources (EC2, ECS, or Lambda)',
        ],
        customizationGuide: 'Modify pipeline stages based on your release process. Adjust CodeBuild compute type based on build complexity. Configure CodeDeploy deployment configuration for your availability requirements. Add additional stages for integration testing, performance testing, or compliance scanning.',
        deploymentTime: '10-15 minutes',
        components: [
          { type: 'CodePipeline', count: 1, description: '6-stage pipeline with manual approval' },
          { type: 'CodeBuild Projects', count: 3, description: 'Build, Test, Security Scan' },
          { type: 'CodeDeploy Applications', count: 3, description: 'Staging, Production, ECS' },
          { type: 'S3 Buckets', count: 2, description: 'Artifacts and build cache' },
          { type: 'ECR Repository', count: 1, description: 'Container image registry' },
          { type: 'KMS Key', count: 1, description: 'Artifact encryption' },
          { type: 'SNS Topics', count: 2, description: 'Pipeline and approval notifications' },
          { type: 'EventBridge Rules', count: 2, description: 'Pipeline and build events' },
          { type: 'Lambda Function', count: 1, description: 'Slack notification' },
          { type: 'IAM Roles', count: 3, description: 'Pipeline, Build, Deploy roles' },
          { type: 'CloudWatch Alarm', count: 1, description: 'Pipeline failure monitoring' },
        ],
      },
    },
  };
}
