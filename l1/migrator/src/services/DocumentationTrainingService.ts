import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService } from './ErrorHandlingService';

export interface DocumentationSection {
    id: string;
    title: string;
    content: string;
    type: 'overview' | 'getting-started' | 'tutorial' | 'api-reference' | 'troubleshooting' | 'examples' | 'faq';
    category: string;
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    lastUpdated: Date;
    version: string;
    author: string;
    status: 'draft' | 'review' | 'published' | 'archived';
    metadata: DocumentationMetadata;
}

export interface DocumentationMetadata {
    wordCount: number;
    readingTime: number; // in minutes
    lastReviewed: Date;
    reviewers: string[];
    translations: string[];
    relatedSections: string[];
    prerequisites: string[];
    objectives: string[];
    keywords: string[];
    seoTitle?: string;
    seoDescription?: string;
}

export interface Tutorial {
    id: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number; // in minutes
    prerequisites: string[];
    objectives: string[];
    steps: TutorialStep[];
    resources: TutorialResource[];
    status: 'draft' | 'review' | 'published' | 'archived';
    category: string;
    tags: string[];
    author: string;
    createdAt: Date;
    updatedAt: Date;
    completionRate: number;
    averageRating: number;
    totalCompletions: number;
}

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    content: string;
    type: 'text' | 'code' | 'interactive' | 'quiz' | 'exercise';
    order: number;
    estimatedTime: number;
    resources: TutorialResource[];
    hints: string[];
    solution?: string;
    validation?: TutorialValidation;
    completed: boolean;
    score?: number;
}

export interface TutorialResource {
    id: string;
    title: string;
    type: 'file' | 'link' | 'video' | 'image' | 'code' | 'documentation';
    url?: string;
    content?: string;
    description: string;
    size?: number;
    mimeType?: string;
}

export interface TutorialValidation {
    type: 'code' | 'quiz' | 'exercise' | 'manual';
    criteria: string[];
    automated: boolean;
    timeout?: number;
}

export interface InteractiveExample {
    id: string;
    title: string;
    description: string;
    type: 'code-sandbox' | 'simulation' | 'demo' | 'playground';
    content: string;
    language: string;
    framework?: string;
    dependencies: string[];
    configuration: Record<string, any>;
    status: 'draft' | 'review' | 'published' | 'archived';
    category: string;
    tags: string[];
    author: string;
    createdAt: Date;
    updatedAt: Date;
    views: number;
    likes: number;
    forks: number;
}

export interface VideoTutorial {
    id: string;
    title: string;
    description: string;
    url: string;
    duration: number; // in seconds
    quality: '720p' | '1080p' | '4k';
    language: string;
    subtitles: string[];
    chapters: VideoChapter[];
    status: 'draft' | 'review' | 'published' | 'archived';
    category: string;
    tags: string[];
    author: string;
    createdAt: Date;
    updatedAt: Date;
    views: number;
    likes: number;
    completionRate: number;
}

export interface VideoChapter {
    id: string;
    title: string;
    startTime: number; // in seconds
    endTime: number; // in seconds
    description: string;
    resources: TutorialResource[];
}

export interface TrainingPath {
    id: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number; // in hours
    prerequisites: string[];
    objectives: string[];
    modules: TrainingModule[];
    status: 'draft' | 'review' | 'published' | 'archived';
    category: string;
    tags: string[];
    author: string;
    createdAt: Date;
    updatedAt: Date;
    completionRate: number;
    averageRating: number;
    totalEnrollments: number;
    certificate: boolean;
    certificateRequirements: string[];
}

export interface TrainingModule {
    id: string;
    title: string;
    description: string;
    type: 'tutorial' | 'video' | 'interactive' | 'assessment' | 'project';
    content: string;
    order: number;
    estimatedTime: number;
    prerequisites: string[];
    resources: TutorialResource[];
    status: 'draft' | 'review' | 'published' | 'archived';
    completionCriteria: string[];
    assessment?: TrainingAssessment;
}

