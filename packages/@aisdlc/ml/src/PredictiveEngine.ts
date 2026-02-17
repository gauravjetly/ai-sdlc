import { SQLiteProvider } from '@aisdlc/storage';
import { Matrix } from 'ml-matrix';

/**
 * Predictive Quality Analysis Engine
 *
 * Learns from local workflow history to predict quality issues
 * before they occur. All processing happens locally, no cloud APIs.
 */

export interface Prediction {
  type: 'security' | 'performance' | 'test-failure' | 'regression' | 'complexity';
  confidence: number; // 0-1
  reason: string;
  suggestions: string[];
  historicalData: {
    occurrences: number;
    lastSeen: Date;
    avgImpact: string;
  };
}

export interface WorkflowContext {
  files: string[];
  fileTypes: string[];
  linesChanged: number;
  filesChanged: number;
  author?: string;
  branch?: string;
  description: string;
}

interface HistoricalPattern {
  pattern: string;
  issueType: string;
  occurrences: number;
  features: number[];
}

export class PredictiveEngine {
  private db: SQLiteProvider;
  private patterns: HistoricalPattern[] = [];
  private modelWeights: Matrix | null = null;
  private lastTraining: Date | null = null;

  constructor(dbPath?: string) {
    this.db = new SQLiteProvider({
      dbPath: dbPath || require('os').homedir() + '/.aisdlc/data/platform.db'
    });
    this.initializeSchema();
    this.loadModel();
  }

