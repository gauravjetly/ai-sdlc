import { User } from '../../domain/entities/user.entity';
import { UnauthorizedError, ConflictError } from '../../domain/errors';
import { IUserRepository } from '../interfaces/user.repository.interface';

export interface IPasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export interface IJwtService {
  generateAccessToken(payload: { sub: string; email: string }): string;
  generateRefreshToken(): string;
  verifyAccessToken(token: string): { sub: string; email: string };
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash' | 'toPersistence'>;
  tokens: AuthTokens;
}

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly jwtService: IJwtService
  ) {}

  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<AuthResult> {
    // Check if email already exists
    const existingUser = await this.userRepository.existsByEmail(dto.email);
    if (existingUser) {
      throw ConflictError.emailExists();
    }

    // Validate password strength
    this.validatePassword(dto.password);

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create user entity
    const user = User.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    // Save user
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: user.toJSON() as Omit<User, 'passwordHash' | 'toPersistence'>,
      tokens,
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login(dto: LoginDto): Promise<AuthResult> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw UnauthorizedError.invalidCredentials();
    }

    // Verify password
    const isPasswordValid = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw UnauthorizedError.invalidCredentials();
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: user.toJSON() as Omit<User, 'passwordHash' | 'toPersistence'>,
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string): Promise<AuthTokens> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UnauthorizedError.invalidToken();
    }

    return this.generateTokens(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters`);
    }
    if (!hasUpperCase) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!hasNumber) {
      throw new Error('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      throw new Error('Password must contain at least one special character');
    }
  }

  /**
   * Generate auth tokens for a user
   */
  private generateTokens(user: User): AuthTokens {
    const accessToken = this.jwtService.generateAccessToken({
      sub: user.id,
      email: user.email,
    });
    const refreshToken = this.jwtService.generateRefreshToken();

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour
    };
  }
}
