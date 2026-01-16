import { PrismaClient, User as PrismaUser } from '@prisma/client';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../../application/interfaces/user.repository.interface';

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(user: User): Promise<User> {
    const data = user.toPersistence();

    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: data.id,
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        updatedAt: data.updatedAt,
      },
    });

    return user;
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return record ? this.toDomain(record) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  private toDomain(record: PrismaUser): User {
    return User.fromPersistence({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
