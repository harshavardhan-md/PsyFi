// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";
import "../src/OracleResolver.sol";

contract Deploy is Script {
    // Arbitrum Sepolia USDC address
    address constant USDC_ARBITRUM_SEPOLIA = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy PredictionMarket contract
        PredictionMarket predictionMarket = new PredictionMarket(
            USDC_ARBITRUM_SEPOLIA,
            deployer // fee collector
        );
        
        console.log("PredictionMarket deployed at:", address(predictionMarket));
        
        // Deploy OracleResolver contract
        OracleResolver oracleResolver = new OracleResolver(
            address(predictionMarket)
        );
        
        console.log("OracleResolver deployed at:", address(oracleResolver));
        
        // Add oracle as authorized resolver
        oracleResolver.addResolver(address(oracleResolver));
        oracleResolver.addResolver(deployer); // Add deployer as backup resolver
        
        // Create sample data feeds
        oracleResolver.createDataFeed(
            "https://api.coindesk.com/v1/bpi/currentprice.json",
            "bpi.USD.rate_float",
            50000 // $50,000 BTC threshold
        );
        
        oracleResolver.createDataFeed(
            "https://api.weather.gov/points/39.7456,-97.0892",
            "properties.forecast",
            70 // 70°F temperature threshold
        );
        
        vm.stopBroadcast();
        
        // Save deployment info
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Network: Arbitrum Sepolia");
        console.log("USDC Token:", USDC_ARBITRUM_SEPOLIA);
        console.log("PredictionMarket:", address(predictionMarket));
        console.log("OracleResolver:", address(oracleResolver));
        console.log("Deployer/Fee Collector:", deployer);
    }
}