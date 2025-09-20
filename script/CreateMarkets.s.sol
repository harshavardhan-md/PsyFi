// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";

contract CreateMarkets is Script {
    address constant PREDICTION_MARKET = 0x759449068AD81E04FD223fe0F1Da790F17426204;
    address constant ORACLE_RESOLVER = 0xfE1757e4E3C6050d592b54A3060ED3A47eaCA898;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        PredictionMarket market = PredictionMarket(PREDICTION_MARKET);
        
        // Market 1: Bitcoin prediction
        uint256 market1 = market.createMarket(
            "Will Bitcoin hit $100,000 by end of 2024?",
            "Market resolves based on CoinDesk price feed",
            block.timestamp + 30 days, // End time: 30 days from now
            block.timestamp + 31 days, // Resolution: 31 days from now
            ORACLE_RESOLVER
        );
        
        // Market 2: Weather prediction  
        uint256 market2 = market.createMarket(
            "Will it rain in New York tomorrow?",
            "Based on weather.gov API data",
            block.timestamp + 1 days, // End time: 1 day from now
            block.timestamp + 2 days, // Resolution: 2 days from now
            ORACLE_RESOLVER
        );
        
        // Market 3: Crypto prediction
        uint256 market3 = market.createMarket(
            "Will Ethereum be above $3000 next week?",
            "Resolves via Chainlink ETH/USD price feed",
            block.timestamp + 7 days, // End time: 7 days from now
            block.timestamp + 8 days, // Resolution: 8 days from now
            ORACLE_RESOLVER
        );
        
        vm.stopBroadcast();
        
        console.log("Markets created:");
        console.log("Market 1 ID:", market1);
        console.log("Market 2 ID:", market2);
        console.log("Market 3 ID:", market3);
    }
}