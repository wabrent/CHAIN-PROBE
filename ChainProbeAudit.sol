// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ChainProbeAudit {
    struct AuditRecord {
        address auditor;
        string codeHash;
        uint8 score;
        string verdict;
        uint256 timestamp;
    }

    mapping(uint256 => AuditRecord) public audits;
    uint256 public auditCount;
    
    event AuditSubmitted(
        address indexed auditor,
        string codeHash,
        uint8 score,
        string verdict,
        uint256 timestamp
    );

    function submitAudit(
        string calldata codeHash,
        uint8 score,
        string calldata verdict
    ) external {
        require(bytes(codeHash).length > 0, "codeHash required");
        require(bytes(verdict).length > 0, "verdict required");
        require(score <= 100, "score must be 0-100");

        uint256 auditId = auditCount++;
        audits[auditId] = AuditRecord({
            auditor: msg.sender,
            codeHash: codeHash,
            score: score,
            verdict: verdict,
            timestamp: block.timestamp
        });

        emit AuditSubmitted(msg.sender, codeHash, score, verdict, block.timestamp);
    }

    function getAudit(uint256 auditId) external view returns (
        address auditor,
        string memory codeHash,
        uint8 score,
        string memory verdict,
        uint256 timestamp
    ) {
        AuditRecord memory record = audits[auditId];
        return (record.auditor, record.codeHash, record.score, record.verdict, record.timestamp);
    }

    function getTotalAudits() external view returns (uint256) {
        return auditCount;
    }
}