  private initializeSchema(): void {
    // Store ML predictions
    this.db.query(`
      CREATE TABLE IF NOT EXISTS ml_predictions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT,
        prediction_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        reason TEXT NOT NULL,
        suggestions TEXT NOT NULL,
        occurrences INTEGER DEFAULT 0,
        last_seen TEXT,
        avg_impact TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Store training data (learn from outcomes)
    this.db.query(`
      CREATE TABLE IF NOT EXISTS ml_training_data (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        file_pattern TEXT,
        issue_type TEXT,
        did_occur INTEGER, -- 0 or 1
        features TEXT, -- JSON array of feature vector
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Store model metadata
    this.db.query(`
      CREATE TABLE IF NOT EXISTS ml_models (
        id TEXT PRIMARY KEY,
        model_type TEXT NOT NULL,
        weights TEXT, -- JSON serialized weights
        accuracy REAL,
        last_trained TEXT,
        training_samples INTEGER,
        version INTEGER DEFAULT 1
      )
    `);

    // Create indexes
    this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_predictions_workflow
      ON ml_predictions(workflow_id)
    `);

    this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_training_workflow
      ON ml_training_data(workflow_id)
    `);
  }

  /**
   * Predict quality issues for a given workflow context
   */
  async predict(context: WorkflowContext): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    const features = this.extractFeatures(context);

    // Pattern-based predictions (rule-based, fast)
    predictions.push(...this.patternBasedPredictions(context));

    // ML-based predictions (if model is trained)
    if (this.modelWeights) {
      predictions.push(...this.mlBasedPredictions(features, context));
    }

    // Store predictions for future learning
    for (const pred of predictions) {
      this.storePrediction(pred, context);
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Pattern-based predictions using historical data
   */
  private patternBasedPredictions(context: WorkflowContext): Prediction[] {
    const predictions: Prediction[] = [];

    // Check file patterns
    for (const file of context.files) {
      const historical = this.getHistoricalIssues(file);

      if (historical.length > 0) {
        for (const issue of historical) {
          predictions.push({
            type: issue.type as any,
            confidence: Math.min(0.95, issue.occurrences * 0.15),
            reason: `File ${file} has had ${issue.occurrences} ${issue.type} issues in the past`,
            suggestions: this.getSuggestionsForIssueType(issue.type),
            historicalData: {
              occurrences: issue.occurrences,
              lastSeen: new Date(issue.lastSeen),
              avgImpact: issue.avgImpact
            }
          });
        }
      }
    }

    // Check for authentication code (high security risk)
    if (context.description.match(/auth|login|password|token|jwt|oauth/i)) {
      const authIssues = this.getHistoricalAuthIssues();
      if (authIssues > 0) {
        predictions.push({
          type: 'security',
          confidence: 0.85,
          reason: `Authentication code changes have caused ${authIssues} security issues in the past`,
          suggestions: [
            'Run security review early in the workflow',
            'Use parameterized queries to prevent SQL injection',
            'Implement rate limiting on auth endpoints',
            'Add comprehensive auth tests',
            'Review OWASP authentication checklist'
          ],
          historicalData: {
            occurrences: authIssues,
            lastSeen: new Date(),
            avgImpact: 'HIGH'
          }
        });
      }
    }

    // Check for payment code (PCI compliance risk)
    if (context.description.match(/payment|stripe|card|billing|checkout/i)) {
      predictions.push({
        type: 'security',
        confidence: 0.90,
        reason: 'Payment code requires PCI DSS compliance verification',
        suggestions: [
          'Never store credit card numbers',
          'Use Stripe.js for card tokenization',
          'Implement PCI DSS compliance checklist',
          'Add security review before deployment',
          'Use test cards for all testing'
        ],
        historicalData: {
          occurrences: 0,
          lastSeen: new Date(),
          avgImpact: 'CRITICAL'
        }
      });
    }

    // Check for large changes (higher regression risk)
    if (context.filesChanged > 10) {
      predictions.push({
        type: 'regression',
        confidence: 0.70,
        reason: `Large change (${context.filesChanged} files) increases regression risk`,
        suggestions: [
          'Run full regression test suite',
          'Review critical user journeys',
          'Consider breaking into smaller PRs',
          'Add integration tests for changed areas'
        ],
        historicalData: {
          occurrences: 0,
          lastSeen: new Date(),
          avgImpact: 'MEDIUM'
        }
      });
    }

    // Check for complex files
    if (context.linesChanged > 500) {
      predictions.push({
        type: 'complexity',
        confidence: 0.65,
        reason: `Large change (${context.linesChanged} lines) may indicate complexity issues`,
        suggestions: [
          'Consider refactoring into smaller functions',
          'Add comprehensive unit tests',
          'Review cyclomatic complexity',
          'Document complex logic'
        ],
        historicalData: {
          occurrences: 0,
          lastSeen: new Date(),
          avgImpact: 'LOW'
        }
      });
    }

    return predictions;
  }

  /**
   * ML-based predictions using trained model
   */
  private mlBasedPredictions(features: number[], context: WorkflowContext): Prediction[] {
    const predictions: Prediction[] = [];

    if (!this.modelWeights) {
      return predictions;
    }

    try {
      // Simple logistic regression for binary classification
      const featureVector = Matrix.rowVector(features);
      const scores = featureVector.mmul(this.modelWeights);

      // Each column is a different issue type
      const issueTypes = ['security', 'performance', 'test-failure', 'regression'];

      for (let i = 0; i < issueTypes.length; i++) {
        const confidence = this.sigmoid(scores.get(0, i));

        if (confidence > 0.5) {
          predictions.push({
            type: issueTypes[i] as any,
            confidence: Math.min(0.99, confidence),
            reason: `ML model predicts ${issueTypes[i]} issue based on code patterns`,
            suggestions: this.getSuggestionsForIssueType(issueTypes[i]),
            historicalData: {
              occurrences: 0,
              lastSeen: new Date(),
              avgImpact: 'MEDIUM'
            }
          });
        }
      }
    } catch (error) {
      console.error('ML prediction error:', error);
    }

    return predictions;
  }

  /**
   * Extract features from workflow context for ML model
   */
  private extractFeatures(context: WorkflowContext): number[] {
    return [
      context.filesChanged,
      context.linesChanged,
      context.files.filter(f => f.includes('auth')).length,
      context.files.filter(f => f.includes('payment')).length,
      context.files.filter(f => f.includes('test')).length,
      context.files.filter(f => f.endsWith('.ts')).length,
      context.files.filter(f => f.endsWith('.tsx')).length,
      context.files.filter(f => f.includes('controller')).length,
      context.files.filter(f => f.includes('service')).length,
      context.files.filter(f => f.includes('repository')).length,
      // Add more features as needed
    ];
  }

  /**
   * Record actual outcome for learning
   */
  async recordOutcome(
    workflowId: string,
    issueType: string,
    didOccur: boolean
  ): Promise<void> {
    // Get the prediction we made
    const result = this.db.query<any>(
      'SELECT * FROM ml_predictions WHERE workflow_id = ?',
      [workflowId]
    );
    const predictions = Array.isArray(result) ? result : result.rows || [];

    // Store training data
    for (const pred of predictions) {
      this.db.query(
        `INSERT INTO ml_training_data (id, workflow_id, file_pattern, issue_type, did_occur, features, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          `train_${Date.now()}_${Math.random()}`,
          workflowId,
          '', // Would extract from workflow
          issueType,
          didOccur ? 1 : 0,
          JSON.stringify([]) // Would use actual features
        ]
      );
    }

    // Retrain model periodically
    const countResult = this.db.query<any>(
      'SELECT COUNT(*) as count FROM ml_training_data'
    );
    const countRows = Array.isArray(countResult) ? countResult : countResult.rows || [];
    const trainingCount = countRows[0]?.count || 0;

    if (trainingCount >= 50 && (!this.lastTraining ||
        Date.now() - this.lastTraining.getTime() > 86400000)) {
      await this.trainModel();
    }
  }

  /**
   * Train the ML model on historical data
   */
  private async trainModel(): Promise<void> {
    console.log('Training ML model on local data...');

    const result = this.db.query<any>(
      'SELECT * FROM ml_training_data ORDER BY created_at DESC LIMIT 1000'
    );
    const trainingData = Array.isArray(result) ? result : result.rows || [];

    if (trainingData.length < 20) {
      console.log('Not enough training data yet');
      return;
    }

    try {
      // Extract features and labels
      const X: number[][] = [];
      const y: number[][] = [];

      for (const row of trainingData) {
        const features = JSON.parse(row.features);
        X.push(features);

        // One-hot encode issue types
        const label = [0, 0, 0, 0]; // security, performance, test-failure, regression
        const issueIndex = ['security', 'performance', 'test-failure', 'regression']
          .indexOf(row.issue_type);
        if (issueIndex >= 0) {
          label[issueIndex] = row.did_occur;
        }
        y.push(label);
      }

      const XMatrix = new Matrix(X);
      const yMatrix = new Matrix(y);

      // Simple gradient descent for logistic regression
      const learningRate = 0.01;
      const iterations = 100;
      const nFeatures = XMatrix.columns;
      const nClasses = yMatrix.columns;

      this.modelWeights = Matrix.zeros(nFeatures, nClasses);

      for (let iter = 0; iter < iterations; iter++) {
        const predictions = XMatrix.mmul(this.modelWeights);
        const errors = predictions.clone();

        for (let i = 0; i < errors.rows; i++) {
          for (let j = 0; j < errors.columns; j++) {
            errors.set(i, j, this.sigmoid(predictions.get(i, j)) - yMatrix.get(i, j));
          }
        }

        const gradient = XMatrix.transpose().mmul(errors).div(XMatrix.rows);
        this.modelWeights = this.modelWeights.sub(gradient.mul(learningRate));
      }

      // Save model to database
      this.saveModel();
      this.lastTraining = new Date();

      console.log(`Model trained on ${trainingData.length} samples`);
    } catch (error) {
      console.error('Model training error:', error);
    }
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private saveModel(): void {
    if (!this.modelWeights) return;

    const weights = this.modelWeights.to2DArray();

    this.db.query(
      `INSERT OR REPLACE INTO ml_models (id, model_type, weights, last_trained, version)
       VALUES ('predictive_quality', 'logistic_regression', ?, datetime('now'), 1)`,
      [JSON.stringify(weights)]
    );
  }

  private loadModel(): void {
    try {
      const result = this.db.query<any>(
        `SELECT * FROM ml_models WHERE model_type = 'logistic_regression' ORDER BY last_trained DESC LIMIT 1`
      );
      const models = Array.isArray(result) ? result : result.rows || [];

      if (models.length > 0) {
        const weights = JSON.parse(models[0].weights);
        this.modelWeights = new Matrix(weights);
        this.lastTraining = new Date(models[0].last_trained);
        console.log('Loaded ML model from', models[0].last_trained);
      }
    } catch (error) {
      console.log('No existing model found, will train when data available');
    }
  }

  private getHistoricalIssues(file: string): any[] {
    // Query historical issues for this file pattern
    const pattern = file.split('/').slice(-2).join('/'); // Last 2 path segments

    const result = this.db.query<any>(
      `SELECT
        issue_type as type,
        COUNT(*) as occurrences,
        MAX(created_at) as lastSeen,
        'MEDIUM' as avgImpact
       FROM ml_training_data
       WHERE file_pattern LIKE ? AND did_occur = 1
       GROUP BY issue_type`,
      [`%${pattern}%`]
    );

    return Array.isArray(result) ? result : result.rows || [];
  }

  private getHistoricalAuthIssues(): number {
    const result = this.db.query<any>(
      `SELECT COUNT(*) as count
       FROM ml_training_data
       WHERE issue_type = 'security'
       AND (file_pattern LIKE '%auth%' OR file_pattern LIKE '%login%')
       AND did_occur = 1`
    );
    const rows = Array.isArray(result) ? result : result.rows || [];
    return rows[0]?.count || 0;
  }

  private getSuggestionsForIssueType(issueType: string): string[] {
    const suggestions: Record<string, string[]> = {
      security: [
        'Run security scan early',
        'Review OWASP Top 10',
        'Add input validation',
        'Use parameterized queries',
        'Implement rate limiting'
      ],
      performance: [
        'Profile the code',
        'Add caching where appropriate',
        'Optimize database queries',
        'Use lazy loading',
        'Monitor Core Web Vitals'
      ],
      'test-failure': [
        'Run tests locally first',
        'Check for flaky tests',
        'Review test isolation',
        'Add missing test cases',
        'Update test fixtures'
      ],
      regression: [
        'Run full regression suite',
        'Test critical user journeys',
        'Review breaking changes',
        'Add integration tests',
        'Check backwards compatibility'
      ],
      complexity: [
        'Refactor into smaller functions',
        'Reduce cyclomatic complexity',
        'Add documentation',
        'Consider design patterns',
        'Review SOLID principles'
      ]
    };

    return suggestions[issueType] || ['Review code carefully'];
  }

  private storePrediction(pred: Prediction, context: WorkflowContext): void {
    this.db.query(
      `INSERT INTO ml_predictions (id, workflow_id, prediction_type, confidence, reason, suggestions, occurrences, last_seen, avg_impact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `pred_${Date.now()}_${Math.random()}`,
        '', // Would come from context
        pred.type,
        pred.confidence,
        pred.reason,
        JSON.stringify(pred.suggestions),
        pred.historicalData.occurrences,
        pred.historicalData.lastSeen.toISOString(),
        pred.historicalData.avgImpact
      ]
    );
  }
}
