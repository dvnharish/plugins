import { DevGuardConfig } from '@devguard/shared';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

export class ConfigLoader {
    private readonly defaultConfig: DevGuardConfig = {
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

    async loadConfig(projectPath: string, configPath?: string): Promise<DevGuardConfig> {
        const configFile = configPath || join(projectPath, 'devguard.config.yml');
        
        if (!existsSync(configFile)) {
            return this.defaultConfig;
        }

        try {
            const configContent = readFileSync(configFile, 'utf8');
            const userConfig = yaml.load(configContent) as Partial<DevGuardConfig>;
            
            // Merge with default config
            return this.mergeConfigs(this.defaultConfig, userConfig);
        } catch (error) {
            throw new Error(`Failed to load config file: ${error}`);
        }
    }

    private mergeConfigs(defaultConfig: DevGuardConfig, userConfig: Partial<DevGuardConfig>): DevGuardConfig {
        return {
            copilot: { ...defaultConfig.copilot, ...userConfig.copilot },
            policy: { ...defaultConfig.policy, ...userConfig.policy },
            sca: { ...defaultConfig.sca, ...userConfig.sca },
            reports: { ...defaultConfig.reports, ...userConfig.reports },
            scanners: { ...defaultConfig.scanners, ...userConfig.scanners }
        };
    }
}