#!/usr/bin/env node
/**
 * Build script for Vercel deployment
 * Builds Angular frontend and Node backend
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;

function run(command, options = {}) {
  console.log(`\n📝 Running: ${command}`);
  try {
    const result = execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit',
      ...options,
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    throw error;
  }
}

async function build() {
  try {
    console.log('🚀 Starting build process for Vercel...\n');

    // Step 1: Build Angular frontend
    console.log('🔨 Building Angular frontend...');
    run('npx ng build --configuration production');

    // Step 2: Install server dependencies
    console.log('\n📦 Installing server dependencies...');
    run('npm --prefix server install');

    // Step 3: Build TypeScript server
    console.log('\n🔨 Building TypeScript server...');
    run('npm --prefix server run build');

    console.log('\n✅ Build complete!');
    console.log('📂 Output directory: server/dist');
    console.log('🎉 Ready for deployment!\n');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
