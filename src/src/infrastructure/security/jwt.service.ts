import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { IJwtService } from '../../application/services/auth.service';
import { UnauthorizedError } from '../../domain/errors';

export interface JwtConfig {
  privateKey: string;
  publicKey: string;
  accessTokenExpiry: string;
  issuer: string;
  audience: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export class JwtService implements IJwtService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly accessTokenExpiry: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: JwtConfig) {
    this.privateKey = config.privateKey;
    this.publicKey = config.publicKey;
    this.accessTokenExpiry = config.accessTokenExpiry;
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  generateAccessToken(payload: { sub: string; email: string }): string {
    const signOptions: SignOptions = {
      algorithm: 'RS256',
      expiresIn: this.accessTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
    };

    return jwt.sign(payload, this.privateKey, signOptions);
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      const verifyOptions: VerifyOptions = {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      };

      const decoded = jwt.verify(token, this.publicKey, verifyOptions) as JwtPayload;
      return {
        sub: decoded.sub,
        email: decoded.email,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw UnauthorizedError.tokenExpired();
      }
      throw UnauthorizedError.invalidToken();
    }
  }
}

/**
 * Generate RSA key pair for development/testing
 * In production, use pre-generated keys stored securely
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const { generateKeyPairSync } = crypto;
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}
