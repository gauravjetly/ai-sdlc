import { User, CreateUserProps } from '../../../src/domain/entities/user.entity';
import { ValidationError } from '../../../src/domain/errors';

describe('User Entity', () => {
  const validCreateProps: CreateUserProps = {
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    name: 'John Doe',
  };

  describe('create', () => {
    it('should create a user with valid properties', () => {
      const user = User.create(validCreateProps);

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBe(validCreateProps.passwordHash);
      expect(user.name).toBe('John Doe');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should normalize email to lowercase', () => {
      const user = User.create({
        ...validCreateProps,
        email: 'Test@EXAMPLE.com',
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should trim name', () => {
      const user = User.create({
        ...validCreateProps,
        name: '  John Doe  ',
      });

      expect(user.name).toBe('John Doe');
    });

    it('should throw ValidationError for empty name', () => {
      expect(() =>
        User.create({
          ...validCreateProps,
          name: '',
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for name shorter than 2 characters', () => {
      expect(() =>
        User.create({
          ...validCreateProps,
          name: 'J',
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for name longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(() =>
        User.create({
          ...validCreateProps,
          name: longName,
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid email format', () => {
      expect(() =>
        User.create({
          ...validCreateProps,
          email: 'invalid-email',
        })
      ).toThrow(ValidationError);
    });

    it('should accept name with exactly 2 characters', () => {
      const user = User.create({
        ...validCreateProps,
        name: 'Jo',
      });

      expect(user.name).toBe('Jo');
    });

    it('should accept name with exactly 100 characters', () => {
      const maxName = 'a'.repeat(100);
      const user = User.create({
        ...validCreateProps,
        name: maxName,
      });

      expect(user.name).toBe(maxName);
    });
  });

  describe('updateName', () => {
    it('should update name', () => {
      const user = User.create(validCreateProps);
      user.updateName('Jane Doe');

      expect(user.name).toBe('Jane Doe');
    });

    it('should throw ValidationError for invalid name', () => {
      const user = User.create(validCreateProps);

      expect(() => user.updateName('')).toThrow(ValidationError);
    });
  });

  describe('updatePassword', () => {
    it('should update password hash', () => {
      const user = User.create(validCreateProps);
      const newHash = '$2b$12$newhash';
      user.updatePassword(newHash);

      expect(user.passwordHash).toBe(newHash);
    });
  });

  describe('toJSON', () => {
    it('should return user data without password', () => {
      const user = User.create(validCreateProps);
      const json = user.toJSON();

      expect(json.id).toBe(user.id);
      expect(json.email).toBe(user.email);
      expect(json.name).toBe(user.name);
      expect((json as any).passwordHash).toBeUndefined();
    });
  });

  describe('toPersistence', () => {
    it('should return all user data including password hash', () => {
      const user = User.create(validCreateProps);
      const persistence = user.toPersistence();

      expect(persistence.id).toBe(user.id);
      expect(persistence.email).toBe(user.email);
      expect(persistence.passwordHash).toBe(user.passwordHash);
      expect(persistence.name).toBe(user.name);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute user from persistence data', () => {
      const persistedData = {
        id: 'user-uuid',
        email: 'persisted@example.com',
        passwordHash: '$2b$12$persisted',
        name: 'Persisted User',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-15'),
      };

      const user = User.fromPersistence(persistedData);

      expect(user.id).toBe(persistedData.id);
      expect(user.email).toBe(persistedData.email);
      expect(user.passwordHash).toBe(persistedData.passwordHash);
      expect(user.name).toBe(persistedData.name);
    });
  });
});
