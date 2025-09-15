import * as vscode from 'vscode';
import { ParserService } from '../services/ParserService';
import { CopilotService } from '../services/CopilotService';
import { ValidationService } from '../services/ValidationService';
import { CredentialService } from '../services/CredentialService';
import { MappingService } from '../services/MappingService';
import { ConfigurationLoaderService } from '../services/ConfigurationLoaderService';
import { PatternMatchingService } from '../services/PatternMatchingService';
import { MigrationService } from '../services/MigrationService';
import { FileBackupService } from '../services/FileBackupService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import { LoggingService } from '../services/LoggingService';
import { IntelligentAnalysisService } from '../services/IntelligentAnalysisService';
import { MigrationTemplatesService } from '../services/MigrationTemplatesService';
import { AdvancedValidationService } from '../services/AdvancedValidationService';
import { TeamCollaborationService } from '../services/TeamCollaborationService';
import { AdvancedConfigurationService } from '../services/AdvancedConfigurationService';
import { MonitoringAnalyticsService } from '../services/MonitoringAnalyticsService';
import { SecurityComplianceService } from '../services/SecurityComplianceService';
import { WorkflowAutomationService } from '../services/WorkflowAutomationService';
import { AdvancedUIService } from '../services/AdvancedUIService';
import { HelpOnboardingService } from '../services/HelpOnboardingService';
import { CICDIntegrationService } from '../services/CICDIntegrationService';
import { APIIntegrationService } from '../services/APIIntegrationService';
import { MultiLanguageMigrationService } from '../services/MultiLanguageMigrationService';
import { PerformanceOptimizationService } from '../services/PerformanceOptimizationService';
import { TestingQualityAssuranceService } from '../services/TestingQualityAssuranceService';
import { DocumentationTrainingService } from '../services/DocumentationTrainingService';
import { TelemetryContinuousImprovementService } from '../services/TelemetryContinuousImprovementService';
import { PackagingMarketplaceService } from '../services/PackagingMarketplaceService';

/**
 * Dependency injection container for services
 */
export class ServiceContainer implements vscode.Disposable {
  private parserService?: ParserService;
  private copilotService?: CopilotService;
  private validationService?: ValidationService;
  private credentialService?: CredentialService;
  private mappingService?: MappingService;
  private configurationLoaderService?: ConfigurationLoaderService;
  private patternMatchingService?: PatternMatchingService;
  private migrationService?: MigrationService;
  private fileBackupService?: FileBackupService;
  private errorHandlingService?: ErrorHandlingService;
  private loggingService?: LoggingService;
  private intelligentAnalysisService?: IntelligentAnalysisService;
  private migrationTemplatesService?: MigrationTemplatesService;
  private advancedValidationService?: AdvancedValidationService;
  private teamCollaborationService?: TeamCollaborationService;
  private advancedConfigurationService?: AdvancedConfigurationService;
  private monitoringAnalyticsService?: MonitoringAnalyticsService;
  private securityComplianceService?: SecurityComplianceService;
  private workflowAutomationService?: WorkflowAutomationService;
  private advancedUIService?: AdvancedUIService;
  private helpOnboardingService?: HelpOnboardingService;
  private cicdIntegrationService?: CICDIntegrationService;
  private apiIntegrationService?: APIIntegrationService;
  private multiLanguageMigrationService?: MultiLanguageMigrationService;
  private performanceOptimizationService?: PerformanceOptimizationService;
  private testingQualityAssuranceService?: TestingQualityAssuranceService;
  private documentationTrainingService?: DocumentationTrainingService;
  private telemetryContinuousImprovementService?: TelemetryContinuousImprovementService;
  private packagingMarketplaceService?: PackagingMarketplaceService;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  /**
   * Initialize all services
   */
  public initialize(): void {
    this.credentialService = new CredentialService(this._context);
    this.mappingService = new MappingService(this._context);
    this.configurationLoaderService = new ConfigurationLoaderService(this._context);
    this.patternMatchingService = new PatternMatchingService();
    this.parserService = new ParserService();
    this.copilotService = new CopilotService(this._context);
    this.validationService = new ValidationService(this.credentialService);
    this.fileBackupService = new FileBackupService(this._context);
    this.errorHandlingService = new ErrorHandlingService(this._context);
    this.loggingService = new LoggingService(this._context, this.errorHandlingService);
    this.migrationService = new MigrationService(
      this._context,
      this.copilotService,
      this.mappingService,
      this.validationService,
      this.credentialService,
      this.parserService
    );
    this.intelligentAnalysisService = new IntelligentAnalysisService(
      this._context,
      this.patternMatchingService,
      this.mappingService,
      this.loggingService
    );
    this.migrationTemplatesService = new MigrationTemplatesService(
      this._context,
      this.loggingService
    );
    this.advancedValidationService = new AdvancedValidationService(
      this._context,
      this.validationService,
      this.loggingService,
      this.errorHandlingService
    );
    this.teamCollaborationService = new TeamCollaborationService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.advancedConfigurationService = new AdvancedConfigurationService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.monitoringAnalyticsService = new MonitoringAnalyticsService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.securityComplianceService = new SecurityComplianceService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.workflowAutomationService = new WorkflowAutomationService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.advancedUIService = new AdvancedUIService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.helpOnboardingService = new HelpOnboardingService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.cicdIntegrationService = new CICDIntegrationService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.apiIntegrationService = new APIIntegrationService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.multiLanguageMigrationService = new MultiLanguageMigrationService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    // New services for Tasks 20-24
    this.performanceOptimizationService = new PerformanceOptimizationService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.testingQualityAssuranceService = new TestingQualityAssuranceService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.documentationTrainingService = new DocumentationTrainingService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.telemetryContinuousImprovementService = new TelemetryContinuousImprovementService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
    this.packagingMarketplaceService = new PackagingMarketplaceService(
      this._context,
      this.loggingService,
      this.errorHandlingService
    );
  }

