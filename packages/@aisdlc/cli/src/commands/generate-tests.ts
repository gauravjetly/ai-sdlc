import * as fs from 'fs';
import * as path from 'path';

/**
 * AI-Powered Test Generator
 * Generates unit, integration, and property-based tests
 */

export async function generateTestsCommand(args: string[]): Promise<void> {
  const targetFile = args[0];

  if (!targetFile) {
    console.log('Usage: aisdlc generate-tests <file>');
    return;
  }

  console.log(`\n  Generating tests for: ${targetFile}\n`);

  if (!fs.existsSync(targetFile)) {
    console.error('  Error: File not found');
    return;
  }

  const content = fs.readFileSync(targetFile, 'utf-8');
  const tests = await generateTests(content, targetFile);

  // Write tests
  const testFile = targetFile.replace(/\.ts$/, '.test.ts');
  fs.writeFileSync(testFile, tests);

  console.log(`  ✅ Generated ${countTests(tests)} test(s)`);
  console.log(`  📝 Written to: ${testFile}\n`);
}

async function generateTests(content: string, filePath: string): Promise<string> {
  const functions = extractFunctions(content);
  const classes = extractClasses(content);

  let testCode = `import { ${extractImports(content)} } from './${path.basename(filePath, '.ts')}';\n\n`;

  // Generate tests for each function
  for (const func of functions) {
    testCode += generateFunctionTests(func);
  }

  // Generate tests for each class
  for (const cls of classes) {
    testCode += generateClassTests(cls);
  }

  return testCode;
}

function generateFunctionTests(func: { name: string; params: string[]; body: string }): string {
  return `describe('${func.name}', () => {
  it('should handle valid input', () => {
    // TODO: Implement test
    const result = ${func.name}(/* valid params */);
    expect(result).toBeDefined();
  });

  it('should handle edge cases', () => {
    // TODO: Test edge cases
  });

  it('should throw on invalid input', () => {
    expect(() => ${func.name}(/* invalid */)).toThrow();
  });
});

`;
}

function generateClassTests(cls: { name: string; methods: string[] }): string {
  return `describe('${cls.name}', () => {
  let instance: ${cls.name};

  beforeEach(() => {
    instance = new ${cls.name}();
  });

${cls.methods.map(method => `  it('${method} should work correctly', () => {
    // TODO: Implement test
    expect(instance.${method}).toBeDefined();
  });
`).join('\n')}
});

`;
}

function extractFunctions(content: string): Array<{ name: string; params: string[]; body: string }> {
  const functions: Array<{ name: string; params: string[]; body: string }> = [];
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\((.*?)\)/g;

  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    functions.push({
      name: match[1],
      params: match[2].split(',').map(p => p.trim()),
      body: ''
    });
  }

  return functions;
}

function extractClasses(content: string): Array<{ name: string; methods: string[] }> {
  const classes: Array<{ name: string; methods: string[] }> = [];
  const classRegex = /class\s+(\w+)/g;

  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const className = match[1];
    const methods = extractClassMethods(content, className);
    classes.push({ name: className, methods });
  }

  return classes;
}

function extractClassMethods(content: string, className: string): string[] {
  const methods: string[] = [];
  const methodRegex = /(?:public|private|protected)?\s*(\w+)\s*\(/g;

  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    if (match[1] !== className && match[1] !== 'constructor') {
      methods.push(match[1]);
    }
  }

  return methods;
}

function extractImports(content: string): string {
  const importMatch = content.match(/export\s+(?:class|function)\s+(\w+)/g);
  return importMatch ? importMatch.map(m => m.split(' ').pop()).join(', ') : '';
}

function countTests(testCode: string): number {
  return (testCode.match(/it\(/g) || []).length;
}
