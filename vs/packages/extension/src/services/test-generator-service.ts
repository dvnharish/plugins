import * as vscode from 'vscode';
import { TestGenerationRequest, GeneratedTest } from '@devguard/shared';

export class TestGeneratorService {
    async generateTests(uri: vscode.Uri): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const javaClass = this.parseJavaClass(document.getText(), uri.fsPath);
            
            if (!javaClass) {
                vscode.window.showWarningMessage('Could not parse Java class');
                return;
            }

            const testRequest: TestGenerationRequest = {
                filePath: uri.fsPath,
                className: javaClass.className,
                methods: javaClass.methods,
                packageName: javaClass.packageName
            };

            const generatedTest = await this.generateJUnitTest(testRequest);
            
            // Write test file
            const testPath = this.getTestPath(uri.fsPath);
            const testUri = vscode.Uri.file(testPath);
            
            const edit = new vscode.WorkspaceEdit();
            edit.createFile(testUri, { ignoreIfExists: false });
            edit.insert(testUri, new vscode.Position(0, 0), generatedTest.content);
            
            await vscode.workspace.applyEdit(edit);
            
            vscode.window.showInformationMessage(`✅ Generated JUnit tests: ${testPath}`);
            
            // Open the generated test file
            await vscode.window.showTextDocument(testUri);
            
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Test generation failed: ${error}`);
        }
    }

    private parseJavaClass(content: string, filePath: string): { className: string; methods: string[]; packageName: string } | null {
        try {
            // Simple Java class parser - in real implementation, use JavaParser
            const lines = content.split('\n');
            let packageName = '';
            let className = '';
            const methods: string[] = [];

            for (const line of lines) {
                const trimmed = line.trim();
                
                // Extract package
                if (trimmed.startsWith('package ')) {
                    packageName = trimmed.replace('package ', '').replace(';', '');
                }
                
                // Extract class name
                if (trimmed.includes('class ') && !trimmed.includes('//')) {
                    const classMatch = trimmed.match(/class\s+(\w+)/);
                    if (classMatch) {
                        className = classMatch[1];
                    }
                }
                
                // Extract public methods
                if (trimmed.includes('public ') && trimmed.includes('(') && trimmed.includes(')') && !trimmed.includes('//')) {
                    const methodMatch = trimmed.match(/public\s+[\w<>\[\]]+\s+(\w+)\s*\(/);
                    if (methodMatch) {
                        methods.push(methodMatch[1]);
                    }
                }
            }

            if (!className) {
                return null;
            }

            return { className, methods, packageName };
        } catch (error) {
            console.error('Failed to parse Java class:', error);
            return null;
        }
    }

    private async generateJUnitTest(request: TestGenerationRequest): Promise<GeneratedTest> {
        const { className, methods, packageName } = request;
        const testClassName = `${className}Test`;
        const testPackageName = packageName ? `${packageName}.test` : 'test';

        let content = `package ${testPackageName};\n\n`;
        content += `import org.junit.jupiter.api.BeforeEach;\n`;
        content += `import org.junit.jupiter.api.Test;\n`;
        content += `import org.junit.jupiter.api.DisplayName;\n`;
        content += `import org.junit.jupiter.api.Nested;\n`;
        content += `import static org.junit.jupiter.api.Assertions.*;\n`;
        content += `import static org.mockito.Mockito.*;\n\n`;
        content += `@DisplayName("${className} Tests")\n`;
        content += `class ${testClassName} {\n\n`;
        content += `    private ${className} ${this.toCamelCase(className)};\n\n`;
        content += `    @BeforeEach\n`;
        content += `    void setUp() {\n`;
        content += `        ${this.toCamelCase(className)} = new ${className}();\n`;
        content += `    }\n\n`;

        // Generate test methods for each public method
        for (const method of methods) {
            content += this.generateTestMethod(className, method);
        }

        content += `}\n`;

        const testPath = this.getTestPath(request.filePath);
        
        return {
            filePath: testPath,
            content,
            testMethods: methods.map(method => `test${this.toPascalCase(method)}`)
        };
    }

    private generateTestMethod(className: string, methodName: string): string {
        const testMethodName = `test${this.toPascalCase(methodName)}`;
        
        return `    @Test\n` +
               `    @DisplayName("should ${methodName} successfully")\n` +
               `    void ${testMethodName}() {\n` +
               `        // Arrange\n` +
               `        // TODO: Set up test data\n\n` +
               `        // Act\n` +
               `        // TODO: Call method under test\n\n` +
               `        // Assert\n` +
               `        // TODO: Verify results\n` +
               `        fail("Test not implemented yet");\n` +
               `    }\n\n`;
    }

    private generateTestDataBuilder(className: string): string {
        const builderClassName = `${className}TestDataBuilder`;
        
        return `    public static class ${builderClassName} {\n` +
               `        private ${className} ${this.toCamelCase(className)} = new ${className}();\n\n` +
               `        public static ${builderClassName} a${className}() {\n` +
               `            return new ${builderClassName}();\n` +
               `        }\n\n` +
               `        public ${builderClassName} withDefaultValues() {\n` +
               `            // TODO: Set default values\n` +
               `            return this;\n` +
               `        }\n\n` +
               `        public ${className} build() {\n` +
               `            return ${this.toCamelCase(className)};\n` +
               `        }\n` +
               `    }\n`;
    }

    private getTestPath(originalPath: string): string {
        // Convert src/main/java/... to src/test/java/...
        const testPath = originalPath
            .replace(/src\/main\/java/, 'src/test/java')
            .replace(/\.java$/, 'Test.java');
        
        return testPath;
    }

    private toCamelCase(str: string): string {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    private toPascalCase(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
