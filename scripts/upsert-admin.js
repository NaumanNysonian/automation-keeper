const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@nysonian.com";
  const password = "admin";
  const name = "Admin";
  const department = "admin";
  const role = "admin";

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      name,
      department,
      role,
    },
    create: {
      email,
      passwordHash: hash,
      name,
      department,
      role,
    },
  });

  console.log("Admin user upserted:", email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
