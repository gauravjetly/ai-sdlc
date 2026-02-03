/**
 * Network Validation Hook
 * Provides validation functions for network layer configuration
 */

import { useCallback, useMemo } from 'react';
import {
  VPCConfig,
  SubnetConfig,
  RoutingConfig,
  SecurityGroupConfig,
  ValidationError,
  ValidationResult,
  NetworkLayerData,
} from '../../../../types/network';
import {
  validateVPC,
  validateSubnet,
  validateSubnets,
  validateRouting,
  validateSecurityGroup,
  validateSecurityGroups,
  validateNetworkLayer,
} from '../utils/validation';
import {
  isValidCIDR,
  isRFC1918,
  isCIDRWithinRange,
  isCIDROverlapping,
} from '../utils/cidr';

export interface UseNetworkValidationResult {
  // Full validation
  validate: (config: NetworkLayerData) => ValidationResult;

  // Component-level validation
  validateVPCConfig: (vpc: VPCConfig) => ValidationError[];
  validateSubnetConfig: (
    subnet: SubnetConfig,
    vpcCidr: string,
    existingSubnets: SubnetConfig[]
  ) => ValidationError[];
  validateAllSubnets: (subnets: SubnetConfig[], vpcCidr: string) => ValidationError[];
  validateRoutingConfig: (routing: RoutingConfig, subnets: SubnetConfig[]) => ValidationError[];
  validateSecurityGroupConfig: (sg: SecurityGroupConfig) => ValidationError[];
  validateAllSecurityGroups: (sgs: SecurityGroupConfig[]) => ValidationError[];

  // Utility functions
  isCIDRValid: (cidr: string) => boolean;
  isCIDRPrivate: (cidr: string) => boolean;
  isCIDRInRange: (subnet: string, vpc: string) => boolean;
  doCIDRsOverlap: (cidr1: string, cidr2: string) => boolean;

  // Error helpers
  getErrorsForPath: (errors: ValidationError[], pathPrefix: string) => ValidationError[];
  hasErrorsForPath: (errors: ValidationError[], pathPrefix: string) => boolean;
}

export function useNetworkValidation(): UseNetworkValidationResult {
  // Full network layer validation
  const validate = useCallback((config: NetworkLayerData): ValidationResult => {
    return validateNetworkLayer(config);
  }, []);

  // VPC validation
  const validateVPCConfig = useCallback((vpc: VPCConfig): ValidationError[] => {
    return validateVPC(vpc);
  }, []);

  // Single subnet validation
  const validateSubnetConfig = useCallback(
    (
      subnet: SubnetConfig,
      vpcCidr: string,
      existingSubnets: SubnetConfig[]
    ): ValidationError[] => {
      return validateSubnet(subnet, vpcCidr, existingSubnets);
    },
    []
  );

  // All subnets validation
  const validateAllSubnets = useCallback(
    (subnets: SubnetConfig[], vpcCidr: string): ValidationError[] => {
      return validateSubnets(subnets, vpcCidr);
    },
    []
  );

  // Routing validation
  const validateRoutingConfig = useCallback(
    (routing: RoutingConfig, subnets: SubnetConfig[]): ValidationError[] => {
      return validateRouting(routing, subnets);
    },
    []
  );

  // Single security group validation
  const validateSecurityGroupConfig = useCallback(
    (sg: SecurityGroupConfig): ValidationError[] => {
      return validateSecurityGroup(sg);
    },
    []
  );

  // All security groups validation
  const validateAllSecurityGroups = useCallback(
    (sgs: SecurityGroupConfig[]): ValidationError[] => {
      return validateSecurityGroups(sgs);
    },
    []
  );

  // CIDR utilities
  const isCIDRValid = useCallback((cidr: string): boolean => {
    return isValidCIDR(cidr);
  }, []);

  const isCIDRPrivate = useCallback((cidr: string): boolean => {
    return isRFC1918(cidr);
  }, []);

  const isCIDRInRange = useCallback((subnet: string, vpc: string): boolean => {
    return isCIDRWithinRange(subnet, vpc);
  }, []);

  const doCIDRsOverlap = useCallback((cidr1: string, cidr2: string): boolean => {
    return isCIDROverlapping(cidr1, cidr2);
  }, []);

  // Error helpers
  const getErrorsForPath = useCallback(
    (errors: ValidationError[], pathPrefix: string): ValidationError[] => {
      return errors.filter(
        (e) => e.path?.startsWith(pathPrefix) || false
      );
    },
    []
  );

  const hasErrorsForPath = useCallback(
    (errors: ValidationError[], pathPrefix: string): boolean => {
      return errors.some((e) => e.path?.startsWith(pathPrefix) || false);
    },
    []
  );

  return useMemo(
    () => ({
      validate,
      validateVPCConfig,
      validateSubnetConfig,
      validateAllSubnets,
      validateRoutingConfig,
      validateSecurityGroupConfig,
      validateAllSecurityGroups,
      isCIDRValid,
      isCIDRPrivate,
      isCIDRInRange,
      doCIDRsOverlap,
      getErrorsForPath,
      hasErrorsForPath,
    }),
    [
      validate,
      validateVPCConfig,
      validateSubnetConfig,
      validateAllSubnets,
      validateRoutingConfig,
      validateSecurityGroupConfig,
      validateAllSecurityGroups,
      isCIDRValid,
      isCIDRPrivate,
      isCIDRInRange,
      doCIDRsOverlap,
      getErrorsForPath,
      hasErrorsForPath,
    ]
  );
}

export default useNetworkValidation;
