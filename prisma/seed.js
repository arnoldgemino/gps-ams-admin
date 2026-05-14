const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@gpsams.com";
  const password = "Admin123!"; // ✅ choose one and stick to it

  const hash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
     update: {
  fullName: "System Admin",
  password: hash,
  role: "ADMIN",
},
create: {
  fullName: "System Admin",
  email,
  password: hash,
  role: "ADMIN",
},
  });

  console.log("✅ Admin user ready");
  console.log("Email:", email);
  console.log("Password:", password);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
