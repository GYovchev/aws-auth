import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import inquirer from 'inquirer';

export interface AwsProfile {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

export class AwsCredentialsManager {
  private readonly awsDir: string;
  private readonly credentialsFile: string;
  private readonly configFile: string;

  constructor() {
    this.awsDir = path.join(os.homedir(), '.aws');
    this.credentialsFile = path.join(this.awsDir, 'credentials');
    this.configFile = path.join(this.awsDir, 'config');
  }

  /**
   * Ensure the ~/.aws directory exists
   */
  private ensureAwsDirectory(): void {
    if (!fs.existsSync(this.awsDir)) {
      fs.mkdirSync(this.awsDir, { recursive: true });
    }
  }

  /**
   * Parse AWS credentials file content
   */
  private parseCredentialsFile(): Record<string, AwsProfile> {
    if (!fs.existsSync(this.credentialsFile)) {
      return {};
    }

    const content = fs.readFileSync(this.credentialsFile, 'utf-8');
    const profiles: Record<string, AwsProfile> = {};
    let currentProfile = '';

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const profileMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (profileMatch) {
        currentProfile = profileMatch[1];
        profiles[currentProfile] = {} as AwsProfile;
        continue;
      }

      if (currentProfile) {
        const keyValueMatch = trimmed.match(/^([^=]+)=(.*)$/);
        if (keyValueMatch) {
          const key = keyValueMatch[1].trim();
          const value = keyValueMatch[2].trim();

          if (key === 'aws_access_key_id') {
            profiles[currentProfile].accessKeyId = value;
          } else if (key === 'aws_secret_access_key') {
            profiles[currentProfile].secretAccessKey = value;
          }
        }
      }
    }

    return profiles;
  }

  /**
   * Parse AWS config file content
   */
  private parseConfigFile(): Record<string, { region?: string }> {
    if (!fs.existsSync(this.configFile)) {
      return {};
    }

    const content = fs.readFileSync(this.configFile, 'utf-8');
    const profiles: Record<string, { region?: string }> = {};
    let currentProfile = '';

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const profileMatch = trimmed.match(/^\[(?:profile )?([^\]]+)\]$/);
      if (profileMatch) {
        currentProfile = profileMatch[1];
        profiles[currentProfile] = {};
        continue;
      }

