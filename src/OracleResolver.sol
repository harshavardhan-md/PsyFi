// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { PredictionMarket } from "./PredictionMarket.sol";

contract OracleResolver is Ownable {
    struct DataFeed {
        string apiEndpoint;
        string jsonPath;
        int256 threshold;
        bool isActive;
    }
    
    struct Resolution {
        uint256 marketId;
        PredictionMarket.Outcome outcome;
        uint256 confidence;
        uint256 timestamp;
        address resolver;
    }
    
    mapping(uint256 => DataFeed) public dataFeeds;
    mapping(uint256 => Resolution[]) public resolutions;
    mapping(address => bool) public authorizedResolvers;
    
    uint256 public feedCounter;
    uint256 public constant MIN_CONFIDENCE = 80; // 80%
    uint256 public constant MIN_RESOLVERS = 2;
    
    PredictionMarket public predictionMarket;
    
    event DataFeedCreated(uint256 indexed feedId, string apiEndpoint);
    event ResolutionSubmitted(uint256 indexed marketId, address resolver, PredictionMarket.Outcome outcome);
    event MarketAutoResolved(uint256 indexed marketId, PredictionMarket.Outcome outcome);
    
    constructor(address _predictionMarket) Ownable(msg.sender) {
        predictionMarket = PredictionMarket(_predictionMarket);
    }
    
    // Add authorized resolver (AI agent, human moderator, etc.)
    function addResolver(address _resolver) external onlyOwner {
        authorizedResolvers[_resolver] = true;
    }
    
    // Create data feed for automatic resolution
    function createDataFeed(
        string memory _apiEndpoint,
        string memory _jsonPath,
        int256 _threshold
    ) external onlyOwner returns (uint256) {
        uint256 feedId = feedCounter++;
        
        dataFeeds[feedId] = DataFeed({
            apiEndpoint: _apiEndpoint,
            jsonPath: _jsonPath,
            threshold: _threshold,
            isActive: true
        });
        
        emit DataFeedCreated(feedId, _apiEndpoint);
        return feedId;
    }
    
    // Submit resolution (called by AI agents or authorized resolvers)
    function submitResolution(
        uint256 _marketId,
        PredictionMarket.Outcome _outcome,
        uint256 _confidence
    ) external {
        require(authorizedResolvers[msg.sender], "Not authorized");
        require(_confidence >= MIN_CONFIDENCE, "Confidence too low");
        
        resolutions[_marketId].push(Resolution({
            marketId: _marketId,
            outcome: _outcome,
            confidence: _confidence,
            timestamp: block.timestamp,
            resolver: msg.sender
        }));
        
        emit ResolutionSubmitted(_marketId, msg.sender, _outcome);
        
        // Auto-resolve if consensus reached
        _checkAndResolve(_marketId);
    }
    
    // Check consensus and auto-resolve market
    function _checkAndResolve(uint256 _marketId) internal {
        Resolution[] memory marketResolutions = resolutions[_marketId];
        
        if (marketResolutions.length < MIN_RESOLVERS) return;
        
        // Count votes for each outcome
        uint256 yesCount = 0;
        uint256 noCount = 0;
        uint256 totalConfidence = 0;
        
        for (uint256 i = 0; i < marketResolutions.length; i++) {
            if (marketResolutions[i].outcome == PredictionMarket.Outcome.YES) {
                yesCount++;
            } else {
                noCount++;
            }
            totalConfidence += marketResolutions[i].confidence;
        }
        
        uint256 avgConfidence = totalConfidence / marketResolutions.length;
        
        // Resolve if clear majority and high confidence
        if (avgConfidence >= MIN_CONFIDENCE) {
            PredictionMarket.Outcome finalOutcome = yesCount > noCount ? 
                PredictionMarket.Outcome.YES : 
                PredictionMarket.Outcome.NO;
                
            predictionMarket.resolveMarket(_marketId, finalOutcome);
            emit MarketAutoResolved(_marketId, finalOutcome);
        }
    }
    
    // Get resolution data for market
    function getResolutions(uint256 _marketId) external view returns (
        PredictionMarket.Outcome[] memory outcomes,
        uint256[] memory confidences,
        address[] memory resolvers
    ) {
        Resolution[] memory marketResolutions = resolutions[_marketId];
        
        outcomes = new PredictionMarket.Outcome[](marketResolutions.length);
        confidences = new uint256[](marketResolutions.length);
        resolvers = new address[](marketResolutions.length);
        
        for (uint256 i = 0; i < marketResolutions.length; i++) {
            outcomes[i] = marketResolutions[i].outcome;
            confidences[i] = marketResolutions[i].confidence;
            resolvers[i] = marketResolutions[i].resolver;
        }
    }
    
    // Emergency manual resolution (owner only)
    function emergencyResolve(
        uint256 _marketId,
        PredictionMarket.Outcome _outcome
    ) external onlyOwner {
        predictionMarket.resolveMarket(_marketId, _outcome);
        emit MarketAutoResolved(_marketId, _outcome);
    }
}