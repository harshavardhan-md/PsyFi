// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from"@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";


contract PredictionMarket is ReentrancyGuard, Ownable {
    // Market states
    enum MarketState { ACTIVE, RESOLVED, CANCELLED }
    
    // Betting options
    enum Outcome { YES, NO }
    
    // Market structure
    struct Market {
        string question;
        string description;
        uint256 endTime;
        uint256 resolutionTime;
        MarketState state;
        Outcome winningOutcome;
        uint256 totalYesAmount;
        uint256 totalNoAmount;
        mapping(address => uint256) yesBets;
        mapping(address => uint256) noBets;
        mapping(address => bool) claimed;
        address oracle;
        bool resolved;
    }
    
    // State variables
    mapping(uint256 => Market) public markets;
    uint256 public marketCounter;
    uint256 public constant FEE_PERCENTAGE = 50; // 0.5%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    IERC20 public usdcToken;
    address public feeCollector;
    
    // Events
    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime);
    event BetPlaced(uint256 indexed marketId, address indexed user, Outcome outcome, uint256 amount);
    event MarketResolved(uint256 indexed marketId, Outcome winningOutcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    
    constructor(address _usdcToken, address _feeCollector) 
    Ownable(msg.sender)   // OZ v5 requires initialOwner
    {
        usdcToken = IERC20(_usdcToken);
        feeCollector = _feeCollector;
    }
    
    // Create new prediction market
    function createMarket(
        string memory _question,
        string memory _description,
        uint256 _endTime,
        uint256 _resolutionTime,
        address _oracle
    ) external returns (uint256) {
        require(_endTime > block.timestamp, "End time must be in future");
        require(_resolutionTime > _endTime, "Resolution time must be after end time");
        
        uint256 marketId = marketCounter++;
        Market storage market = markets[marketId];
        
        market.question = _question;
        market.description = _description;
        market.endTime = _endTime;
        market.resolutionTime = _resolutionTime;
        market.state = MarketState.ACTIVE;
        market.oracle = _oracle;
        
        emit MarketCreated(marketId, _question, _endTime);
        return marketId;
    }
    
    // Place bet on market
    function placeBet(
        uint256 _marketId,
        Outcome _outcome,
        uint256 _amount
    ) external nonReentrant {
        Market storage market = markets[_marketId];
        
        require(market.state == MarketState.ACTIVE, "Market not active");
        require(block.timestamp < market.endTime, "Betting period ended");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer USDC from user
        require(
            usdcToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        
        // Update bet amounts
        if (_outcome == Outcome.YES) {
            market.yesBets[msg.sender] += _amount;
            market.totalYesAmount += _amount;
        } else {
            market.noBets[msg.sender] += _amount;
            market.totalNoAmount += _amount;
        }
        
        emit BetPlaced(_marketId, msg.sender, _outcome, _amount);
    }
    
    // Resolve market (only oracle can call)
    function resolveMarket(
        uint256 _marketId,
        Outcome _winningOutcome
    ) external {
        Market storage market = markets[_marketId];
        
        require(msg.sender == market.oracle, "Only oracle can resolve");
        require(market.state == MarketState.ACTIVE, "Market not active");
        require(block.timestamp >= market.resolutionTime, "Resolution time not reached");
        require(!market.resolved, "Already resolved");
        
        market.winningOutcome = _winningOutcome;
        market.state = MarketState.RESOLVED;
        market.resolved = true;
        
        emit MarketResolved(_marketId, _winningOutcome);
    }
    
    // Claim winnings
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        
        require(market.state == MarketState.RESOLVED, "Market not resolved");
        require(!market.claimed[msg.sender], "Already claimed");
        
        uint256 userBet;
        uint256 totalWinningAmount;
        uint256 totalLosingAmount;
        
        if (market.winningOutcome == Outcome.YES) {
            userBet = market.yesBets[msg.sender];
            totalWinningAmount = market.totalYesAmount;
            totalLosingAmount = market.totalNoAmount;
        } else {
            userBet = market.noBets[msg.sender];
            totalWinningAmount = market.totalNoAmount;
            totalLosingAmount = market.totalYesAmount;
        }
        
        require(userBet > 0, "No winning bet found");
        
        // Calculate winnings: original bet + share of losing bets (minus fees)
        uint256 feeAmount = (totalLosingAmount * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 netLosingAmount = totalLosingAmount - feeAmount;
        
        uint256 winnings = userBet + (netLosingAmount * userBet) / totalWinningAmount;
        
        market.claimed[msg.sender] = true;
        
        // Transfer winnings to user
        require(usdcToken.transfer(msg.sender, winnings), "Transfer failed");
        
        // Transfer fee to collector (only once per market resolution)
        if (feeAmount > 0) {
            require(usdcToken.transfer(feeCollector, feeAmount), "Fee transfer failed");
        }
        
        emit WinningsClaimed(_marketId, msg.sender, winnings);
    }
    
    // Get market details
    function getMarket(uint256 _marketId) external view returns (
        string memory question,
        string memory description,
        uint256 endTime,
        uint256 resolutionTime,
        MarketState state,
        uint256 totalYesAmount,
        uint256 totalNoAmount,
        bool resolved
    ) {
        Market storage market = markets[_marketId];
        return (
            market.question,
            market.description,
            market.endTime,
            market.resolutionTime,
            market.state,
            market.totalYesAmount,
            market.totalNoAmount,
            market.resolved
        );
    }
    
    // Get user bets
    function getUserBets(uint256 _marketId, address _user) external view returns (
        uint256 yesBet,
        uint256 noBet
    ) {
        Market storage market = markets[_marketId];
        return (market.yesBets[_user], market.noBets[_user]);
    }
    
    // Calculate potential winnings
    function calculatePotentialWinnings(
        uint256 _marketId,
        Outcome _outcome,
        uint256 _betAmount
    ) external view returns (uint256) {
        Market storage market = markets[_marketId];
        
        uint256 totalWinning = _outcome == Outcome.YES ? 
            market.totalYesAmount + _betAmount : 
            market.totalNoAmount + _betAmount;
            
        uint256 totalLosing = _outcome == Outcome.YES ? 
            market.totalNoAmount : 
            market.totalYesAmount;
        
        if (totalLosing == 0) return _betAmount;
        
        uint256 feeAmount = (totalLosing * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 netLosing = totalLosing - feeAmount;
        
        return _betAmount + (netLosing * _betAmount) / totalWinning;
    }
}