      if (currentProfile) {
        const keyValueMatch = trimmed.match(/^([^=]+)=(.*)$/);
        if (keyValueMatch) {
          const key = keyValueMatch[1].trim();
          const value = keyValueMatch[2].trim();

          if (key === 'region') {
            profiles[currentProfile].region = value;
          }
        }
      }
    }

    return profiles;
  }

  /**
   * Write credentials to the credentials file
   */
  private writeCredentialsFile(profiles: Record<string, AwsProfile>): void {
    this.ensureAwsDirectory();
    
    let content = '';
    for (const [profileName, profile] of Object.entries(profiles)) {
      content += `[${profileName}]\n`;
      content += `aws_access_key_id = ${profile.accessKeyId}\n`;
      content += `aws_secret_access_key = ${profile.secretAccessKey}\n`;
      content += '\n';
    }

    fs.writeFileSync(this.credentialsFile, content);
  }

  /**
   * Write configuration to the config file
   */
  private writeConfigFile(profiles: Record<string, { region?: string }>): void {
    this.ensureAwsDirectory();
    
    let content = '';
    for (const [profileName, profile] of Object.entries(profiles)) {
      if (profileName === 'default') {
        content += `[default]\n`;
      } else {
        content += `[profile ${profileName}]\n`;
      }
      if (profile.region) {
        content += `region = ${profile.region}\n`;
      }
      content += '\n';
    }

    fs.writeFileSync(this.configFile, content);
  }

  /**
   * Add a new AWS profile interactively
   */
  async addProfile(profileName: string): Promise<void> {
    console.log(`\nAdding AWS profile: ${profileName}\n`);

    const questions = [
      {
        type: 'input' as const,
        name: 'accessKeyId' as const,
        message: 'AWS Access Key ID:',
        validate: (input: string) => input.trim().length > 0 || 'Access Key ID is required'
      },
      {
        type: 'password' as const,
        name: 'secretAccessKey' as const,
        message: 'AWS Secret Access Key:',
        mask: '*',
        validate: (input: string) => input.trim().length > 0 || 'Secret Access Key is required'
      },
      {
        type: 'input' as const,
        name: 'region' as const,
        message: 'Default region (e.g., us-east-1):',
        default: 'us-east-1',
        validate: (input: string) => {
          const regionPattern = /^[a-z]{2}-[a-z]+-\d+$/;
          return regionPattern.test(input.trim()) || 'Please enter a valid AWS region (e.g., us-east-1)';
        }
      }
    ];

    const answers = await inquirer.prompt(questions);

    // Load existing profiles
    const credentials = this.parseCredentialsFile();
    const config = this.parseConfigFile();

    // Add new profile
    credentials[profileName] = {
      accessKeyId: answers.accessKeyId.trim(),
      secretAccessKey: answers.secretAccessKey.trim(),
      region: answers.region.trim()
    };

    config[profileName] = {
      region: answers.region.trim()
    };

    // Write updated files
    this.writeCredentialsFile(credentials);
    this.writeConfigFile(config);

    console.log(`\n✅ Profile '${profileName}' added successfully!`);
    console.log(`You can now use it with: aws-auth ${profileName}`);
  }

  /**
   * Use/set a profile as default
   */
  async useProfile(profileName: string): Promise<void> {
    const credentials = this.parseCredentialsFile();
    const config = this.parseConfigFile();

    if (!credentials[profileName]) {
      console.error(`❌ Profile '${profileName}' not found.`);
      console.log('Available profiles:');
      this.listProfiles();
      process.exit(1);
    }

    // Set the profile as default
    credentials.default = credentials[profileName];
    config.default = config[profileName] || {};

    this.writeCredentialsFile(credentials);
    this.writeConfigFile(config);

    console.log(`✅ AWS profile set to '${profileName}'`);
    if (config[profileName]?.region) {
      console.log(`Region: ${config[profileName].region}`);
    }
  }

  /**
   * List all available profiles
   */
  async listProfiles(): Promise<void> {
    const credentials = this.parseCredentialsFile();
    const config = this.parseConfigFile();

    const profileNames = Object.keys(credentials);
    
    if (profileNames.length === 0) {
      console.log('No AWS profiles found.');
      console.log('Use "aws-auth add <profile-name>" to create a new profile.');
      return;
    }

    console.log('Available AWS profiles:');
    console.log('');
    
    for (const profileName of profileNames) {
      const isDefault = profileName === 'default';
      const region = config[profileName]?.region || 'not set';
      const prefix = isDefault ? '* ' : '  ';
      console.log(`${prefix}${profileName} (region: ${region})`);
    }
    
    if (profileNames.includes('default')) {
      console.log('');
      console.log('* = currently active profile');
    }
  }

  /**
   * Remove a profile
   */
  async removeProfile(profileName: string): Promise<void> {
    if (profileName === 'default') {
      console.error('❌ Cannot remove the default profile.');
      return;
    }

    const credentials = this.parseCredentialsFile();
    const config = this.parseConfigFile();

    if (!credentials[profileName]) {
      console.error(`❌ Profile '${profileName}' not found.`);
      return;
    }

    // Confirm deletion
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm' as const,
        name: 'confirm' as const,
        message: `Are you sure you want to remove profile '${profileName}'?`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log('Profile removal cancelled.');
      return;
    }

    // Remove profile
    delete credentials[profileName];
    delete config[profileName];

    this.writeCredentialsFile(credentials);
    this.writeConfigFile(config);

    console.log(`✅ Profile '${profileName}' removed successfully.`);
  }
}