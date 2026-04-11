# ChainProbe

Smart Contract Security Auditor with OpenGradient TEE Integration

## Overview

ChainProbe is a Solidity smart contract security auditing tool that leverages OpenGradient's Trusted Execution Environment (TEE) for verifiable AI inference. The application analyzes Solidity code for common security vulnerabilities and settles audit proofs on-chain via Base Sepolia.

## Features

- Solidity smart contract security analysis
- OpenGradient TEE-verified inference
- On-chain proof settlement
- Real-time security scoring
- Issue detection: reentrancy, access control, integer overflow, CEI violations

## Architecture

```
User (Browser) -> ChainProbe Frontend -> ChainProbe Backend -> OpenGradient TEE
                                                        |
                                                   Base Sepolia
                                                        |
                                                    $OPG
```

## Tech Stack

- Frontend: Vanilla JavaScript, HTML5, CSS3
- Backend: Node.js, Express
- AI: OpenGradient x402 Gateway
- Blockchain: Base Sepolia (Chain ID: 84532)
- Token: $OPG (0x240b09731D96979f50B2C649C9CE10FcF9C7987F)

## Deployment

### Backend (Render)

1. Create a new Web Service on Render
2. Connect to GitHub repository: `wabrent/CHAIN-PROBE`
3. Set Dockerfile path: `/Dockerfile`
4. Add environment variables:
   - `PRIVATE_KEY`: Your Base Sepolia wallet private key
   - `PORT`: 3001 (default)

### Alternative: Local Development

```bash
# Clone repository
git clone https://github.com/wabrent/CHAIN-PROBE.git
cd CHAIN-PROBE

# Install dependencies
cd backend && npm install

# Set environment variable
export PRIVATE_KEY=0x...

# Start server
npm start
```

The application will be available at `http://localhost:3001`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| PRIVATE_KEY | Yes | Base Sepolia wallet private key for $OPG payments |
| PORT | No | Server port (default: 3001) |
| OG_MODEL | No | Model ID (default: anthropic/claude-4.0-sonnet) |

## Supported Models

- `openai/gpt-4.1-2025-04-14`
- `anthropic/claude-4.0-sonnet`
- `openai/o4-mini`

## API Endpoints

### POST /api/audit

Analyze Solidity code for security vulnerabilities.

**Request:**
```json
{
  "code": "pragma solidity ^0.8.0; ...",
  "model": "gpt41"
}
```

**Response:**
```json
{
  "score": 85,
  "verdict": "SAFE",
  "summary": "Code looks generally safe...",
  "issues": [
    {
      "severity": "warning",
      "title": "Missing access control",
      "description": "No onlyOwner modifier..."
    }
  ],
  "gas_tip": "Use CustomError for gas savings.",
  "txHash": "0x...",
  "demo": false
}
```

### GET /api/status

Check backend status.

**Response:**
```json
{
  "status": "og_ready",
  "endpoint": "https://llm.opengradient.ai/v1/chat/completions",
  "timestamp": "2026-04-11T08:30:20.900Z"
}
```

## Security Considerations

1. **Private Key Storage**: Never expose private keys in client-side code. Use environment variables on the backend.
2. **Testnet First**: Always test on Base Sepolia before production.
3. **API Keys**: Keep all sensitive credentials in environment variables.

## Resources

- OpenGradient Documentation: https://docs.opengradient.ai/
- OpenGradient Explorer: https://explorer.opengradient.ai/
- OpenGradient Faucet: https://faucet.opengradient.ai/
- Base Sepolia Faucet: https://www.alchemy.com/faucets/base-sepolia
- Render Dashboard: https://dashboard.render.com/

## License

MIT License

## Author

- Twitter: https://x.com/graanit2
- GitHub: https://github.com/wabrent

## Version

1.0.0