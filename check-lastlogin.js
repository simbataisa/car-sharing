const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLastLogin() {
  try {
    console.log('Checking current lastLogin status for all users...');
    console.log('Timestamp:', new Date().toISOString());
    console.log('=' .repeat(60));
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        lastLogin: true,
        role: true
      },
      orderBy: {
        lastLogin: 'desc'
      }
    });
    
    users.forEach(user => {
      const lastLoginStr = user.lastLogin 
        ? user.lastLogin.toISOString() 
        : 'Never logged in';
      
      const timeSinceLogin = user.lastLogin 
        ? `(${Math.round((Date.now() - user.lastLogin.getTime()) / 1000)} seconds ago)`
        : '';
        
      console.log(`${user.name} (${user.email}) [${user.role}]:`);
      console.log(`  Last Login: ${lastLoginStr} ${timeSinceLogin}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLastLogin();