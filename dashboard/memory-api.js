/**
 * Memory Dashboard API
 * Provides endpoints for visualizing agent memory and learnings
 */

const fs = require('fs');
const path = require('path');

const MEMORY_BASE = path.join(process.env.HOME, '.claude', 'agent-memory');
const ARCHITECT_MEMORY = path.join(process.env.HOME, '.claude', 'architect-memory');

// Get all agent memories
function getAgentMemories() {
    const agents = ['ba', 'engineer', 'security', 'qa', 'atlas', 'customer', 'conductor', 'finops', 'tracker'];
    const memories = {};

    for (const agent of agents) {
        const agentPath = path.join(MEMORY_BASE, agent);
        memories[agent] = {
            patterns: countFiles(path.join(agentPath, 'patterns')),
            solutions: countFiles(path.join(agentPath, 'solutions')),
            learnings: countFiles(path.join(agentPath, 'learnings')),
            projects: countFiles(path.join(agentPath, 'projects')),
            totalSize: getDirectorySize(agentPath)
        };
    }

    return memories;
}

// Count JSON files in directory
function countFiles(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) return 0;
        return fs.readdirSync(dirPath).filter(f => f.endsWith('.json')).length;
    } catch (e) {
        return 0;
    }
}

// Get directory size
function getDirectorySize(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) return 0;
        let size = 0;
        const files = fs.readdirSync(dirPath, { recursive: true });
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            try {
                const stats = fs.statSync(filePath);
                if (stats.isFile()) size += stats.size;
            } catch (e) {}
        }
        return size;
    } catch (e) {
        return 0;
    }
}

// Get cross-agent learnings
function getCrossAgentLearnings() {
    const learningFile = path.join(MEMORY_BASE, 'shared', 'cross-agent-learnings.json');
    try {
        if (fs.existsSync(learningFile)) {
            return JSON.parse(fs.readFileSync(learningFile, 'utf8'));
        }
    } catch (e) {}
    return { learning_flows: {}, shared_patterns: {} };
}

// Get Vintiq product knowledge
function getVintiqKnowledge() {
    const productsPath = path.join(ARCHITECT_MEMORY, 'vintiq-products');
    const products = [];

    try {
        if (fs.existsSync(productsPath)) {
            const files = fs.readdirSync(productsPath).filter(f => f.endsWith('.json'));
            for (const file of files) {
                try {
                    const content = JSON.parse(fs.readFileSync(path.join(productsPath, file), 'utf8'));
                    products.push({
                        name: content.product || file.replace('.json', ''),
                        category: content.category || 'Unknown',
                        lastUpdated: content.lastUpdated || 'Unknown'
                    });
                } catch (e) {}
            }
        }
    } catch (e) {}

    return products;
}

// Get memory statistics
function getMemoryStats() {
    const memories = getAgentMemories();
    const crossLearnings = getCrossAgentLearnings();
    const vintiqProducts = getVintiqKnowledge();

    let totalPatterns = 0;
    let totalSolutions = 0;
    let totalLearnings = 0;
    let totalProjects = 0;
    let totalSize = 0;

    for (const agent of Object.values(memories)) {
        totalPatterns += agent.patterns;
        totalSolutions += agent.solutions;
        totalLearnings += agent.learnings;
        totalProjects += agent.projects;
        totalSize += agent.totalSize;
    }

    const flowCount = Object.keys(crossLearnings.learning_flows || {}).length;
    const sharedPatternCount = Object.keys(crossLearnings.shared_patterns || {}).length;

    return {
        agents: memories,
        totals: {
            patterns: totalPatterns,
            solutions: totalSolutions,
            learnings: totalLearnings,
            projects: totalProjects,
            sizeBytes: totalSize,
            sizeFormatted: formatBytes(totalSize)
        },
        crossAgent: {
            flows: flowCount,
            sharedPatterns: sharedPatternCount
        },
        vintiq: {
            products: vintiqProducts.length,
            productList: vintiqProducts
        }
    };
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get top patterns across all agents
function getTopPatterns() {
    const patterns = [];
    const agents = ['ba', 'engineer', 'security', 'qa', 'atlas', 'conductor'];

    for (const agent of agents) {
        const patternsPath = path.join(MEMORY_BASE, agent, 'patterns');
        try {
            if (fs.existsSync(patternsPath)) {
                const files = fs.readdirSync(patternsPath).filter(f => f.endsWith('.json'));
                for (const file of files) {
                    patterns.push({
                        agent,
                        file: file.replace('.json', ''),
                        path: path.join(patternsPath, file)
                    });
                }
            }
        } catch (e) {}
    }

    return patterns;
}

// Export for use in main server
module.exports = {
    getAgentMemories,
    getCrossAgentLearnings,
    getVintiqKnowledge,
    getMemoryStats,
    getTopPatterns
};
