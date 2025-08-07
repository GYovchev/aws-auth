import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AwsCredentialsManager } from '../src/aws-credentials-manager';

// Mock dependencies
jest.mock('fs');
jest.mock('os');
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;
const mockInquirer = require('inquirer');

describe('AwsCredentialsManager', () => {
  let manager: AwsCredentialsManager;
  const mockHomeDir = '/mock/home';
  const mockAwsDir = '/mock/home/.aws';
  const mockCredentialsFile = '/mock/home/.aws/credentials';
  const mockConfigFile = '/mock/home/.aws/config';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock os.homedir()
    mockOs.homedir.mockReturnValue(mockHomeDir);
    
    // Mock fs.existsSync to return false by default
    mockFs.existsSync.mockReturnValue(false);
    
    // Mock fs.mkdirSync
    mockFs.mkdirSync.mockImplementation(() => '');
    
    // Mock fs.writeFileSync
    mockFs.writeFileSync.mockImplementation(() => {});
    
    // Mock fs.readFileSync
    mockFs.readFileSync.mockReturnValue('');
    
    manager = new AwsCredentialsManager();
  });

  describe('constructor', () => {
    it('should initialize with correct AWS paths', () => {
      expect(mockOs.homedir).toHaveBeenCalled();
      // The constructor is called, so we can't directly test the private properties
      // but we can test the behavior that depends on them
    });
  });

  describe('addProfile', () => {
    it('should add a new profile successfully', async () => {
      // Mock existing files don't exist
      mockFs.existsSync.mockReturnValue(false);
      
      // Mock inquirer
      mockInquirer.prompt.mockResolvedValue({
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-west-2'
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.addProfile('test-profile');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(mockAwsDir, { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // credentials and config files
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Profile 'test-profile' added successfully!"));
      
      consoleSpy.mockRestore();
    });

    it('should preserve existing profiles when adding a new one', async () => {
      // Mock existing credentials file
      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath === mockCredentialsFile || filePath === mockConfigFile;
      });
      
      const existingCredentials = `[existing-profile]
aws_access_key_id = EXISTINGKEY
aws_secret_access_key = existingsecret

`;
      
      const existingConfig = `[profile existing-profile]
region = us-east-1

`;

      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === mockCredentialsFile) return existingCredentials;
        if (filePath === mockConfigFile) return existingConfig;
        return '';
      });

      // Mock inquirer
      mockInquirer.prompt.mockResolvedValue({
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-west-2'
      });

      await manager.addProfile('new-profile');

      // Verify that writeFileSync was called with content that includes both profiles
      const credentialsCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0] === mockCredentialsFile
      );
      const configCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0] === mockConfigFile
      );

      expect(credentialsCall?.[1]).toContain('existing-profile');
      expect(credentialsCall?.[1]).toContain('new-profile');
      expect(configCall?.[1]).toContain('existing-profile');
      expect(configCall?.[1]).toContain('new-profile');
    });
  });

  describe('useProfile', () => {
    beforeEach(() => {
      const existingCredentials = `[test-profile]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

`;
      
      const existingConfig = `[profile test-profile]
region = us-west-2

`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === mockCredentialsFile) return existingCredentials;
        if (filePath === mockConfigFile) return existingConfig;
        return '';
      });
    });

    it('should set existing profile as default', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.useProfile('test-profile');

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // credentials and config files
      expect(consoleSpy).toHaveBeenCalledWith("✅ AWS profile set to 'test-profile'");
      expect(consoleSpy).toHaveBeenCalledWith("Region: us-west-2");
      
      consoleSpy.mockRestore();
    });

    it('should exit with error when profile does not exist', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit called');
      });

      await expect(manager.useProfile('nonexistent-profile')).rejects.toThrow('Process exit called');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith("❌ Profile 'nonexistent-profile' not found.");
      expect(processExitSpy).toHaveBeenCalledWith(1);
      
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe('listProfiles', () => {
    it('should display message when no profiles exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.listProfiles();

      expect(consoleSpy).toHaveBeenCalledWith('No AWS profiles found.');
      expect(consoleSpy).toHaveBeenCalledWith('Use "aws-auth add <profile-name>" to create a new profile.');
      
      consoleSpy.mockRestore();
    });

    it('should list existing profiles with regions', async () => {
      const existingCredentials = `[test-profile]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[default]
aws_access_key_id = DEFAULTKEY
aws_secret_access_key = defaultsecret

`;
      
      const existingConfig = `[profile test-profile]
region = us-west-2

[default]
region = us-east-1

`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === mockCredentialsFile) return existingCredentials;
        if (filePath === mockConfigFile) return existingConfig;
        return '';
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.listProfiles();

      expect(consoleSpy).toHaveBeenCalledWith('Available AWS profiles:');
      expect(consoleSpy).toHaveBeenCalledWith('  test-profile (region: us-west-2)');
      expect(consoleSpy).toHaveBeenCalledWith('* default (region: us-east-1)');
      expect(consoleSpy).toHaveBeenCalledWith('* = currently active profile');
      
      consoleSpy.mockRestore();
    });
  });

  describe('removeProfile', () => {
    beforeEach(() => {
      const existingCredentials = `[test-profile]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[another-profile]
aws_access_key_id = ANOTHERKEY
aws_secret_access_key = anothersecret

`;
      
      const existingConfig = `[profile test-profile]
region = us-west-2

[profile another-profile]
region = eu-west-1

`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === mockCredentialsFile) return existingCredentials;
        if (filePath === mockConfigFile) return existingConfig;
        return '';
      });
    });

    it('should not allow removal of default profile', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await manager.removeProfile('default');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Cannot remove the default profile.');
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should show error when profile does not exist', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await manager.removeProfile('nonexistent-profile');

      expect(consoleErrorSpy).toHaveBeenCalledWith("❌ Profile 'nonexistent-profile' not found.");
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should remove profile when confirmed', async () => {
      mockInquirer.prompt.mockResolvedValue({ confirm: true });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.removeProfile('test-profile');

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // credentials and config files
      expect(consoleSpy).toHaveBeenCalledWith("✅ Profile 'test-profile' removed successfully.");
      
      // Verify that the files written don't contain the removed profile
      const credentialsCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0] === mockCredentialsFile
      );
      const configCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0] === mockConfigFile
      );

      expect(credentialsCall?.[1]).not.toContain('test-profile');
      expect(credentialsCall?.[1]).toContain('another-profile');
      expect(configCall?.[1]).not.toContain('test-profile');
      expect(configCall?.[1]).toContain('another-profile');
      
      consoleSpy.mockRestore();
    });

    it('should cancel removal when not confirmed', async () => {
      mockInquirer.prompt.mockResolvedValue({ confirm: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.removeProfile('test-profile');

      expect(consoleSpy).toHaveBeenCalledWith('Profile removal cancelled.');
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('file parsing', () => {
    it('should handle malformed credentials file gracefully', async () => {
      const malformedCredentials = `[profile-without-closing-bracket
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
invalid line without equals
[valid-profile]
aws_access_key_id = VALIDKEY
aws_secret_access_key = validsecret
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === mockCredentialsFile) return malformedCredentials;
        if (filePath === mockConfigFile) return '';
        return '';
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.listProfiles();

      // Should still parse the valid profile
      expect(consoleSpy).toHaveBeenCalledWith('  valid-profile (region: not set)');
      
      consoleSpy.mockRestore();
    });

    it('should handle comments and empty lines in config files', async () => {
      const credentialsWithComments = `# This is a comment
[test-profile]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
# Another comment
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Empty line above
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === mockCredentialsFile) return credentialsWithComments;
        if (filePath === mockConfigFile) return '';
        return '';
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await manager.listProfiles();

      expect(consoleSpy).toHaveBeenCalledWith('  test-profile (region: not set)');
      
      consoleSpy.mockRestore();
    });
  });
});