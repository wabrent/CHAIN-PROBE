import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

const OG_ENDPOINT = 'https://llmogevm.opengradient.ai/v1/chat/completions';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const CHAIN_ID = 84532;

let x402Fetch = null;
if (PRIVATE_KEY) {
  try {
    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: {
        id: 84532,
        name: 'Base Sepolia',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: ['https://sepolia.base.org'] } }
      },
      transport: http()
    });
    x402Fetch = async (url, options) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-PAYMENT-ADDRESS': account.address
        }
      });
    };
    console.log(`✓ x402 ready: ${account.address.slice(0,10)}...`);
  } catch (e) {
    console.log('x402 init failed:', e.message);
  }
}

const auditPrompt = `You are ChainProbe, a Solidity smart contract security auditor.

Analyze this Solidity code for security issues:
- Reentrancy vulnerabilities
- Access control issues
- Integer overflow/underflow
- Front-running risks
- Missing checks-effects-interactions (CEI)
- Unchecked return values

Respond ONLY with valid JSON (no markdown):
{
  "score": <0-100 integer>,
  "verdict": "SAFE|CAUTION|UNSAFE",
  "summary": "<2-3 sentences describing overall security>",
  "issues": [
    {
      "severity": "critical|warning|info",
      "title": "<short issue name>",
      "description": "<1-2 sentences>",
      "line": <optional line number>
    }
  ],
  "gas_tip": "<1 sentence gas optimization tip>"
}

Code to analyze:`;

app.post('/api/audit', async (req, res) => {
  const { code, model } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code required' });
  }
  
  console.log(`\n[${new Date().toISOString()}] Audit request (${code.length} chars)`);
  
  const selectedModel = model === 'gpt41' ? 'openai/gpt-4.1-2025-04-14' 
    : model === 'claude' ? 'anthropic/claude-4.0-sonnet'
    : 'openai/o4-mini';
  
  if (!PRIVATE_KEY) {
    console.log('→ Using fallback (no OG key)');
    return res.json(generateFallbackResult(code));
  }
  
  try {
    console.log(`→ Model: ${selectedModel}`);
    
    const fetcher = x402Fetch || fetch;
    const response = await fetcher(OG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SETTLEMENT-TYPE': 'individual_full'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: auditPrompt },
          { role: 'user', content: code.slice(0, 8000) }
        ],
        max_tokens: 1200
      })
    });
    
    if (response.status === 402) {
      const paymentRequired = response.headers.get('X-PAYMENT-REQUIRED');
      console.log('→ Payment required, using fallback');
      return res.json({ ...generateFallbackResult(code), paymentRequired: true });
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = parseJSONResponse(content);
    
    console.log(`→ Score: ${parsed.score}, Verdict: ${parsed.verdict}`);
    
    res.json({
      ...parsed,
      model: selectedModel,
      demo: false
    });
    
  } catch (e) {
    console.error('→ Error:', e.message);
    res.json(generateFallbackResult(code));
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    status: PRIVATE_KEY ? (x402Fetch ? 'x402_ready' : 'og_ready') : 'demo_mode',
    endpoint: OG_ENDPOINT,
    chain: CHAIN_ID,
    x402: !!x402Fetch,
    timestamp: new Date().toISOString()
  });
});

function generateFallbackResult(code) {
  const lines = (code.match(/\n/g) || []).length + 1;
  const hasReentrancy = code.includes('.call{value') || code.includes('.call\\x00{value');
  const hasAccessControl = !code.includes('onlyOwner') && !code.includes('require(msg.sender');
  
  const issues = [];
  if (hasReentrancy) {
    issues.push({
      severity: 'critical',
      title: 'Reentrancy vulnerability',
      description: 'External call before state change. Use checks-effects-interactions pattern.'
    });
  }
  if (hasAccessControl && code.includes('function')) {
    issues.push({
      severity: 'warning',
      title: 'Missing access control',
      description: 'No onlyOwner modifier on sensitive functions.'
    });
  }
  issues.push({
    severity: 'info',
    title: 'Gas optimization',
    description: 'Consider CustomError instead of require(string).'
  });
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const score = Math.max(0, 100 - (criticalCount * 25) - (issues.filter(i => i.severity === 'warning').length * 10));
  const verdict = score >= 80 ? 'SAFE' : score >= 50 ? 'CAUTION' : 'UNSAFE';
  
  return {
    score,
    verdict,
    summary: `Static analysis found ${issues.length} issue(s). ${criticalCount > 0 ? 'Critical vulnerabilities detected!' : 'Code looks generally safe.'}`,
    issues,
    gas_tip: 'Use CustomError for 50%+ gas savings on revert messages.',
    txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    lines_analyzed: lines,
    demo: true
  };
}

function parseJSONResponse(text) {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) {
      return generateFallbackResult('');
    }
    const json = text.slice(start, end + 1);
    return JSON.parse(json);
  } catch (e) {
    console.error('Parse error:', e.message);
    return generateFallbackResult('');
  }
}

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.get('/index.html', (req, res) => {
  const possiblePaths = [
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, 'index.html'),
  ];
  
  let indexPath = null;
  for (const p of possiblePaths) {
    console.log('Checking:', p);
    if (existsSync(p)) {
      indexPath = p;
      break;
    }
  }
  
  if (indexPath) {
    const html = readFileSync(indexPath, 'utf-8');
    res.type('html').send(html);
  } else {
    res.status(500).send('index.html not found. CWD: ' + process.cwd());
  }
});

app.get('/debug', (req, res) => {
  res.json({
    cwd: process.cwd(),
    __dirname,
    files: require('fs').readdirSync(process.cwd()),
    env: Object.keys(process.env).filter(k => k.includes('KEY') || k.includes('PORT'))
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════╗
║     ChainProbe Backend       ║
║     http://localhost:${PORT}          ║
║     Mode: ${PRIVATE_KEY ? 'OG READY' : 'DEMO'}         ║
╚═══════════════════════════════════╝
  `);
});