  public getParserService(): ParserService {
    if (!this.parserService) {
      throw new Error('ParserService not initialized');
    }
    return this.parserService;
  }

  public getCopilotService(): CopilotService {
    if (!this.copilotService) {
      throw new Error('CopilotService not initialized');
    }
    return this.copilotService;
  }

  public getValidationService(): ValidationService {
    if (!this.validationService) {
      throw new Error('ValidationService not initialized');
    }
    return this.validationService;
  }

  public getCredentialService(): CredentialService {
    if (!this.credentialService) {
      throw new Error('CredentialService not initialized');
    }
    return this.credentialService;
  }

  public getMappingService(): MappingService {
    if (!this.mappingService) {
      throw new Error('MappingService not initialized');
    }
    return this.mappingService;
  }

  public getConfigurationLoaderService(): ConfigurationLoaderService {
    if (!this.configurationLoaderService) {
      throw new Error('ConfigurationLoaderService not initialized');
    }
    return this.configurationLoaderService;
  }

  public getPatternMatchingService(): PatternMatchingService {
    if (!this.patternMatchingService) {
      throw new Error('PatternMatchingService not initialized');
    }
    return this.patternMatchingService;
  }

  public getMigrationService(): MigrationService {
    if (!this.migrationService) {
      throw new Error('MigrationService not initialized');
    }
    return this.migrationService;
  }

  public getFileBackupService(): FileBackupService {
    if (!this.fileBackupService) {
      throw new Error('FileBackupService not initialized');
    }
    return this.fileBackupService;
  }

  public getErrorHandlingService(): ErrorHandlingService {
    if (!this.errorHandlingService) {
      throw new Error('ErrorHandlingService not initialized');
    }
    return this.errorHandlingService;
  }

  public getLoggingService(): LoggingService {
    if (!this.loggingService) {
      throw new Error('LoggingService not initialized');
    }
    return this.loggingService;
  }

  public getIntelligentAnalysisService(): IntelligentAnalysisService {
    if (!this.intelligentAnalysisService) {
      throw new Error('IntelligentAnalysisService not initialized');
    }
    return this.intelligentAnalysisService;
  }

