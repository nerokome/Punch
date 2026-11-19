import { GenderEnum, KYCStatus, PrismaClient, Role } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // List of offices to create
  const offices = [
    { name: 'Opebi Location', address: '75 Opebi Road' },
    { name: 'Allen Location', address: '22 Allen Road' },
  ];

  for (const priv of offices) {
      await prisma.officeLocation.create({ data: priv });
      console.log(`✅ Privilege created: ${priv.name}`);
  }

  const getOffices = await prisma.officeLocation.findMany();

  const superAdminExists = await prisma.user.findFirst({
    where: {
      email: 'superadmin@example.com',
    },
  });

  if (!superAdminExists) {
    const hashedPassword = await bcrypt.hash('12345678', 10);

    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@example.com',
        password: hashedPassword,
        phone: '08012345678',
        gender: GenderEnum.Male,
        role: Role.SUPER_ADMIN,
        officeId: getOffices[0].id,
        isActive: KYCStatus.active,
        isVerified: true,
        isDeleted: false,
      },
    });

    console.log('✅ Super Admin created:', superAdmin.email);
  } else {
    console.log('ℹ️ Super Admin already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
