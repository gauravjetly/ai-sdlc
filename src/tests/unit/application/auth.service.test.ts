import {
  AuthService,
  IPasswordService,
  IJwtService,
  RegisterDto,
  LoginDto,
} from '../../../src/application/services/auth.service';
import { User } from '../../../src/domain/entities/user.entity';
import { UnauthorizedError, ConflictError } from '../../../src/domain/errors';
import { IUserRepository } from '../../../src/application/interfaces/user.repository.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordService: jest.Mocked<IPasswordService>;
  let mockJwtService: jest.Mocked<IJwtService>;

  const mockUser = User.create({
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    name: 'Test User',
  });

  beforeEach(() => {
    mockUserRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      existsByEmail: jest.fn(),
      delete: jest.fn(),
    };

    mockPasswordService = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    mockJwtService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
    };

    authService = new AuthService(mockUserRepository, mockPasswordService, mockJwtService);
  });

  describe('register', () => {
    const validRegisterDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User',
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      mockPasswordService.hash.mockResolvedValue('$2b$12$hashed');
      mockUserRepository.save.mockImplementation(async (user) => user);
      mockJwtService.generateAccessToken.mockReturnValue('access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');

      const result = await authService.register(validRegisterDto);

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(result.tokens.expiresIn).toBe(3600);
      expect(mockPasswordService.hash).toHaveBeenCalledWith(validRegisterDto.password);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictError when email already exists', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      await expect(authService.register(validRegisterDto)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for weak password - no uppercase', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);

      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'weakpassword123!',
      };

      await expect(authService.register(weakPasswordDto)).rejects.toThrow(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should throw error for weak password - no lowercase', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);

      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'WEAKPASSWORD123!',
      };

      await expect(authService.register(weakPasswordDto)).rejects.toThrow(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should throw error for weak password - no number', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);

      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'WeakPassword!',
      };

      await expect(authService.register(weakPasswordDto)).rejects.toThrow(
        'Password must contain at least one number'
      );
    });

    it('should throw error for weak password - no special char', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);

      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'WeakPassword123',
      };

      await expect(authService.register(weakPasswordDto)).rejects.toThrow(
        'Password must contain at least one special character'
      );
    });

    it('should throw error for weak password - too short', async () => {
      mockUserRepository.existsByEmail.mockResolvedValue(false);

      const weakPasswordDto = {
        ...validRegisterDto,
        password: 'Weak1!',
      };

      await expect(authService.register(weakPasswordDto)).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully with valid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockJwtService.generateAccessToken.mockReturnValue('access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');

      const result = await authService.login(loginDto);

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBe('access-token');
      expect(mockPasswordService.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash
      );
    });

    it('should throw UnauthorizedError when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedError);
      expect(mockPasswordService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when password is incorrect', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockJwtService.generateAccessToken.mockReturnValue('new-access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('new-refresh-token');

      const result = await authService.refreshToken(mockUser.id);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedError when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.refreshToken('invalid-id')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.getUserById(mockUser.id);

      expect(result).toBe(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await authService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
