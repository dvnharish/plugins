import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { DevGuardConfig } from './types';

export class ConfigLoader {
  static loadConfig(projectPath: string): DevGuardConfig {
    const configPath = join(projectPath, 'devguard.config.yml');
    
    if (!existsSync(configPath)) {
      return this.getDefaultConfig();
    }

    try {
      const configContent = readFileSync(configPath, 'utf8');
      const config = parse(configContent) as Partial<DevGuardConfig>;
      return this.mergeWithDefaults(config);
    } catch (error) {
      console.warn('Failed to load devguard.config.yml, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  private static getDefaultConfig(): DevGuardConfig {
    return {
      copilot: {
        applyFix: 'auto'
      },
      policy: {
        minScore: 75
      },
      sca: {
        allowLicenses: ['Apache-2.0', 'MIT', 'BSD-3-Clause']
      },
      reports: {
        formats: ['markdown', 'sarif']
      },
      scanners: {
        spotbugs: { enabled: true },
        pmd: { enabled: true },
        checkstyle: { enabled: true },
        semgrep: { enabled: true },
        gitleaks: { enabled: true },
        dependencyCheck: { enabled: true }
      }
    };
  }

  private static mergeWithDefaults(config: Partial<DevGuardConfig>): DevGuardConfig {
    const defaults = this.getDefaultConfig();
    
    return {
      copilot: { ...defaults.copilot, ...config.copilot },
      policy: { ...defaults.policy, ...config.policy },
      sca: { ...defaults.sca, ...config.sca },
      reports: { ...defaults.reports, ...config.reports },
      scanners: { ...defaults.scanners, ...config.scanners }
    };
  }
}
