import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const safeUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const profileSelect = {
  ...safeUserSelect,
  phone: true,
  address: true,
  city: true,
  country: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findPublicById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  }

  findProfileById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: profileSelect });
  }

  updateProfile(id: string, input: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        displayName: input.displayName,
        phone: input.phone,
        address: input.address,
        city: input.city,
        country: input.country,
      },
      select: profileSelect,
    });
  }

  create(email: string, passwordHash: string, role: Role = Role.CUSTOMER) {
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        cart: { create: {} },
      },
      select: safeUserSelect,
    });
  }
}

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;