  public getMigrationTemplatesService(): MigrationTemplatesService {
    if (!this.migrationTemplatesService) {
      throw new Error('MigrationTemplatesService not initialized');
    }
    return this.migrationTemplatesService;
  }

  public getAdvancedValidationService(): AdvancedValidationService {
    if (!this.advancedValidationService) {
      throw new Error('AdvancedValidationService not initialized');
    }
    return this.advancedValidationService;
  }

  public getTeamCollaborationService(): TeamCollaborationService {
    if (!this.teamCollaborationService) {
      throw new Error('TeamCollaborationService not initialized');
    }
    return this.teamCollaborationService;
  }

  public getAdvancedConfigurationService(): AdvancedConfigurationService {
    if (!this.advancedConfigurationService) {
      throw new Error('AdvancedConfigurationService not initialized');
    }
    return this.advancedConfigurationService;
  }

  public getMonitoringAnalyticsService(): MonitoringAnalyticsService {
    if (!this.monitoringAnalyticsService) {
      throw new Error('MonitoringAnalyticsService not initialized');
    }
    return this.monitoringAnalyticsService;
  }

  public getSecurityComplianceService(): SecurityComplianceService {
    if (!this.securityComplianceService) {
      throw new Error('SecurityComplianceService not initialized');
    }
    return this.securityComplianceService;
  }

  public getWorkflowAutomationService(): WorkflowAutomationService {
    if (!this.workflowAutomationService) {
      throw new Error('WorkflowAutomationService not initialized');
    }
    return this.workflowAutomationService;
  }

  public getAdvancedUIService(): AdvancedUIService {
    if (!this.advancedUIService) {
      throw new Error('AdvancedUIService not initialized');
    }
    return this.advancedUIService;
  }

  public getHelpOnboardingService(): HelpOnboardingService {
    if (!this.helpOnboardingService) {
      throw new Error('HelpOnboardingService not initialized');
    }
    return this.helpOnboardingService;
  }

  public getCICDIntegrationService(): CICDIntegrationService {
    if (!this.cicdIntegrationService) {
      throw new Error('CICDIntegrationService not initialized');
    }
    return this.cicdIntegrationService;
  }

  public getAPIIntegrationService(): APIIntegrationService {
    if (!this.apiIntegrationService) {
      throw new Error('APIIntegrationService not initialized');
    }
    return this.apiIntegrationService;
  }

  public getMultiLanguageMigrationService(): MultiLanguageMigrationService {
    if (!this.multiLanguageMigrationService) {
      throw new Error('MultiLanguageMigrationService not initialized');
    }
    return this.multiLanguageMigrationService;
  }

  public getPerformanceOptimizationService(): PerformanceOptimizationService {
    if (!this.performanceOptimizationService) {
      throw new Error('PerformanceOptimizationService not initialized');
    }
    return this.performanceOptimizationService;
  }

  public getTestingQualityAssuranceService(): TestingQualityAssuranceService {
    if (!this.testingQualityAssuranceService) {
      throw new Error('TestingQualityAssuranceService not initialized');
    }
    return this.testingQualityAssuranceService;
  }

  public getDocumentationTrainingService(): DocumentationTrainingService {
    if (!this.documentationTrainingService) {
      throw new Error('DocumentationTrainingService not initialized');
    }
    return this.documentationTrainingService;
  }

  public getTelemetryContinuousImprovementService(): TelemetryContinuousImprovementService {
    if (!this.telemetryContinuousImprovementService) {
      throw new Error('TelemetryContinuousImprovementService not initialized');
    }
    return this.telemetryContinuousImprovementService;
  }

  public getPackagingMarketplaceService(): PackagingMarketplaceService {
    if (!this.packagingMarketplaceService) {
      throw new Error('PackagingMarketplaceService not initialized');
    }
    return this.packagingMarketplaceService;
  }

  public dispose(): void {
    // Services will implement disposal if needed
  }
}