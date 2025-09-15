import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

export class ConfigCommand extends Command {
    constructor() {
        super('config');
        this.description('Manage DevGuard configuration');
        this.option('-i, --init', 'Initialize configuration file');
        this.option('-s, --show', 'Show current configuration');
        this.action(this.execute.bind(this));
    }

    async execute(options: any) {
        if (options.init) {
            await this.initConfig();
        } else if (options.show) {
            this.showConfig();
        } else {
            console.log(chalk.blue('📋 DevGuard Configuration'));
            console.log(chalk.gray('Use --init to create a configuration file'));
            console.log(chalk.gray('Use --show to display current configuration'));
        }
    }

    private async initConfig() {
        const configPath = join(process.cwd(), 'devguard.config.yml');
        const configContent = `# DevGuard Configuration
copilot:
  applyFix: auto # auto | preview | ask

policy:
  minScore: 75

sca:
  allowLicenses: ["Apache-2.0", "MIT", "BSD-3-Clause"]

reports:
  formats: [markdown, sarif]

scanners:
  spotbugs:
    enabled: true
  pmd:
    enabled: true
  checkstyle:
    enabled: true
  semgrep:
    enabled: true
  gitleaks:
    enabled: true
  dependencyCheck:
    enabled: true
`;

        try {
            writeFileSync(configPath, configContent, 'utf8');
            console.log(chalk.green(`✅ Configuration file created: ${configPath}`));
        } catch (error) {
            console.error(chalk.red('❌ Failed to create configuration file:'), error);
        }
    }

    private showConfig() {
        console.log(chalk.blue('📋 Current Configuration:'));
        console.log(chalk.gray('Configuration file: devguard.config.yml'));
        console.log(chalk.gray('Use --init to create a configuration file'));
    }
}
