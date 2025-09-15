#!/usr/bin/env node

import { Command } from 'commander';
const chalk = require('chalk');
const ora = require('ora');
import { ScannerOrchestrator } from '@devguard/server';
import { ConfigLoader } from './config-loader';
import { ReportGenerator } from './report-generator';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
    .name('devguard')
    .description('DevGuard CLI - Static analysis for production-ready code')
    .version('1.0.0');

program
    .command('scan')
    .description('Scan a project for security, quality, and reliability issues')
    .option('-p, --path <path>', 'Project path to scan', process.cwd())
    .option('-o, --output <format>', 'Output format (markdown, sarif, json)', 'markdown')
    .option('-f, --file <file>', 'Output file path')
    .option('--config <config>', 'Configuration file path')
    .action(async (options) => {
        const spinner = ora('Starting DevGuard scan...').start();
        
        try {
            const projectPath = path.resolve(options.path);
            
            if (!fs.existsSync(projectPath)) {
                spinner.fail(chalk.red(`Project path does not exist: ${projectPath}`));
                process.exit(1);
            }

            // Load configuration
            const configLoader = new ConfigLoader();
            const config = await configLoader.loadConfig(projectPath, options.config);
            
            spinner.text = 'Running security and quality analysis...';
            
            // Run scan
            const orchestrator = new ScannerOrchestrator();
            const result = await orchestrator.scanProject(projectPath, config);
            
            spinner.succeed(chalk.green(`Scan completed! Found ${result.issues.length} issues. Score: ${result.score}/100`));
            
            // Generate report
            const reportGenerator = new ReportGenerator();
            const outputFile = options.file || `devguard-report.${options.output === 'sarif' ? 'sarif' : 'md'}`;
            
            await reportGenerator.generateReport(result, options.output, outputFile);
            
            console.log(chalk.blue(`\n📊 Production Readiness Score: ${result.score}/100`));
            console.log(chalk.blue(`📄 Report saved to: ${outputFile}`));
            
            // Exit with error code if score is below threshold
            if (result.score < config.policy.minScore) {
                console.log(chalk.yellow(`\n⚠️  Score ${result.score} is below minimum threshold of ${config.policy.minScore}`));
                process.exit(1);
            }
            
        } catch (error) {
            spinner.fail(chalk.red(`Scan failed: ${error}`));
            process.exit(1);
        }
    });

program
    .command('config')
    .description('Generate or validate DevGuard configuration')
    .option('--init', 'Initialize a new configuration file')
    .option('--validate', 'Validate existing configuration')
    .action(async (options) => {
        if (options.init) {
            const configPath = path.join(process.cwd(), 'devguard.config.yml');
            
            if (fs.existsSync(configPath)) {
                console.log(chalk.yellow('Configuration file already exists'));
                return;
            }
            
            const defaultConfig = `# DevGuard Configuration
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
            
            fs.writeFileSync(configPath, defaultConfig);
            console.log(chalk.green(`✅ Configuration file created: ${configPath}`));
        }
        
        if (options.validate) {
            try {
                const configLoader = new ConfigLoader();
                await configLoader.loadConfig(process.cwd());
                console.log(chalk.green('✅ Configuration is valid'));
            } catch (error) {
                console.log(chalk.red(`❌ Configuration error: ${error}`));
                process.exit(1);
            }
        }
    });

program.parse();