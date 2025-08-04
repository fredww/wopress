#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Markdown WordPress Publisher...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
    console.error('❌ Node.js version 16 or higher is required.');
    console.error(`   Current version: ${nodeVersion}`);
    console.error('   Please upgrade Node.js and try again.');
    process.exit(1);
}

console.log(`✅ Node.js version ${nodeVersion} is compatible\n`);

try {
    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully\n');

    // Create assets directory if it doesn't exist
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir);
        console.log('📁 Created assets directory');
    }

    // Create a simple icon placeholder
    const iconContent = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" fill="#667eea" rx="32"/>
    <text x="128" y="140" font-family="Arial, sans-serif" font-size="120" fill="white" text-anchor="middle">📝</text>
    <text x="128" y="200" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">WP</text>
</svg>
    `.trim();

    fs.writeFileSync(path.join(assetsDir, 'icon.svg'), iconContent);
    console.log('🎨 Created application icon\n');

    console.log('🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "npm start" to launch the application');
    console.log('2. Configure your WordPress settings');
    console.log('3. Select your Markdown files directory');
    console.log('4. Start publishing!\n');

    console.log('For development mode, use: npm run dev');
    console.log('To build executables, use: npm run build\n');

} catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nPlease check the error above and try again.');
    console.error('Make sure you have a stable internet connection for downloading dependencies.');
    process.exit(1);
}