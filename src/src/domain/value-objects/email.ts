import { ValidationError } from '../errors/validation.error';

export class Email {
  private readonly _value: string;

  constructor(value: string) {
    if (!Email.isValid(value)) {
      throw new ValidationError('Invalid email format');
    }
    this._value = value.toLowerCase().trim();
  }

  get value(): string {
    return this._value;
  }

  static isValid(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim()) && email.length <= 255;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
