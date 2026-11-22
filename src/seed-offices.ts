import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const offices = [
    { name: "Opebi Location", address: "75 Opebi Road" },
    { name: "Allen Location", address: "22 Allen Road" },
  ];

  for (const office of offices) {
    const existing = await prisma.officeLocation.findFirst({ where: { name: office.name, organizationId: null } });
    if (!existing) await prisma.officeLocation.create({ data: office });
  }
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
