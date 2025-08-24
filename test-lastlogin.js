const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLastLogin() {
  try {
    console.log('Testing lastLogin functionality...');
    
    // First, let's check existing users and their lastLogin status
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        lastLogin: true,
        createdAt: true
      },
      take: 5
    });
    
    console.log('\nCurrent users and their lastLogin status:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}): lastLogin = ${user.lastLogin ? user.lastLogin.toISOString() : 'null'}`);
    });
    
    if (users.length === 0) {
      console.log('\nNo users found in database. Creating a test user...');
      
      const hashedPassword = await bcrypt.hash('testpassword123', 12);
      const testUser = await prisma.user.create({
        data: {
          email: 'testuser@example.com',
          name: 'Test User',
          password: hashedPassword,
          role: 'USER',
          isActive: true,
          emailVerified: true,
          emailVerificationStatus: 'VERIFIED'
        }
      });
      
      console.log(`Created test user: ${testUser.name} (${testUser.email})`);
      console.log('You can now test login with:');
      console.log('Email: testuser@example.com');
      console.log('Password: testpassword123');
    } else {
      console.log('\nExisting users found. You can test login with any of these users.');
      console.log('After logging in, check if their lastLogin field gets updated.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLastLogin();