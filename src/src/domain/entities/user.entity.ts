import { v4 as uuidv4 } from 'uuid';
import { Email } from '../value-objects/email';
import { ValidationError } from '../errors/validation.error';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  email: string;
  passwordHash: string;
  name: string;
}

export class User {
  readonly id: string;
  private _email: Email;
  private _passwordHash: string;
  private _name: string;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this._email = new Email(props.email);
    this._passwordHash = props.passwordHash;
    this._name = props.name;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new User
   */
  static create(props: CreateUserProps): User {
    User.validateName(props.name);

    const now = new Date();
    return new User({
      id: uuidv4(),
      email: props.email,
      passwordHash: props.passwordHash,
      name: props.name.trim(),
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Factory method to reconstitute User from persistence
   */
  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  /**
   * Update user's name
   */
  updateName(name: string): void {
    User.validateName(name);
    this._name = name.trim();
    this._updatedAt = new Date();
  }

  /**
   * Update user's password hash
   */
  updatePassword(passwordHash: string): void {
    this._passwordHash = passwordHash;
    this._updatedAt = new Date();
  }

  // Validation methods
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }
    if (name.trim().length < 2) {
      throw new ValidationError('Name must be at least 2 characters');
    }
    if (name.trim().length > 100) {
      throw new ValidationError('Name must be 100 characters or less');
    }
  }

  // Getters
  get email(): string {
    return this._email.value;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get name(): string {
    return this._name;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Convert to plain object for serialization (without password)
   */
  toJSON(): Omit<UserProps, 'passwordHash'> {
    return {
      id: this.id,
      email: this._email.value,
      name: this._name,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Convert to persistence object (includes password hash)
   */
  toPersistence(): UserProps {
    return {
      id: this.id,
      email: this._email.value,
      passwordHash: this._passwordHash,
      name: this._name,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