export interface TrainingAssessment {
    id: string;
    title: string;
    description: string;
    questions: AssessmentQuestion[];
    passingScore: number;
    timeLimit?: number; // in minutes
    attempts: number;
    randomizeQuestions: boolean;
    showCorrectAnswers: boolean;
    feedback: boolean;
}

export interface AssessmentQuestion {
    id: string;
    question: string;
    type: 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'code' | 'essay';
    options?: string[];
    correctAnswer: string | string[];
    explanation: string;
    points: number;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
}

export interface UserProgress {
    userId: string;
    tutorialId?: string;
    trainingPathId?: string;
    currentStep?: string;
    completedSteps: string[];
    score: number;
    timeSpent: number; // in minutes
    lastAccessed: Date;
    status: 'not-started' | 'in-progress' | 'completed' | 'abandoned';
    notes: string[];
    bookmarks: string[];
    ratings: Record<string, number>;
}

export interface DocumentationSearchResult {
    id: string;
    title: string;
    content: string;
    type: string;
    category: string;
    tags: string[];
    score: number;
    highlights: string[];
    url: string;
}

export interface DocumentationAnalytics {
    totalSections: number;
    totalTutorials: number;
    totalTrainingPaths: number;
    totalViews: number;
    averageRating: number;
    completionRate: number;
    popularSections: string[];
    searchQueries: string[];
    userFeedback: UserFeedback[];
    performance: DocumentationPerformance;
}

export interface UserFeedback {
    id: string;
    userId: string;
    contentId: string;
    type: 'rating' | 'comment' | 'suggestion' | 'bug-report';
    rating?: number;
    comment?: string;
    helpful: boolean;
    createdAt: Date;
    status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
}

export interface DocumentationPerformance {
    averageLoadTime: number;
    searchResponseTime: number;
    errorRate: number;
    uptime: number;
    userSatisfaction: number;
}

