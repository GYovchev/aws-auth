#!/usr/bin/env node

import { Command } from 'commander';
import { AwsCredentialsManager } from './aws-credentials-manager';

const program = new Command();

program
  .name('aws-auth')
  .description('A CLI tool for managing AWS credentials and profiles')
  .version('1.0.0');

program
  .command('add <profile>')
  .description('Add a new AWS profile with interactive prompts')
  .action(async (profile: string) => {
    try {
      const manager = new AwsCredentialsManager();
      await manager.addProfile(profile);
    } catch (error) {
      console.error('Error adding profile:', error);
      process.exit(1);
    }
  });

program
  .command('use <profile>')
  .alias('set')
  .description('Set the specified profile as the default AWS profile')
  .action(async (profile: string) => {
    try {
      const manager = new AwsCredentialsManager();
      await manager.useProfile(profile);
    } catch (error) {
      console.error('Error setting profile:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .alias('ls')
  .description('List all available AWS profiles')
  .action(async () => {
    try {
      const manager = new AwsCredentialsManager();
      await manager.listProfiles();
    } catch (error) {
      console.error('Error listing profiles:', error);
      process.exit(1);
    }
  });

program
  .command('remove <profile>')
  .alias('rm')
  .description('Remove an AWS profile')
  .action(async (profile: string) => {
    try {
      const manager = new AwsCredentialsManager();
      await manager.removeProfile(profile);
    } catch (error) {
      console.error('Error removing profile:', error);
      process.exit(1);
    }
  });

// Handle case where profile name is passed as first argument (like "aws-auth production")
program
  .argument('[profile]', 'profile name to use')
  .action(async (profile?: string) => {
    if (profile) {
      try {
        const manager = new AwsCredentialsManager();
        await manager.useProfile(profile);
      } catch (error) {
        console.error('Error setting profile:', error);
        process.exit(1);
      }
    } else {
      program.help();
    }
  });

program.parse();