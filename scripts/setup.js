#!/usr/bin/env node
/**
 * Setup script for storage-cos
 * Installs UI dependencies after npm install
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Install UI dependencies if needed
 */
async function installUIDependencies() {
  const uiDir = path.join(ROOT_DIR, 'ui');
  const uiNodeModules = path.join(uiDir, 'node_modules');
  
  // Check if UI directory exists
  if (!fs.existsSync(uiDir)) {
    console.log('UI directory not found, skipping UI dependencies installation.');
    return;
  }
  
  // Check if already installed
  if (fs.existsSync(uiNodeModules)) {
    console.log('UI dependencies already installed.');
    return;
  }
  
  console.log('\nInstalling UI dependencies...');
  
  try {
    await execAsync('npm install', { cwd: uiDir });
    console.log('UI dependencies installed successfully.');
  } catch (error) {
    console.error('Warning: Failed to install UI dependencies:', error.message);
    console.error('You can manually run: npm install --prefix ui');
  }
}

/**
 * Main setup function
 */
async function setup() {
  console.log('=== Storage-COS Setup ===\n');
  
  await installUIDependencies();
  
  console.log('\n=== Setup completed! ===');
}

// Run setup
setup().catch(error => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});
