const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  { name: 'Development', slug: 'development' },
  { name: 'Education', slug: 'education' },
  { name: 'Cooking', slug: 'cooking' },
  { name: 'Marketing', slug: 'marketing' },
  { name: 'Customer Support', slug: 'customer-support' },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }

  console.log('Bootstrap complete. Prompt-Hub is ready for real accounts and real repositories.');
  console.log('No demo users, repositories, or workspaces were inserted.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
