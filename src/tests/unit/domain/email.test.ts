import { Email } from '../../../src/domain/value-objects/email';
import { ValidationError } from '../../../src/domain/errors';

describe('Email Value Object', () => {
  describe('constructor', () => {
    it('should create email with valid format', () => {
      const email = new Email('test@example.com');
      expect(email.value).toBe('test@example.com');
    });

    it('should normalize email to lowercase', () => {
      const email = new Email('Test@EXAMPLE.COM');
      expect(email.value).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const email = new Email('  test@example.com  ');
      expect(email.value).toBe('test@example.com');
    });

    it('should throw ValidationError for invalid email', () => {
      expect(() => new Email('invalid-email')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty email', () => {
      expect(() => new Email('')).toThrow(ValidationError);
    });

    it('should throw ValidationError for email without @', () => {
      expect(() => new Email('testexample.com')).toThrow(ValidationError);
    });

    it('should throw ValidationError for email without domain', () => {
      expect(() => new Email('test@')).toThrow(ValidationError);
    });

    it('should throw ValidationError for email without local part', () => {
      expect(() => new Email('@example.com')).toThrow(ValidationError);
    });
  });

  describe('isValid', () => {
    it('should return true for valid email', () => {
      expect(Email.isValid('test@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(Email.isValid('test@mail.example.com')).toBe(true);
    });

    it('should return true for email with plus sign', () => {
      expect(Email.isValid('test+tag@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(Email.isValid('invalid')).toBe(false);
    });

    it('should return false for null', () => {
      expect(Email.isValid(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Email.isValid(undefined as any)).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same email', () => {
      const email1 = new Email('test@example.com');
      const email2 = new Email('test@example.com');

      expect(email1.equals(email2)).toBe(true);
    });

    it('should return true for same email with different casing', () => {
      const email1 = new Email('test@example.com');
      const email2 = new Email('TEST@EXAMPLE.COM');

      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = new Email('test1@example.com');
      const email2 = new Email('test2@example.com');

      expect(email1.equals(email2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return email string', () => {
      const email = new Email('test@example.com');
      expect(email.toString()).toBe('test@example.com');
    });
  });
});
