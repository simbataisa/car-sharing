const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Simulate the signIn callback that should update lastLogin
async function simulateSignInCallback(userId) {
  try {
    console.log(`Simulating signIn callback for user ID: ${userId}`);
    
    // This simulates what the signIn callback in NextAuth should do
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
      select: {
        id: true,
        email: true,
        name: true,
        lastLogin: true
      }
    });
    
    console.log('User lastLogin updated successfully:');
    console.log(`- ${updatedUser.name} (${updatedUser.email})`);
    console.log(`- New lastLogin: ${updatedUser.lastLogin.toISOString()}`);
    
    return updatedUser;
  } catch (error) {
    console.error('Error updating lastLogin:', error);
    throw error;
  }
}

async function testSignInCallback() {
  try {
    // Get a user that hasn't logged in recently
    const user = await prisma.user.findFirst({
      where: {
        lastLogin: null,
        email: { not: 'admin@carshare.com' }
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastLogin: true
      }
    });
    
    if (!user) {
      console.log('No user found with null lastLogin. Using first available user...');
      const anyUser = await prisma.user.findFirst({
        where: {
          email: { not: 'admin@carshare.com' }
        },
        select: {
          id: true,
          email: true,
          name: true,
          lastLogin: true
        }
      });
      
      if (!anyUser) {
        console.log('No users found to test with.');
        return;
      }
      
      await simulateSignInCallback(anyUser.id);
    } else {
      console.log(`Testing with user: ${user.name} (${user.email})`);
      console.log(`Current lastLogin: ${user.lastLogin || 'null'}`);
      console.log('');
      
      await simulateSignInCallback(user.id);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('Testing signIn callback functionality...');
console.log('This simulates what should happen when a user logs in.');
console.log('');

testSignInCallback();