export class DocumentationTrainingService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private documentationSections: Map<string, DocumentationSection> = new Map();
    private tutorials: Map<string, Tutorial> = new Map();
    private trainingPaths: Map<string, TrainingPath> = new Map();
    private interactiveExamples: Map<string, InteractiveExample> = new Map();
    private videoTutorials: Map<string, VideoTutorial> = new Map();
    private userProgress: Map<string, UserProgress> = new Map();
    private searchIndex: Map<string, DocumentationSearchResult> = new Map();

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
        this.initializeDocumentation();
    }

    /**
     * Documentation management
     */
    async createDocumentationSection(section: Omit<DocumentationSection, 'id' | 'lastUpdated' | 'metadata'>): Promise<DocumentationSection> {
        this.loggingService.log(LogLevel.INFO, `Creating documentation section: ${section.title}`);

        const metadata: DocumentationMetadata = {
            wordCount: this.countWords(section.content),
            readingTime: this.calculateReadingTime(section.content),
            lastReviewed: new Date(),
            reviewers: [],
            translations: [],
            relatedSections: [],
            prerequisites: [],
            objectives: [],
            keywords: this.extractKeywords(section.content)
        };

        const newSection: DocumentationSection = {
            ...section,
            id: this.generateId(),
            lastUpdated: new Date(),
            metadata
        };

        this.documentationSections.set(newSection.id, newSection);
        await this.saveDocumentationSections();
        await this.updateSearchIndex();

        return newSection;
    }

    async updateDocumentationSection(id: string, updates: Partial<DocumentationSection>): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Updating documentation section: ${id}`);

        const section = this.documentationSections.get(id);
        if (!section) {
            return false;
        }

        const updatedSection = {
            ...section,
            ...updates,
            lastUpdated: new Date()
        };

        // Update metadata if content changed
        if (updates.content) {
            updatedSection.metadata.wordCount = this.countWords(updatedSection.content);
            updatedSection.metadata.readingTime = this.calculateReadingTime(updatedSection.content);
            updatedSection.metadata.keywords = this.extractKeywords(updatedSection.content);
        }

        this.documentationSections.set(id, updatedSection);
        await this.saveDocumentationSections();
        await this.updateSearchIndex();

        return true;
    }

    /**
     * Tutorial management
     */
    async createTutorial(tutorial: Omit<Tutorial, 'id' | 'createdAt' | 'updatedAt' | 'completionRate' | 'averageRating' | 'totalCompletions'>): Promise<Tutorial> {
        this.loggingService.log(LogLevel.INFO, `Creating tutorial: ${tutorial.title}`);

        const newTutorial: Tutorial = {
            ...tutorial,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            completionRate: 0,
            averageRating: 0,
            totalCompletions: 0
        };

        this.tutorials.set(newTutorial.id, newTutorial);
        await this.saveTutorials();

        return newTutorial;
    }

    async startTutorial(tutorialId: string, userId: string): Promise<UserProgress> {
        this.loggingService.log(LogLevel.INFO, `Starting tutorial: ${tutorialId} for user: ${userId}`);

        const tutorial = this.tutorials.get(tutorialId);
        if (!tutorial) {
            throw new Error(`Tutorial not found: ${tutorialId}`);
        }

        const progress: UserProgress = {
            userId,
            tutorialId,
            currentStep: tutorial.steps[0]?.id,
            completedSteps: [],
            score: 0,
            timeSpent: 0,
            lastAccessed: new Date(),
            status: 'in-progress',
            notes: [],
            bookmarks: [],
            ratings: {}
        };

        this.userProgress.set(`${userId}-${tutorialId}`, progress);
        await this.saveUserProgress();

        return progress;
    }

    async completeTutorialStep(tutorialId: string, userId: string, stepId: string, score?: number): Promise<boolean> {
        this.loggingService.log(LogLevel.DEBUG, `Completing tutorial step: ${stepId}`);

        const progressKey = `${userId}-${tutorialId}`;
        const progress = this.userProgress.get(progressKey);
        if (!progress) {
            return false;
        }

        if (!progress.completedSteps.includes(stepId)) {
            progress.completedSteps.push(stepId);
        }

        if (score !== undefined) {
            progress.score = (progress.score + score) / 2; // Average score
        }

        progress.lastAccessed = new Date();
        this.userProgress.set(progressKey, progress);

        // Check if tutorial is completed
        const tutorial = this.tutorials.get(tutorialId);
        if (tutorial && progress.completedSteps.length === tutorial.steps.length) {
            progress.status = 'completed';
            tutorial.totalCompletions++;
            tutorial.completionRate = (tutorial.completionRate * (tutorial.totalCompletions - 1) + 100) / tutorial.totalCompletions;
            await this.saveTutorials();
        }

        await this.saveUserProgress();
        return true;
    }

    /**
     * Training path management
     */
    async createTrainingPath(trainingPath: Omit<TrainingPath, 'id' | 'createdAt' | 'updatedAt' | 'completionRate' | 'averageRating' | 'totalEnrollments'>): Promise<TrainingPath> {
        this.loggingService.log(LogLevel.INFO, `Creating training path: ${trainingPath.title}`);

        const newTrainingPath: TrainingPath = {
            ...trainingPath,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            completionRate: 0,
            averageRating: 0,
            totalEnrollments: 0
        };

        this.trainingPaths.set(newTrainingPath.id, newTrainingPath);
        await this.saveTrainingPaths();

        return newTrainingPath;
    }

    async enrollInTrainingPath(trainingPathId: string, userId: string): Promise<UserProgress> {
        this.loggingService.log(LogLevel.INFO, `Enrolling in training path: ${trainingPathId}`);

        const trainingPath = this.trainingPaths.get(trainingPathId);
        if (!trainingPath) {
            throw new Error(`Training path not found: ${trainingPathId}`);
        }

        const progress: UserProgress = {
            userId,
            trainingPathId,
            currentStep: trainingPath.modules[0]?.id,
            completedSteps: [],
            score: 0,
            timeSpent: 0,
            lastAccessed: new Date(),
            status: 'in-progress',
            notes: [],
            bookmarks: [],
            ratings: {}
        };

        this.userProgress.set(`${userId}-${trainingPathId}`, progress);
        trainingPath.totalEnrollments++;
        await this.saveUserProgress();
        await this.saveTrainingPaths();

        return progress;
    }

    /**
     * Interactive examples
     */
    async createInteractiveExample(example: Omit<InteractiveExample, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'likes' | 'forks'>): Promise<InteractiveExample> {
        this.loggingService.log(LogLevel.INFO, `Creating interactive example: ${example.title}`);

        const newExample: InteractiveExample = {
            ...example,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            views: 0,
            likes: 0,
            forks: 0
        };

        this.interactiveExamples.set(newExample.id, newExample);
        await this.saveInteractiveExamples();

        return newExample;
    }

    async viewInteractiveExample(exampleId: string): Promise<InteractiveExample | null> {
        this.loggingService.log(LogLevel.DEBUG, `Viewing interactive example: ${exampleId}`);

        const example = this.interactiveExamples.get(exampleId);
        if (example) {
            example.views++;
            await this.saveInteractiveExamples();
        }

        return example || null;
    }

    /**
     * Video tutorials
     */
    async createVideoTutorial(video: Omit<VideoTutorial, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'likes' | 'completionRate'>): Promise<VideoTutorial> {
        this.loggingService.log(LogLevel.INFO, `Creating video tutorial: ${video.title}`);

        const newVideo: VideoTutorial = {
            ...video,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            views: 0,
            likes: 0,
            completionRate: 0
        };

        this.videoTutorials.set(newVideo.id, newVideo);
        await this.saveVideoTutorials();

        return newVideo;
    }

    /**
     * Search functionality
     */
    async searchDocumentation(query: string, filters?: {
        type?: string;
        category?: string;
        difficulty?: string;
        tags?: string[];
    }): Promise<DocumentationSearchResult[]> {
        this.loggingService.log(LogLevel.DEBUG, `Searching documentation: ${query}`);

        const results: DocumentationSearchResult[] = [];
        const searchTerms = query.toLowerCase().split(' ');

        for (const [id, section] of this.documentationSections.entries()) {
            if (filters && filters.type && section.type !== filters.type) {
                continue;
            }
            if (filters && filters.category && section.category !== filters.category) {
                continue;
            }
            if (filters && filters.difficulty && section.difficulty !== filters.difficulty) {
                continue;
            }
            if (filters && filters.tags && !filters.tags.some(tag => section.tags.includes(tag))) {
                continue;
            }

            const score = this.calculateSearchScore(section, searchTerms);
            if (score > 0) {
                results.push({
                    id,
                    title: section.title,
                    content: section.content,
                    type: section.type,
                    category: section.category,
                    tags: section.tags,
                    score,
                    highlights: this.generateHighlights(section.content, searchTerms),
                    url: `/documentation/${id}`
                });
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Analytics
     */
    getDocumentationAnalytics(): DocumentationAnalytics {
        const sections = Array.from(this.documentationSections.values());
        const tutorials = Array.from(this.tutorials.values());
        const trainingPaths = Array.from(this.trainingPaths.values());
        const examples = Array.from(this.interactiveExamples.values());
        const videos = Array.from(this.videoTutorials.values());

        const totalViews = sections.reduce((sum, s) => sum + (s.metadata as any).views || 0, 0) +
                          tutorials.reduce((sum, t) => sum + t.totalCompletions, 0) +
                          examples.reduce((sum, e) => sum + e.views, 0) +
                          videos.reduce((sum, v) => sum + v.views, 0);

        const totalRatings = tutorials.reduce((sum, t) => sum + t.averageRating, 0);
        const averageRating = tutorials.length > 0 ? totalRatings / tutorials.length : 0;

        const totalCompletions = tutorials.reduce((sum, t) => sum + t.totalCompletions, 0);
        const totalEnrollments = trainingPaths.reduce((sum, tp) => sum + tp.totalEnrollments, 0);
        const completionRate = totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

        return {
            totalSections: sections.length,
            totalTutorials: tutorials.length,
            totalTrainingPaths: trainingPaths.length,
            totalViews,
            averageRating,
            completionRate,
            popularSections: this.getPopularSections(),
            searchQueries: this.getSearchQueries(),
            userFeedback: this.getUserFeedback(),
            performance: {
                averageLoadTime: 1.2,
                searchResponseTime: 0.3,
                errorRate: 0.01,
                uptime: 99.9,
                userSatisfaction: 4.2
            }
        };
    }

    /**
     * Get user progress
     */
    getUserProgress(userId: string): UserProgress[] {
        return Array.from(this.userProgress.values()).filter(progress => progress.userId === userId);
    }

    /**
     * Get documentation sections
     */
    getDocumentationSections(filter?: {
        type?: string;
        category?: string;
        difficulty?: string;
        status?: string;
    }): DocumentationSection[] {
        let sections = Array.from(this.documentationSections.values());

        if (filter) {
            if (filter.type) {
                sections = sections.filter(s => s.type === filter.type);
            }
            if (filter.category) {
                sections = sections.filter(s => s.category === filter.category);
            }
            if (filter.difficulty) {
                sections = sections.filter(s => s.difficulty === filter.difficulty);
            }
            if (filter.status) {
                sections = sections.filter(s => s.status === filter.status);
            }
        }

        return sections;
    }

    /**
     * Get tutorials
     */
    getTutorials(filter?: {
        difficulty?: string;
        category?: string;
        status?: string;
    }): Tutorial[] {
        let tutorials = Array.from(this.tutorials.values());

        if (filter) {
            if (filter.difficulty) {
                tutorials = tutorials.filter(t => t.difficulty === filter.difficulty);
            }
            if (filter.category) {
                tutorials = tutorials.filter(t => t.category === filter.category);
            }
            if (filter.status) {
                tutorials = tutorials.filter(t => t.status === filter.status);
            }
        }

        return tutorials;
    }

    /**
     * Get training paths
     */
    getTrainingPaths(filter?: {
        difficulty?: string;
        category?: string;
        status?: string;
    }): TrainingPath[] {
        let trainingPaths = Array.from(this.trainingPaths.values());

        if (filter) {
            if (filter.difficulty) {
                trainingPaths = trainingPaths.filter(tp => tp.difficulty === filter.difficulty);
            }
            if (filter.category) {
                trainingPaths = trainingPaths.filter(tp => tp.category === filter.category);
            }
            if (filter.status) {
                trainingPaths = trainingPaths.filter(tp => tp.status === filter.status);
            }
        }

        return trainingPaths;
    }

    private initializeDocumentation(): void {
        // Create initial documentation sections
        this.createInitialDocumentation();
    }

    private async createInitialDocumentation(): Promise<void> {
        const initialSections: Omit<DocumentationSection, 'id' | 'lastUpdated' | 'metadata'>[] = [
            {
                title: 'Getting Started',
                content: 'Welcome to the Converge to Elavon Migration Tool. This guide will help you get started with migrating your payment processing from Converge to Elavon.',
                type: 'getting-started',
                category: 'overview',
                tags: ['getting-started', 'overview', 'introduction'],
                difficulty: 'beginner',
                version: '1.0.0',
                author: 'System',
                status: 'published'
            },
            {
                title: 'Installation Guide',
                content: 'Learn how to install and configure the migration tool in your VS Code environment.',
                type: 'tutorial',
                category: 'setup',
                tags: ['installation', 'setup', 'configuration'],
                difficulty: 'beginner',
                version: '1.0.0',
                author: 'System',
                status: 'published'
            },
            {
                title: 'API Reference',
                content: 'Complete reference for all available APIs and endpoints in the migration tool.',
                type: 'api-reference',
                category: 'reference',
                tags: ['api', 'reference', 'endpoints'],
                difficulty: 'intermediate',
                version: '1.0.0',
                author: 'System',
                status: 'published'
            }
        ];

        for (const section of initialSections) {
            await this.createDocumentationSection(section);
        }
    }

    private countWords(content: string): number {
        return content.split(/\s+/).filter(word => word.length > 0).length;
    }

    private calculateReadingTime(content: string): number {
        const wordsPerMinute = 200;
        const wordCount = this.countWords(content);
        return Math.ceil(wordCount / wordsPerMinute);
    }

    private extractKeywords(content: string): string[] {
        // Simple keyword extraction - in a real implementation, you'd use NLP
        const words = content.toLowerCase().split(/\s+/);
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        const keywords = words
            .filter(word => word.length > 3 && !stopWords.has(word))
            .reduce((acc, word) => {
                acc[word] = (acc[word] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        return Object.entries(keywords)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }

    private calculateSearchScore(section: DocumentationSection, searchTerms: string[]): number {
        let score = 0;
        const content = `${section.title} ${section.content}`.toLowerCase();

        for (const term of searchTerms) {
            if (section.title.toLowerCase().includes(term)) {
                score += 10;
            }
            if (section.tags.some(tag => tag.toLowerCase().includes(term))) {
                score += 5;
            }
            if (content.includes(term)) {
                score += 1;
            }
        }

        return score;
    }

    private generateHighlights(content: string, searchTerms: string[]): string[] {
        const highlights: string[] = [];
        const sentences = content.split(/[.!?]+/);

        for (const sentence of sentences) {
            if (searchTerms.some(term => sentence.toLowerCase().includes(term))) {
                highlights.push(sentence.trim());
            }
        }

        return highlights.slice(0, 3);
    }

    private getPopularSections(): string[] {
        const sections = Array.from(this.documentationSections.values());
        return sections
            .sort((a, b) => (b.metadata as any).views - (a.metadata as any).views)
            .slice(0, 5)
            .map(s => s.title);
    }

    private getSearchQueries(): string[] {
        // In a real implementation, this would come from search analytics
        return ['getting started', 'api reference', 'troubleshooting', 'examples', 'configuration'];
    }

    private getUserFeedback(): UserFeedback[] {
        // In a real implementation, this would come from user feedback data
        return [];
    }

    private async updateSearchIndex(): Promise<void> {
        this.searchIndex.clear();
        
        for (const [id, section] of this.documentationSections.entries()) {
            this.searchIndex.set(id, {
                id,
                title: section.title,
                content: section.content,
                type: section.type,
                category: section.category,
                tags: section.tags,
                score: 0,
                highlights: [],
                url: `/documentation/${id}`
            });
        }
    }

    private async saveDocumentationSections(): Promise<void> {
        const data = Array.from(this.documentationSections.values());
        await this.context.globalState.update('documentationSections', data);
    }

    private async saveTutorials(): Promise<void> {
        const data = Array.from(this.tutorials.values());
        await this.context.globalState.update('tutorials', data);
    }

    private async saveTrainingPaths(): Promise<void> {
        const data = Array.from(this.trainingPaths.values());
        await this.context.globalState.update('trainingPaths', data);
    }

    private async saveInteractiveExamples(): Promise<void> {
        const data = Array.from(this.interactiveExamples.values());
        await this.context.globalState.update('interactiveExamples', data);
    }

    private async saveVideoTutorials(): Promise<void> {
        const data = Array.from(this.videoTutorials.values());
        await this.context.globalState.update('videoTutorials', data);
    }

    private async saveUserProgress(): Promise<void> {
        const data = Array.from(this.userProgress.values());
        await this.context.globalState.update('userProgress', data);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
